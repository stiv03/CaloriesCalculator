// frontend/src/features/today/TodayPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DayPicker from '../../components/DayPicker';
import MacroRings from '../../components/MacroRings';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import StreakChips from '../../components/StreakChips';
import MealCard from './MealCard';
import AddMealSheet from './AddMealSheet';
import WaterCard from './WaterCard';
import {
  listMealsForDay, getDailyMacros, updateMealQuantity, deleteMeal,
} from '../../api/meals';
import { getGoal, getUser, getWeightRecords, setGoal } from '../../api/profile';
import { getStreaks } from '../../api/streaks';
import { getNote, saveNote } from '../../api/notes';
import { getUserId } from '../../auth/storage';
import { formatBackendDate } from './dateFormat';
import { computeWeeklyRate } from '../profile/goalProjection';
import { computeCalorieSuggestion, rescaleMacros, suggestionSignature } from './calorieCoach';
import styles from './TodayPage.module.css';

const ZERO_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const ZERO_GOALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/** Display order of meal sections. Items with null/unknown mealType bucket into Snack. */
const MEAL_SECTIONS = [
  { type: 'BREAKFAST',  label: 'Breakfast' },
  { type: 'LUNCH',      label: 'Lunch' },
  { type: 'DINNER',     label: 'Dinner' },
  { type: 'PREWORKOUT', label: 'Pre-workout' },
  { type: 'SNACK',      label: 'Snack' },
];

function kcalFor(meal) {
  const p = meal.product;
  if (!p) return 0;
  return (p.caloriesPer100Grams || 0) * (meal.quantity / 100);
}

