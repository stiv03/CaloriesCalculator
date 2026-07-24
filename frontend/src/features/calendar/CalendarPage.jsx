// frontend/src/features/calendar/CalendarPage.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCalendarMonth } from '../../api/calendar';
import { getNote } from '../../api/notes';
import WeekDashboard from './WeekDashboard';
import { setRestDay as apiSetRestDay } from '../../api/workouts';
import { getUserId } from '../../auth/storage';
import styles from './CalendarPage.module.css';

const TYPE_LABELS = { PUSH: 'Push', PULL: 'Pull', LEGS: 'Legs', CHEST_AND_BACK: 'Chest & Back', ARMS: 'Arms' };

const displayWorkout = (day) => {
  if (!day?.workoutType) return null;
  if (day.isRestDay) return 'Rest day';
  const type = TYPE_LABELS[day.workoutType] || day.workoutType;
  return day.workoutLabel ? `${type} ${day.workoutLabel}` : type;
};
const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SCORE_LABEL = { great: 'Excellent', ok: 'Good', poor: 'Needs work', bad: 'Poor', none: '' };

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dayScore(day) {
  if (!day) return null;
  const hasAnyData = day.calories > 0 || day.hasWorkout || day.hasNote || day.weight != null || day.supplementsTaken > 0;
  if (!hasAnyData) return null;
  let score = 0;
  if (day.calorieGoal > 0 && day.calories > 0) {
    const diff = Math.abs(day.calories - day.calorieGoal) / day.calorieGoal;
    if (diff <= 0.2) score += 25; else if (diff <= 0.4) score += 12;
  }
  if (day.supplementsTotal > 0) score += Math.round((day.supplementsTaken / day.supplementsTotal) * 25);
  else if (!day.hasSupplementRoutine) score += 25;
  // else: user has a supplement routine but tracked none this day → 0 points.
  if (day.hasWorkout) score += 25;
  if (day.weight != null) score += 15;
  if (day.hasNote) score += 10;
  return score;
}

function scoreTone(score) {
  if (score === null) return 'none';
  if (score >= 75) return 'great';
  if (score >= 50) return 'ok';
  if (score >= 25) return 'poor';
  return 'bad';
}

/**
 * A "missed" day is a past day (strictly before today) with nothing logged.
 * Today and future days are never marked missed — they simply haven't happened.
 * `dateKey` and `todayKey` are YYYY-MM-DD strings (lexicographically ordered).
 */
function isMissedDay(score, dateKey, todayKey) {
  return score === null && dateKey < todayKey;
}