export default function TodayPage() {
  const userId = getUserId();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState(ZERO_TOTALS);
  const [goals, setGoals] = useState(ZERO_GOALS);
  const [user, setUser] = useState(null);
  const [weightRecords, setWeightRecords] = useState([]);
  const [dismissedSig, setDismissedSig] = useState(() => {
    try { return localStorage.getItem(`calCoachDismiss_${getUserId()}`) || ''; } catch { return ''; }
  });
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [openSections, setOpenSections] = useState(() => new Set()); // collapsed by default
  const [addSheetType, setAddSheetType] = useState(null); // mealType string when open, null when closed
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [streaks, setStreaks] = useState(null);
  const [streaksLoading, setStreaksLoading] = useState(true);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const dateStr = formatBackendDate(date);
  const dateIso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

  const refreshStreaks = useCallback(async () => {
    try {
      const s = await getStreaks(userId);
      setStreaks(s);
    } catch (_err) {
      // Streak chips are non-critical — silently fall back to zeros.
      setStreaks({ meals: 0, weight: 0, supplements: 0 });
    } finally {
      setStreaksLoading(false);
    }
  }, [userId]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mealsRes, macrosRes] = await Promise.all([
        listMealsForDay(userId, dateStr),
        getDailyMacros(userId, dateStr),
      ]);
      setMeals(mealsRes);
      setTotals({
        calories: macrosRes.calories || 0,
        protein: macrosRes.protein || 0,
        carbs: macrosRes.carb || 0,
        fat: macrosRes.fat || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load day');
    } finally {
      setLoading(false);
    }
  }, [userId, dateStr]);

  useEffect(() => { loadDay(); }, [loadDay]);

  useEffect(() => { refreshStreaks(); }, [refreshStreaks]);

  // Land at the top of the page when entering this view (e.g. coming back from
  // the calendar where the user may have scrolled mid-page).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // Load note for the selected day
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const content = await getNote(userId, dateIso);
        if (!cancelled) { setNote(content); setNoteSaved(false); }
      } catch (_err) { if (!cancelled) setNote(''); }
    })();
    return () => { cancelled = true; };
  }, [userId, dateIso]);
  // Goals are user-wide, not per-day — load once
  const refreshGoal = useCallback(async () => {
    try {
      const g = await getGoal(userId);
      setGoals({
        calories: g.calories || 0,
        protein: g.protein || 0,
        carbs: g.carbs || 0,
        fat: g.fat || 0,
      });
    } catch (_err) {
      // Goal may not be set yet — leave zeros
    }
  }, [userId]);

  useEffect(() => { refreshGoal(); }, [refreshGoal]);

  // Load status + weight history for the calorie coach (non-critical).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, wr] = await Promise.all([getUser(userId), getWeightRecords(userId)]);
        if (!cancelled) { setUser(u); setWeightRecords(wr || []); }
      } catch (_err) { /* coach just won't show */ }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  /** meals grouped by mealType. Null/unknown types fall into SNACK. */
  const mealsByType = useMemo(() => {
    const buckets = Object.fromEntries(MEAL_SECTIONS.map(s => [s.type, []]));
    for (const m of meals) {
      const key = MEAL_SECTIONS.find(s => s.type === m.mealType) ? m.mealType : 'SNACK';
      buckets[key].push(m);
    }
    return buckets;
  }, [meals]);

  // ── Calorie coach ────────────────────────────────────────────────────────
  // Smoothed weekly rate (least-squares over recent consecutive weeks) so a
  // single water-weight spike doesn't trigger a nudge.
  const weeklyRate = useMemo(() => computeWeeklyRate(weightRecords), [weightRecords]);
  const suggestion = useMemo(
    () => computeCalorieSuggestion({
      status: user?.status,
      weeklyDiff: weeklyRate,
      currentCalories: goals.calories,
    }),
    [user, weeklyRate, goals.calories],
  );
  const suggestionSig = suggestion
    ? suggestionSignature(user?.status, weeklyRate)
    : null;
  const showCoach = suggestion && suggestionSig !== dismissedSig;

  // Persist a snooze against the current trend so the banner doesn't reappear
  // until the weight trend actually changes.
  const snoozeCoach = (sig) => {
    if (!sig) return;
    try { localStorage.setItem(`calCoachDismiss_${userId}`, sig); } catch { /* ignore */ }
    setDismissedSig(sig);
  };

  const applyCoach = async () => {
    if (!suggestion) return;
    const sig = suggestionSig;
    try {
      const newGoal = rescaleMacros(goals, suggestion.newCalories);
      await setGoal(userId, newGoal);
      await refreshGoal();
      // Acted on this trend's advice → snooze until the trend changes, so
      // applying can't loop and keep suggesting further cuts on the same trend.
      snoozeCoach(sig);
    } catch (e) {
      setError(e.message || 'Failed to update goal');
    }
  };

  const dismissCoach = () => snoozeCoach(suggestionSig);

  const handleSaveMeal = async (mealId, newQuantity) => {
    try {
      await updateMealQuantity(userId, mealId, newQuantity);
      setExpandedMealId(null);
      await loadDay();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    try {
      await deleteMeal(mealId);
      setExpandedMealId(null);
      await loadDay();
      // A delete might end today's streak (if it was the last meal of the day).
      refreshStreaks();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const sectionRefs = useRef({});

  const closeNote = () => {
    setNoteOpen(false);
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1';
      setTimeout(() => { viewport.content = 'width=device-width, initial-scale=1'; }, 300);
    }
  };

  const handleNoteSave = async () => {
    try {
      if (note.trim()) await saveNote(userId, dateIso, note);
      setNoteSaved(true);
      closeNote();
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (_err) { /* silent */ }
  };

  const toggleSection = (type) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      const wasOpen = next.has(type);
      if (wasOpen) next.delete(type); else next.add(type);
      // After paint, scroll the section to the top of the viewport when opening.
      if (!wasOpen) {
        requestAnimationFrame(() => {
          const el = sectionRefs.current[type];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.dayPickerRow}>
          <DayPicker value={date} onChange={setDate} />
          <button
            type="button"
            className={styles.diaryBtn}
            onClick={() => navigate('/calendar')}
            title="Calendar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>
        <div className={styles.headerRow}>
          <StreakChips streaks={streaks} loading={streaksLoading} />
          <button
            type="button"
            className={styles.diaryBtn}
            onClick={() => setNoteOpen(true)}
            title="Daily note"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            {note && <span className={styles.diaryDot} />}
          </button>
        </div>
      </header>

      {/* Daily note modal */}
      {noteOpen && (
        <div className={styles.noteOverlay} onClick={closeNote}>
          <div className={styles.noteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.noteModalHeader}>
              <span>Daily note</span>
              <button className={styles.noteClose} onClick={closeNote}>✕</button>
            </div>
            <textarea
              className={styles.noteArea}
              placeholder="How did you feel today? Sleep, energy, mood…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              autoFocus
            />
            <div className={styles.noteFooter}>
              {noteSaved && <span className={styles.noteSaved}>Saved ✓</span>}
              <Button onClick={handleNoteSave}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {showCoach && (
        <div className={[styles.coachBanner, styles[`coachBanner_${suggestion.direction}`]].join(' ')}>
          <div className={styles.coachBannerBody}>
            <div className={styles.coachBannerTitle}>
              {suggestion.direction === 'up' ? '↑' : '↓'} Adjust calories
            </div>
            <div className={styles.coachBannerReason}>{suggestion.reason}</div>
            <div className={styles.coachBannerNums}>
              <span className={styles.coachBannerOld}>{goals.calories} kcal</span>
              <span className={styles.coachBannerArrow}>→</span>
              <span className={styles.coachBannerNew}>{suggestion.newCalories} kcal</span>
            </div>
          </div>
          <div className={styles.coachBannerActions}>
            <Button block onClick={applyCoach}>Apply</Button>
            <Button block variant="secondary" className={styles.coachDismissBtn} onClick={dismissCoach}>Dismiss</Button>
          </div>
        </div>
      )}

      <section className={styles.macroSection}>
        <MacroRings totals={totals} goals={goals} />
      </section>

      <section className={styles.waterSection}>
        <WaterCard userId={userId} dateIso={dateIso} goalMl={user?.waterGoalMl ?? null} />
      </section>

      <section className={styles.mealsSection}>
        <h2 className={styles.h2}>Meals</h2>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {loading && meals.length === 0 && <p className={styles.muted}>Loading…</p>}

        {MEAL_SECTIONS.map((s) => {
          const items = mealsByType[s.type];
          const sectionKcal = items.reduce((acc, m) => acc + kcalFor(m), 0);
          const open = openSections.has(s.type);

          return (
            <div
              key={s.type}
              ref={(el) => { sectionRefs.current[s.type] = el; }}
              className={styles.mealSection}
            >
              <button
                type="button"
                className={[styles.sectionHead, open ? styles.sectionHeadOpen : ''].join(' ')}
                onClick={() => toggleSection(s.type)}
                aria-expanded={open}
              >
                <span className={styles.chev}>{open ? '⌃' : '⌄'}</span>
                <span className={styles.sectionLabel}>{s.label}</span>
                <span className={styles.sectionMeta}>
                  {items.length === 0
                    ? 'No items'
                    : `${items.length} item${items.length === 1 ? '' : 's'} · ${Math.round(sectionKcal)} kcal`}
                </span>
              </button>

              {open && (
                <div className={styles.sectionBody}>
                  {items.length === 0 && (
                    <p className={styles.muted}>No items yet.</p>
                  )}
                  {items.map((meal) => (
                    <MealCard
                      key={meal.mealId}
                      meal={meal}
                      expanded={expandedMealId === meal.mealId}
                      onExpand={() =>
                        setExpandedMealId((cur) => (cur === meal.mealId ? null : meal.mealId))
                      }
                      onSave={(newQ) => handleSaveMeal(meal.mealId, newQ)}
                      onDelete={() => handleDeleteMeal(meal.mealId)}
                    />
                  ))}
                  <Button
                    block
                    onClick={() => setAddSheetType(s.type)}
                  >
                    + Add to {s.label}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <AddMealSheet
        isOpen={addSheetType !== null}
        mealType={addSheetType}
        onClose={() => setAddSheetType(null)}
        onAdded={async () => {
          // Keep the section open after adding so user sees the new item.
          if (addSheetType) {
            setOpenSections((prev) => new Set(prev).add(addSheetType));
          }
          await loadDay();
          // First meal of the day bumps the streak — refresh chips.
          refreshStreaks();
        }}
        onDone={() => setAddSheetType(null)}
      />
    </div>
  );
}