// Generate array of {year, month} for range
function monthsRange(startYear, startMonth, count) {
  const result = [];
  let y = startYear, m = startMonth;
  for (let i = 0; i < count; i++) {
    result.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return result;
}

export default function CalendarPage() {
  const userId = getUserId();
  const today = new Date();
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dayData, setDayData] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const todayMonthRef = useRef(null);
  const hasScrolled = useRef(false);

  // Show last 6 months ending with current
  const months = monthsRange(
    today.getFullYear(), today.getMonth() - 5, 6
  ).filter(m => m.year >= 2020);

  const loadRange = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const data = await getCalendarMonth(userId, isoDate(from), isoDate(to));
      const map = {};
      for (const d of data) map[d.date] = d;
      setDayData(prev => ({ ...prev, ...map }));
    } catch (_) {}
    finally { setLoading(false); }
  }, [userId]);

  // Load all months at once
  useEffect(() => {
    if (view === 'month' && months.length > 0) {
      const first = months[0];
      const last = months[months.length - 1];
      const from = new Date(first.year, first.month, 1);
      const to = new Date(last.year, last.month + 1, 0);
      loadRange(from, to);
    }
  }, [view]);

  // In week view, load the visible week whenever the cursor moves (prev/next),
  // so the grid and dashboard always have that week's data.
  useEffect(() => {
    if (view !== 'week') return;
    const start = new Date(cursor);
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    loadRange(start, end);
  }, [view, cursor, loadRange]);

  // Scroll to today's month on first load
  useEffect(() => {
    if (view === 'month' && todayMonthRef.current && !hasScrolled.current) {
      setTimeout(() => {
        if (todayMonthRef.current) {
          const y = todayMonthRef.current.getBoundingClientRect().top + window.scrollY - 52;
          window.scrollTo({ top: y, behavior: 'instant' });
        }
        hasScrolled.current = true;
      }, 50);
    }
  }, [view, dayData]);

  const openDay = async (dateStr) => {
    const day = dayData[dateStr];
    let note = '';
    try { note = await getNote(userId, dateStr); } catch (_) {}
    setSelected({ day: day || { date: dateStr }, note });
  };

  const toggleRestDay = async (dateStr, rest) => {
    try {
      await apiSetRestDay(userId, dateStr, rest);
      // Re-fetch just this day's range so the cell and drawer refresh.
      const d = new Date(dateStr);
      await loadRange(d, d);
      // Update the open drawer with the fresh day data.
      setSelected(prev => prev ? { ...prev, day: { ...(prev.day || {}), date: dateStr, hasWorkout: rest, isRestDay: rest, workoutType: rest ? 'REST' : null, workoutLabel: null } } : prev);
    } catch (e) {
      // 409 = a real workout exists; the toggle shouldn't have been shown, but fail gracefully.
      console.warn('setRestDay failed', e?.response?.status);
    }
  };

  const renderMonthGrid = ({ year, month }) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    return (
      <div
        key={`${year}-${month}`}
        className={styles.monthBlock}
        ref={isCurrentMonth ? todayMonthRef : null}
      >
        <div className={styles.monthTitle}>{MONTH_NAMES[month]} {year}</div>
        <div className={styles.grid}>
          {DAY_NAMES.map((n, i) => <div key={i} className={styles.gridHead}>{n}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} className={styles.cellEmpty} />;
            const key = isoDate(d);
            const data = dayData[key];
            const score = dayScore(data);
            const tone = scoreTone(score);
            const isToday = key === isoDate(today);
            const missed = isMissedDay(score, key, isoDate(today));
            return (
              <button key={key} className={[styles.cell, styles[`cell_${tone}`], missed ? styles.cellMissed : '', isToday ? styles.cellToday : ''].join(' ')} onClick={() => openDay(key)}>
                <div className={styles.cellTop}>
                  <span className={styles.cellDate}>{d.getDate()}</span>
                  {score !== null && <span className={[styles.cellScore, styles[`cellScore_${tone}`]].join(' ')}>{score}%</span>}
                </div>
                <div className={styles.cellDots}>
                  {data?.calories > 0 && <span className={styles.dot + ' ' + styles.dotCal} title="Calories" />}
                  {data?.hasWorkout && !data?.isRestDay && <span className={styles.dot + ' ' + styles.dotWorkout} title="Workout" />}
                  {data?.isRestDay && <span className={styles.dot + ' ' + styles.dotRest} title="Rest day" />}
                  {data?.supplementsTaken > 0 && <span className={styles.dot + ' ' + styles.dotSupp} title="Supplements" />}
                  {data?.weight != null && <span className={styles.dot + ' ' + styles.dotWeight} title="Weight" />}
                  {data?.hasNote && <span className={styles.dot + ' ' + styles.dotNote} title="Note" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Week grid (unchanged)
  const renderWeek = () => {
    const d = new Date(cursor);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    const days = Array.from({length: 7}, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
    return (
      <div>
        <div className={styles.weekDayHeader}>
          {DAY_NAMES_FULL.map(n => <div key={n} className={styles.weekDayName}>{n}</div>)}
        </div>
        <div className={styles.weekGrid}>
          {days.map(day => {
            const key = isoDate(day);
            const data = dayData[key];
            const score = dayScore(data);
            const tone = scoreTone(score);
            const isToday = key === isoDate(today);
            const missed = isMissedDay(score, key, isoDate(today));
            return (
              <button key={key} className={[styles.weekCell, styles[`cell_${tone}`], missed ? styles.cellMissed : '', isToday ? styles.cellToday : ''].join(' ')} onClick={() => openDay(key)}>
                <span className={[styles.weekDate, isToday ? styles.weekDateToday : ''].join(' ')}>{day.getDate()}</span>
                {score !== null && <div className={[styles.weekScore, styles[`cellScore_${tone}`]].join(' ')}>{score}%</div>}
                <div className={styles.weekDots}>
                  {data?.calories > 0 && <span className={styles.dot + ' ' + styles.dotCal} />}
                  {data?.hasWorkout && !data?.isRestDay && <span className={styles.dot + ' ' + styles.dotWorkout} />}
                  {data?.isRestDay && <span className={styles.dot + ' ' + styles.dotRest} title="Rest day" />}
                  {data?.supplementsTaken > 0 && <span className={styles.dot + ' ' + styles.dotSupp} />}
                  {data?.weight != null && <span className={styles.dot + ' ' + styles.dotWeight} />}
                  {data?.hasNote && <span className={styles.dot + ' ' + styles.dotNote} />}
                </div>
                {data?.hasWorkout && <div className={styles.weekWorkout}>{displayWorkout(data)}</div>}
              </button>
            );
          })}
        </div>
        <WeekDashboard days={days.map((day) => dayData[isoDate(day)])} />
      </div>
    );
  };

  const prev = () => { const d = new Date(cursor); d.setDate(d.getDate() - 7); setCursor(d); };
  const next = () => { const d = new Date(cursor); d.setDate(d.getDate() + 7); setCursor(d); };

  const weekHeaderLabel = () => {
    const d = new Date(cursor);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    const end = new Date(d); end.setDate(d.getDate() + 6);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.pageTitle}>Calendar</span>
          <div className={styles.viewToggle}>
            <button className={[styles.viewBtn, view === 'month' ? styles.viewBtnActive : ''].join(' ')} onClick={() => { setView('month'); hasScrolled.current = false; }}>Month</button>
            <button className={[styles.viewBtn, view === 'week' ? styles.viewBtnActive : ''].join(' ')} onClick={() => {
              // Default to current week
              const now = new Date();
              const dow = (now.getDay() + 6) % 7;
              now.setDate(now.getDate() - dow);
              setCursor(new Date(now));
              setView('week');
              const to = new Date(now); to.setDate(now.getDate() + 6);
              loadRange(now, to);
            }}>Week</button>
          </div>
        </div>
        {view === 'week' && (
          <div className={styles.weekNav}>
            <button className={styles.navBtn} onClick={prev}>‹</button>
            <span className={styles.weekNavLabel}>{weekHeaderLabel()}</span>
            <button className={styles.navBtn} onClick={next}>›</button>
          </div>
        )}
        <div className={styles.legend}>
          <span><span className={styles.dot + ' ' + styles.dotCal} /> Cal</span>
          <span><span className={styles.dot + ' ' + styles.dotWorkout} /> Workout</span>
          <span><span className={styles.dot + ' ' + styles.dotSupp} /> Supps</span>
          <span><span className={styles.dot + ' ' + styles.dotWeight} /> Weight</span>
          <span><span className={styles.dot + ' ' + styles.dotNote} /> Note</span>
        </div>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      <div className={styles.calendarLayout}>
        <div className={styles.calendarMain}>
          {view === 'month'
            ? <div className={styles.monthScroll}>{months.map(renderMonthGrid)}</div>
            : renderWeek()
          }
        </div>

        {selected && (
          <div className={styles.sheetOverlay} onClick={() => setSelected(null)}>
            <div className={styles.sheet} onClick={e => e.stopPropagation()}>
              <div className={styles.sheetHeader}>
                <span className={styles.sheetDate}>{selected.day.date}</span>
                {(() => {
                  const score = dayScore(selected.day);
                  const tone = scoreTone(score);
                  return score !== null ? <span className={[styles.scoreBadge, styles[`score_${tone}`]].join(' ')}>{score}% · {SCORE_LABEL[tone]}</span> : null;
                })()}
                <button className={styles.sheetClose} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className={styles.sheetBody}>
                {selected.day.calories > 0 && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Calories</div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryVal}>{selected.day.calories} kcal</span>
                      {selected.day.calorieGoal > 0 && <span className={styles.summaryMuted}>/ {selected.day.calorieGoal} goal</span>}
                    </div>
                    {selected.day.protein > 0 && (
                      <div className={styles.macroRow}>
                        <span className={styles.macroP}>P {selected.day.protein?.toFixed(0)}g</span>
                        <span className={styles.macroC}>C {selected.day.carbs?.toFixed(0)}g</span>
                        <span className={styles.macroF}>F {selected.day.fat?.toFixed(0)}g</span>
                      </div>
                    )}
                  </div>
                )}
                {selected.day.weight != null && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Weight</div>
                    <div className={styles.summaryVal}>{selected.day.weight} kg</div>
                  </div>
                )}
                {selected.day.hasWorkout && !selected.day.isRestDay && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Workout</div>
                    <div className={styles.summaryVal}>{displayWorkout(selected.day)}</div>
                  </div>
                )}
                {selected.day.isRestDay && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Workout</div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryVal}>Rest day</span>
                      {selected.day.date === isoDate(today) && (
                        <button
                          type="button"
                          className={styles.restLink}
                          onClick={() => toggleRestDay(selected.day.date, false)}
                        >
                          Unmark
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {!selected.day.hasWorkout && selected.day.date === isoDate(today) && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Workout</div>
                    <button
                      type="button"
                      className={styles.restMarkBtn}
                      onClick={() => toggleRestDay(selected.day.date, true)}
                    >
                      💤 Mark as rest day
                    </button>
                  </div>
                )}
                {selected.day.supplementsTotal > 0 && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Supplements</div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryVal}>{selected.day.supplementsTaken}/{selected.day.supplementsTotal}</span>
                      {selected.day.supplementsTaken === selected.day.supplementsTotal && <span style={{color: 'var(--color-success)', fontWeight: 700}}>✓</span>}
                    </div>
                  </div>
                )}
                {selected.note && (
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>Note</div>
                    <div className={styles.summaryNote}>{selected.note}</div>
                  </div>
                )}
                {!selected.day.calories && !selected.day.hasWorkout && !selected.day.weight && !selected.note && !selected.day.supplementsTotal && (
                  <p className={styles.muted}>No other data logged for this day.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
