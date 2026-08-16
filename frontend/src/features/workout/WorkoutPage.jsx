// frontend/src/features/workout/WorkoutPage.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import Tabs from '../../components/Tabs';
import Button from '../../components/Button';
import Field from '../../components/Field';
import ErrorBanner from '../../components/ErrorBanner';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  addExerciseToTemplate, updateTemplateExercise, removeTemplateExercise,
  logWorkout, getWorkoutHistory, deleteWorkout, getVolumeProgress,
  setRestDay as apiSetRestDay,
} from '../../api/workouts';
import { getCalendarMonth } from '../../api/calendar';
import { getUserId } from '../../auth/storage';
import { getActivityForDate } from '../../api/health';
import { nextUpTemplateId } from './nextUp';
import styles from './WorkoutPage.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

/** Format sets compactly:
 *  Same weight: [35×8, 35×7, 35×6]     → "35×8,7,6×3"
 *  Diff weight: [30×8, 35×7, 40×6]     → "30,35,40×8,7,6×3"
 *  Mixed groups: [35×8, 35×7, 40×6]    → "35×8,7×2 · 40×6×1"
 */
function formatSets(sets) {
  if (!sets.length) return '';
  const allSameWeight = sets.every(s => s.weight === sets[0].weight);
  if (allSameWeight) {
    return `${sets[0].weight}×${sets.map(s => s.reps).join(';')}×${sets.length}`;
  }
  return `${sets.map(s => s.weight).join(';')}×${sets.map(s => s.reps).join(';')}×${sets.length}`;
}
function sessionVolume(workout, exerciseName) {
  const ex = workout?.exercises.find(e => e.exerciseName === exerciseName);
  if (!ex || !ex.sets.length) return null;
  return ex.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * Rank key for a session's performance on one exercise, as a comparable tuple.
 * Priority (each level breaks ties of the level above):
 *   1. Heaviest weight lifted on any set — heavier wins even with fewer reps.
 *   2. Most reps achieved at that heaviest weight (best single top set).
 *   3. Total reps done at that heaviest weight (rewards more sets at the top).
 *   4. Total volume (Σ weight×reps) as a final tiebreak.
 * Returns null for an empty session. Compare with `rankKeyCmp`.
 */
function sessionRankKey(sets) {
  if (!sets || !sets.length) return null;
  const valid = sets.filter(s => s.weight > 0 && s.reps > 0);
  if (!valid.length) return null;
  const maxWeight = Math.max(...valid.map(s => s.weight));
  const topSets = valid.filter(s => s.weight === maxWeight);
  const topSetReps = Math.max(...topSets.map(s => s.reps));       // best single set at top weight
  const totalRepsAtTop = topSets.reduce((sum, s) => sum + s.reps, 0);
  const volume = valid.reduce((sum, s) => sum + s.weight * s.reps, 0);
  return [maxWeight, topSetReps, totalRepsAtTop, volume];
}

/** Compare two rank keys (from `sessionRankKey`). >0 if a beats b, 0 if equal. */
function rankKeyCmp(a, b) {
  if (!a) return b ? -1 : 0;
  if (!b) return 1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * For each exercise, find which session holds its all-time best set (its PR),
 * ranked by weight first then reps (see `sessionRankKey`). Returns a map:
 * exerciseName -> sessionId of the PR session. Ties resolve to the earliest
 * session (the one that first reached that best).
 */
function computePrSessions(sessions, exercises) {
  const prByExercise = {};
  for (const ex of exercises) {
    let bestKey = null;
    let bestId = null;
    for (const w of sessions) {
      const found = w.exercises.find(e => e.exerciseName === ex.exerciseName);
      const key = sessionRankKey(found?.sets);
      if (key && rankKeyCmp(key, bestKey) > 0) { // strictly better → first to reach it wins
        bestKey = key;
        bestId = w.id;
      }
    }
    if (bestId != null && bestKey) prByExercise[ex.exerciseName] = bestId;
  }
  return prByExercise;
}

/**
 * Parse a target like "3×8", "3x8-10", "4×8–12", "2X20-15" into
 * { sets, repMin, repMax, repLabel }. Handles x/X/× separators, -/– range
 * dashes, and ranges written either ascending (8-10) or descending (20-15).
 * `repLabel` is the reps portion as written (e.g. "8-6", "8"). Returns null if
 * no rep info can be parsed.
 */
function parseTarget(targetSetsReps) {
  if (!targetSetsReps) return null;
  const norm = targetSetsReps.replace(/[×xX]/g, 'x').replace(/[–—]/g, '-').trim();
  // sets x reps, where reps may be a single number or a-b range
  const m = norm.match(/^(\d+)\s*x\s*(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) {
    // no "sets x" prefix — try a bare rep or range
    const r = norm.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (!r) return null;
    const a = parseInt(r[1], 10);
    const b = r[2] != null ? parseInt(r[2], 10) : a;
    return { sets: null, repMin: Math.min(a, b), repMax: Math.max(a, b), repLabel: r[2] != null ? `${a}-${b}` : `${a}` };
  }
  const sets = parseInt(m[1], 10);
  const a = parseInt(m[2], 10);
  const b = m[3] != null ? parseInt(m[3], 10) : a;
  return { sets, repMin: Math.min(a, b), repMax: Math.max(a, b), repLabel: m[3] != null ? `${a}-${b}` : `${a}` };
}

/**
 * Progression suggestion for the next session of one exercise, comparing the
 * latest result against the target set×rep range.
 *
 * Rule (double progression):
 *  - If EVERY working set (at the top weight) reached the top of the rep range
 *    → you hit the target → suggest adding weight (+2.5 kg).
 *  - Otherwise → keep the same weight and add reps, aiming for the top of the
 *    range.
 * Returns { kind: 'weight'|'reps', weight, repLabel, shortSets } or null.
 * `shortSets` is the 1-based set numbers (at the top weight) that fell below
 * the top of the rep range — used to tell the user exactly where to add reps.
 */
const WEIGHT_STEP = 2.5;
function nextSuggestion(lastSets, target) {
  if (!lastSets || !lastSets.length) return null;
  const weights = lastSets.map(s => s.weight).filter(w => w > 0);
  if (!weights.length) return null;
  const topWeight = Math.max(...weights);
  const workingSets = lastSets.filter(s => s.weight === topWeight && s.reps > 0);
  if (!workingSets.length) return null;

  // No usable rep range → can't judge "hit target", just prompt to add reps.
  if (!target || target.repMax == null) {
    return { kind: 'reps', weight: topWeight, repLabel: null, shortSets: [] };
  }

  const hitTop = workingSets.every(s => s.reps >= target.repMax);
  if (hitTop) {
    return { kind: 'weight', weight: topWeight + WEIGHT_STEP, repLabel: target.repLabel, shortSets: [] };
  }
  // Which sets (1-based, by their position among the full set list) fell short.
  const shortSets = lastSets
    .map((s, i) => ({ n: i + 1, s }))
    .filter(({ s }) => s.weight === topWeight && s.reps > 0 && s.reps < target.repMax)
    .map(({ n }) => n);
  return { kind: 'reps', weight: topWeight, repLabel: target.repLabel, shortSets };
}

/** Compact "last time" summary for an exercise's sets, e.g. "80 kg × 8,8,7". */
function lastTimeSummary(sets) {
  if (!sets || !sets.length) return null;
  const allSame = sets.every(s => s.weight === sets[0].weight);
  if (allSame) return `${sets[0].weight} kg × ${sets.map(s => s.reps).join(',')}`;
  return sets.map(s => `${s.weight}×${s.reps}`).join(', ');
}

/** Human list of set numbers: [3] → "set 3", [2,3] → "sets 2 & 3", [1,2,3] → "sets 1, 2 & 3". */
function formatSetList(nums) {
  if (!nums || !nums.length) return '';
  if (nums.length === 1) return `set ${nums[0]}`;
  const head = nums.slice(0, -1).join(', ');
  return `sets ${head} & ${nums[nums.length - 1]}`;
}

/** Scrollable previous-sessions table.
 *  sessions: array of workout logs (oldest → newest)
 *  exercises: [{exerciseName, targetSetsReps}]
 *  highlightId: id of the session to highlight (green bg)
 *  colorCells: if true, color cells green/red vs previous session
 */
function SessionsTable({ sessions, exercises, highlightId, colorCells = false, autoScroll = false, styles }) {
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []); // only on mount

  const [activity, setActivity] = React.useState(null); // { date, loading, data, error }
  const userId = getUserId();

  const openActivity = async (date) => {
    setActivity({ date, loading: true, data: null, error: null });
    try {
      const data = await getActivityForDate(userId, date);
      setActivity({ date, loading: false, data, error: null });
    } catch (e) {
      setActivity({ date, loading: false, data: null, error: e.message || 'Failed to load' });
    }
  };

  // All-time best (estimated 1RM) session per exercise — its PR cell gets a star.
  const prSessions = React.useMemo(
    () => computePrSessions(sessions, exercises),
    [sessions, exercises],
  );

  if (!sessions.length) return null;
  return (
    <div className={styles.prevTable}>
      <div
        className={styles.prevScroll}
        ref={scrollRef}
      >
        <table className={styles.prevTableEl}>
          <thead>
            <tr>
              <th className={styles.prevExCol}>Exercise</th>
              {sessions.map(w => (
                <th key={w.id} className={[styles.prevSessionCol, w.id === highlightId ? styles.prevNewest : ''].join(' ')}>
                  <button type="button" className={styles.dateBtn} onClick={() => openActivity(w.date)}>
                    {w.date}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exercises.map(ex => (
              <tr key={ex.exerciseName}>
                <td className={styles.prevExCol}>
                  <div>{ex.exerciseName}</div>
                  {ex.targetSetsReps && <div className={styles.prevExTarget}>{ex.targetSetsReps}</div>}
                </td>
                {sessions.map((w, idx) => {
                  const found = w.exercises.find(e => e.exerciseName === ex.exerciseName);
                  let cellClass = [styles.prevSessionCol, w.id === highlightId ? styles.prevNewest : ''].join(' ');
                  if (colorCells && idx > 0) {
                    const curSets = found?.sets || [];
                    const prevFound = sessions[idx - 1].exercises.find(e => e.exerciseName === ex.exerciseName);
                    const prevSets = prevFound?.sets || [];
                    if (curSets.length && prevSets.length) {
                      const maxW = (s) => Math.max(...s.map(x => x.weight));
                      const totalR = (s) => s.reduce((a, x) => a + x.reps, 0);
                      const curMaxW = maxW(curSets), prevMaxW = maxW(prevSets);
                      const curR = totalR(curSets), prevR = totalR(prevSets);
                      if (curMaxW > prevMaxW) cellClass += ' ' + styles.cellUp;
                      else if (curMaxW < prevMaxW) cellClass += ' ' + styles.cellDown;
                      else if (curR > prevR) cellClass += ' ' + styles.cellUp;
                      else if (curR < prevR) cellClass += ' ' + styles.cellDown;
                    }
                  }
                  const isPr = found?.sets?.length && prSessions[ex.exerciseName] === w.id;
                  return (
                    <td key={w.id} className={cellClass}>
                      {found ? formatSets(found.sets) : '—'}
                      {isPr && <span className={styles.prStar} title="Personal record (heaviest weight, then most reps)">★</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {activity && (
        <div className={styles.activityPanel}>
          <button type="button" className={styles.activityClose} onClick={() => setActivity(null)}>×</button>
          <div className={styles.activityTitle}>Google Health · {activity.date}</div>
          {activity.loading && <div className={styles.activityMuted}>Loading…</div>}
          {activity.error && <div className={styles.activityMuted}>Couldn't load Google data.</div>}
          {activity.data && !activity.data.found && (
            <div className={styles.activityMuted}>
              {activity.data.reason === 'not_connected'
                ? 'Connect Google Health in Profile to see session data.'
                : 'No Google workout found for this date.'}
              {activity.data.reason && activity.data.reason !== 'not_connected' && (
                <div className={styles.activityMuted} style={{ fontSize: '0.8em', opacity: 0.7 }}>
                  ({activity.data.reason})
                </div>
              )}
            </div>
          )}
          {activity.data && activity.data.found && (
            <div className={styles.activityBody}>
              <div className={styles.activityRow}>
                <strong>{activity.data.exerciseType}</strong>
                {activity.data.durationMin != null && <span> · {activity.data.durationMin} min</span>}
              </div>
              {activity.data.avgHr != null && (
                <div className={styles.activityRow}>
                  HR avg {activity.data.avgHr} · min {activity.data.minHr} · max {activity.data.maxHr}
                </div>
              )}
              {activity.data.zones && activity.data.zones.length > 0 && (
                <div className={styles.activityRow}>
                  {activity.data.zones.map((z) => `${z.name} ${z.minutes}m`).join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'plan',     label: 'My Plan' },
  { id: 'history',  label: 'History' },
  { id: 'progress', label: 'Progress' },
];

const EXERCISE_TYPES = ['PUSH', 'PULL', 'LEGS', 'CHEST_AND_BACK', 'ARMS'];
const TYPE_LABELS = { PUSH: 'Push', PULL: 'Pull', LEGS: 'Legs', CHEST_AND_BACK: 'Chest & Back', ARMS: 'Arms' };
const displayName = (t) => t.label ? `${TYPE_LABELS[t.exerciseType] || t.exerciseType} ${t.label}` : (TYPE_LABELS[t.exerciseType] || t.exerciseType);

export default function WorkoutPage() {
  const userId = getUserId();
  const [tab, setTab] = useState('plan');
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [volume, setVolume] = useState([]);
  const [error, setError] = useState('');

  // Plan state
  const [expandedDay, setExpandedDay] = useState(null);
  const [editingDay, setEditingDay] = useState(null); // { id, dayName, exerciseType, sortOrder }
  const [newDayForm, setNewDayForm] = useState({ exerciseType: 'PUSH', label: '' });
  const [showNewDay, setShowNewDay] = useState(false);
  const [newExForm, setNewExForm] = useState({}); // { [templateId]: { exerciseName, targetSetsReps } }
  const [editingEx, setEditingEx] = useState(null); // { templateId, exerciseId, exerciseName, targetSetsReps }

  // Log state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [logDate, setLogDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [sets, setSets] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [openExercise, setOpenExercise] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  /**
   * Per-exercise lookup of the most recent PAST session's sets for the template
   * being logged, keyed by exercise name. "Past" = strictly before today's log
   * date, so re-opening today's draft doesn't compare against itself. Used to
   * show "Last time" + the double-progression "Try" suggestion on each card.
   */
  const lastByExercise = React.useMemo(() => {
    const map = {};
    if (!selectedTemplate) return map;
    // Most recent SAVED session on or before the log date. history holds only
    // saved sessions (never the in-progress draft), so `<= logDate` safely picks
    // up a session you already logged today without comparing against the draft.
    const matches = history.filter(w =>
      !w.isRestDay && (
        w.templateId === selectedTemplate.id ||
        (w.templateId == null && w.exerciseType === selectedTemplate.exerciseType &&
         (w.label || '') === (selectedTemplate.label || ''))
      ) && w.date <= logDate
    ); // history is newest-first
    for (const ex of selectedTemplate.exercises) {
      for (const w of matches) {
        const found = w.exercises.find(e => e.exerciseName === ex.exerciseName);
        if (found?.sets?.length) { map[ex.exerciseName] = { sets: found.sets, date: w.date }; break; }
      }
    }
    return map;
  }, [history, selectedTemplate, logDate]);

  // Which plan day is "up next" — the day following the most recently logged
  // one in the rotation (wraps after the last day). See features/workout/nextUp.
  const upNextId = React.useMemo(
    () => nextUpTemplateId(templates, history),
    [templates, history],
  );

  const [restTimer, setRestTimer] = useState(null); // { exerciseName, remaining, total }
  const [restDefaults, setRestDefaults] = useState({}); // { exerciseName: seconds }
  const restRef = useRef(null);
  const [savedTemplate, setSavedTemplate] = useState(null);

  // Rest-day banner state — true if today is flagged as rest in the calendar.
  const [todayIsRest, setTodayIsRest] = useState(false);
  const [restDismissed, setRestDismissed] = useState(false);

  // Progress state
  const [progressDay, setProgressDay] = useState(''); // templateId as string
  const [progressTemplateId, setProgressTemplateId] = useState(null);
  const [chartExercise, setChartExercise] = useState(null); // { name, templateId }

  const audioCtxRef = useRef(null);

  const unlockAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  };

  const playDing = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') { ctx.resume(); return; }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (_) {}
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const restEndRef = useRef(null);

  const startRest = (exerciseName) => {
    unlockAudio();
    if (restRef.current) clearInterval(restRef.current);
    const secs = restDefaults[exerciseName] || 180;
    restEndRef.current = Date.now() + secs * 1000;
    setRestTimer({ exerciseName, remaining: secs, total: secs });
    restRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(restRef.current);
        setRestTimer(null);
        playDing();
      } else {
        setRestTimer(prev => prev ? { ...prev, remaining } : null);
      }
    }, 500);
  };

  const stopRest = () => {
    if (restRef.current) clearInterval(restRef.current);
    restEndRef.current = null;
    setRestTimer(null);
  };

  // Correct timer when app comes back to foreground
  React.useEffect(() => {
    const onVisible = () => {
      if (!restEndRef.current) return;
      const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000));
      if (remaining <= 0) { stopRest(); playDing(); }
      else setRestTimer(prev => prev ? { ...prev, remaining } : null);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Clean up timer on unmount
  React.useEffect(() => () => { if (restRef.current) clearInterval(restRef.current); }, []);

  const loadTemplates = useCallback(async () => {
    try { setTemplates(await getTemplates(userId)); }
    catch (e) { setError(e.message); }
  }, [userId]);

  const loadHistory = useCallback(async () => {
    try { setHistory(await getWorkoutHistory(userId)); }
    catch (e) { setError(e.message); }
  }, [userId]);

  // Local-date YYYY-MM-DD (not UTC) — must match what the calendar uses,
  // otherwise rest-day rows for "today" won't be found at day boundaries.
  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const checkTodayRest = useCallback(async () => {
    try {
      const t = todayIso();
      const data = await getCalendarMonth(userId, t, t);
      const row = data?.[0];
      const isRest = Boolean(row?.isRestDay ?? row?.restDay);
      setTodayIsRest(prev => {
        if (isRest && !prev) setRestDismissed(false); // new rest flag → re-show banner
        return isRest;
      });
    } catch (_) { /* non-fatal — banner just won't show */ }
  }, [userId]);

  const clearTodayRest = async () => {
    try {
      await apiSetRestDay(userId, todayIso(), false);
      setTodayIsRest(false);
      setRestDismissed(false);
    } catch (e) {
      setError('Could not clear rest day.');
    }
  };

  const loadVolume = useCallback((exerciseType, templateId) => {
    const matchSession = (w) => {
      if (templateId) {
        const tmpl = templates.find(t => t.id === templateId);
        return w.templateId === templateId ||
          (w.templateId == null && w.exerciseType === exerciseType &&
           (w.label || '') === (tmpl?.label || ''));
      }
      return w.exerciseType === exerciseType;
    };

    // history is newest-first — get the two most recent matching sessions
    const matching = history.filter(matchSession);
    const latest = matching[0];
    const previous = matching[1];

    if (!latest) { setVolume([]); return; }

    const allExercises = [...new Set([
      ...latest.exercises.map(e => e.exerciseName),
      ...(previous?.exercises.map(e => e.exerciseName) || []),
    ])];

    const vol = allExercises.map(name => {
      const latestSets = latest.exercises.find(e => e.exerciseName === name)?.sets || [];
      const prevSets = previous?.exercises.find(e => e.exerciseName === name)?.sets || [];

      const maxW = (sets) => sets.length ? Math.max(...sets.map(s => s.weight)) : 0;
      const totalR = (sets) => sets.reduce((s, x) => s + x.reps, 0);

      const latestMaxW = maxW(latestSets);
      const prevMaxW = maxW(prevSets);
      const latestTotalR = totalR(latestSets);
      const prevTotalR = totalR(prevSets);

      const wDiff = latestMaxW - prevMaxW;
      const rDiff = latestTotalR - prevTotalR;

      // tone: green if weight up OR (same weight and reps up); red if weight down OR reps down
      const tone = (wDiff > 0 || (wDiff === 0 && rDiff > 0)) ? 'up'
                 : (wDiff < 0 || rDiff < 0) ? 'down'
                 : 'neutral';

      // Build pills: show weight pill if weight changed, reps pill if reps changed
      const weightPill = wDiff !== 0 ? { dir: wDiff > 0 ? 'up' : 'down', label: `${wDiff > 0 ? '▲' : '▼'} ${Math.abs(wDiff)} kg` } : null;
      const repsPill   = rDiff !== 0 ? { dir: rDiff > 0 ? 'up' : 'down', label: `${rDiff > 0 ? '▲' : '▼'} ${Math.abs(rDiff)} reps` } : null;
      const pills = [weightPill, repsPill].filter(Boolean);
      const diffLabel = pills.length ? pills : [{ dir: 'neutral', label: '–' }];

      return {
        exerciseName: name,
        tone, diffLabel,
        latestSets, prevSets,
        latestDate: latest.date,
        previousDate: previous?.date || null,
      };
    });
    setVolume(vol);
  }, [history, templates]);

  useEffect(() => { loadTemplates(); loadHistory(); checkTodayRest(); }, [loadTemplates, loadHistory, checkTodayRest]);

  // Re-check rest-day and history when the user comes back to the tab/window.
  // This catches the case where rest was toggled (or a workout was deleted) elsewhere.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadHistory();
        checkTodayRest();
      }
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loadHistory, checkTodayRest]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'progress' && progressDay && progressTemplateId) loadVolume(null, progressTemplateId);
  }, [tab, loadHistory, loadVolume, progressDay]);

  // ── Plan tab ────────────────────────────────────────────────────────────

  const handleCreateDay = async () => {
    try {
      await createTemplate(userId, { exerciseType: newDayForm.exerciseType, label: newDayForm.label || null, sortOrder: templates.length });
      setNewDayForm({ exerciseType: 'PUSH', label: '' });
      setShowNewDay(false);
      await loadTemplates();
    } catch (e) { setError(e.message); }
  };

  const handleUpdateDay = async () => {
    if (!editingDay) return;
    try {
      await updateTemplate(userId, editingDay.id, {
        exerciseType: editingDay.exerciseType,
        label: editingDay.label || null,
        sortOrder: editingDay.sortOrder,
      });
      setEditingDay(null);
      await loadTemplates();
    } catch (e) { setError(e.message); }
  };

  const handleDeleteDay = async (templateId) => {
    if (!window.confirm('Delete this workout day and all its exercises?')) return;
    try { await deleteTemplate(userId, templateId); await loadTemplates(); }
    catch (e) { setError(e.message); }
  };

  const handleAddExercise = async (templateId) => {
    const form = newExForm[templateId] || {};
    if (!form.exerciseName?.trim()) return;
    try {
      await addExerciseToTemplate(userId, templateId, {
        exerciseName: form.exerciseName.trim(),
        targetSetsReps: form.targetSetsReps?.trim() || '',
        position: -1,
      });
      setNewExForm(prev => ({ ...prev, [templateId]: { exerciseName: '', targetSetsReps: '' } }));
      await loadTemplates();
    } catch (e) { setError(e.message); }
  };

  const handleUpdateExercise = async () => {
    if (!editingEx) return;
    try {
      await updateTemplateExercise(userId, editingEx.templateId, editingEx.exerciseId, {
        exerciseName: editingEx.exerciseName,
        targetSetsReps: editingEx.targetSetsReps,
        position: -1,
      });
      setEditingEx(null);
      await loadTemplates();
    } catch (e) { setError(e.message); }
  };

  const handleRemoveExercise = async (templateId, exerciseId) => {
    try { await removeTemplateExercise(userId, templateId, exerciseId); await loadTemplates(); }
    catch (e) { setError(e.message); }
  };

  // ── Log tab ──────────────────────────────────────────────────────────────

  const draftKey = (templateId) => `workout_draft_${userId}_${templateId}`;

  const initSets = (template) => {
    // Always reload history when starting a log so the table is fresh
    loadHistory();
    // Always default the log date to today — the draft preserves sets/reps,
    // not a stale date from a previous session.
    setLogDate(todayIso());
    const saved = localStorage.getItem(draftKey(template.id));
    if (saved) {
      try {
        const { sets: savedSets } = JSON.parse(saved);
        setSets(savedSets);
        setSelectedTemplate(template);
        setOpenExercise(template.exercises[0]?.exerciseName || null);
        return;
      } catch (_) {}
    }
    const init = {};
    template.exercises.forEach(ex => {
      const match = ex.targetSetsReps?.match(/^(\d+)/);
      const count = match ? parseInt(match[1]) : 3;
      init[ex.exerciseName] = Array.from({ length: count }, () => ({ weight: '', reps: '' }));
    });
    setSets(init);
    setSelectedTemplate(template);
    setOpenExercise(template.exercises[0]?.exerciseName || null);
  };

  const saveDraft = (newSets, date, template) => {
    const t = template || selectedTemplate;
    if (!t) return;
    localStorage.setItem(draftKey(t.id), JSON.stringify({ sets: newSets, date }));
  };

  const clearDraft = (template) => {
    const t = template || selectedTemplate;
    if (t) localStorage.removeItem(draftKey(t.id));
  };

  const updateSet = (name, idx, field, val) =>
    setSets(prev => {
      const current = prev[name] || [];
      const next = { ...prev, [name]: current.map((s, i) => i === idx ? { ...s, [field]: val } : s) };
      saveDraft(next, logDate);
      return next;
    });

  const handleSetBlur = (name) => {
    setSets(prev => {
      const exSets = prev[name] || [];
      if (exSets.length > 0 && exSets.every(s => s.weight && s.reps)) {
        const exercises = selectedTemplate?.exercises || [];
        const curIdx = exercises.findIndex(e => e.exerciseName === name);
        const nextEx = exercises[curIdx + 1];
        if (nextEx) setOpenExercise(nextEx.exerciseName);
      }
      return prev;
    });
    // Start rest timer after filling a set
    startRest(name);
  };

  const addSet = (name) =>
    setSets(prev => {
      const current = prev[name] || [];
      const next = { ...prev, [name]: [...current, { weight: '', reps: '' }] };
      saveDraft(next, logDate);
      return next;
    });

  const removeSet = (name, idx) =>
    setSets(prev => {
      const current = prev[name] || [];
      const next = { ...prev, [name]: current.filter((_, i) => i !== idx) };
      saveDraft(next, logDate);
      return next;
    });

  const handleSave = async () => {
    if (!selectedTemplate) return;

    // Fresh-check rest-day before anything else: the calendar may have been
    // updated in another tab since the page mounted. This guarantees the
    // rest-day error wins over the duplicate-check.
    if (logDate === todayIso()) {
      try {
        const t = todayIso();
        const data = await getCalendarMonth(userId, t, t);
        const row = data?.[0];
        const isRest = Boolean(row?.isRestDay ?? row?.restDay);
        if (isRest) {
          setTodayIsRest(true);
          setRestDismissed(false); // re-show the banner so they can act on it
          showError('Today is marked as a rest day. Clear it from the rest-day banner first.');
          return;
        }
        // No longer rest — keep local state in sync.
        if (todayIsRest) setTodayIsRest(false);
      } catch (_) { /* if the check fails, fall through and let the server enforce */ }
    }

    // Check for duplicate on frontend before hitting backend
    const alreadyLogged = history.some(w =>
      w.date === logDate &&
      (w.templateId === selectedTemplate.id ||
        (w.templateId == null && w.exerciseType === selectedTemplate.exerciseType &&
         (w.label || '') === (selectedTemplate.label || '')))
    );
    if (alreadyLogged) {
      showError('You already logged this workout today.');
      return;
    }

    setSaving(true); setError('');
    try {
      const exercises = selectedTemplate.exercises
        .filter(ex => sets[ex.exerciseName]?.some(s => s.weight && s.reps))
        .map((ex, pos) => ({
          exerciseName: ex.exerciseName,
          position: pos,
          notes: null,
          sets: (sets[ex.exerciseName] || [])
            .filter(s => s.weight && s.reps)
            .map((s, si) => ({ setIndex: si, weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 })),
        }));

      await logWorkout(userId, {
        date: logDate,
        templateId: selectedTemplate.id,
        exerciseType: selectedTemplate.exerciseType,
        label: selectedTemplate.label || null,
        notes: null,
        exercises,
      });
      await loadHistory();
      // A successful log clears any rest flag server-side; sync local state.
      if (logDate === todayIso()) {
        setTodayIsRest(false);
        setRestDismissed(false);
      }
      clearDraft();
      const done = selectedTemplate;
      setSelectedTemplate(null);
      setSets({});
      setPreviewing(false);
      setSavedTemplate(done);
    } catch (e) {
      const msg = e.message || 'Failed to save';
      if (e.status === 409 || msg.toLowerCase().includes('already logged')) {
        showError('You already logged this workout today.');
      } else {
        showError(msg);
      }
    }
    finally { setSaving(false); }
  };

  const showError = (msg) => {
    setError(msg);
    // Scroll to the top so the error banner (and rest-day banner if any) is visible
    // even when the user clicked Save from the bottom of a long form.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setError(''), 5000);
  };

  const handleExportHistory = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Workout History');

    const byTemplate = {};
    for (const w of history) {
      let key;
      if (w.templateId != null) {
        key = `tid_${w.templateId}`;
      } else {
        const matched = templates.find(t =>
          t.exerciseType === w.exerciseType && (t.label || '') === (w.label || '')
        );
        key = matched ? `tid_${matched.id}` : `${w.exerciseType}_${w.label || ''}`;
      }
      if (!byTemplate[key]) byTemplate[key] = [];
      byTemplate[key].push(w);
    }

    const sortedEntries = Object.entries(byTemplate).sort(([a], [b]) => {
      const tidA = a.startsWith('tid_') ? parseInt(a.slice(4)) : null;
      const tidB = b.startsWith('tid_') ? parseInt(b.slice(4)) : null;
      const ta = templates.find(t => (tidA ? t.id === tidA : t.exerciseType === a.split('_')[0]))?.sortOrder ?? 999;
      const tb = templates.find(t => (tidB ? t.id === tidB : t.exerciseType === b.split('_')[0]))?.sortOrder ?? 999;
      return ta - tb;
    });

    const styleCell = (cell, opts) => {
      if (opts.bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bgColor } };
      if (opts.fontColor || opts.bold || opts.sz) {
        cell.font = { color: { argb: opts.fontColor || 'FF94A3B8' }, bold: !!opts.bold, size: opts.sz || 10 };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF243049' } },
        bottom: { style: 'thin', color: { argb: 'FF243049' } },
        left: { style: 'thin', color: { argb: 'FF243049' } },
        right: { style: 'thin', color: { argb: 'FF243049' } },
      };
      if (opts.align) cell.alignment = { horizontal: opts.align };
    };

    for (const [key, sessions] of sortedEntries) {
      const ordered = [...sessions].reverse();
      const tid = key.startsWith('tid_') ? parseInt(key.slice(4)) : null;
      const tmpl = tid
        ? templates.find(t => t.id === tid)
        : templates.find(t => t.exerciseType === sessions[0]?.exerciseType && !t.label);
      const dayLabel = tmpl ? displayName(tmpl) : (sessions[0]?.label || TYPE_LABELS[sessions[0]?.exerciseType] || key);
      const exercises = tmpl
        ? tmpl.exercises
        : ordered[0].exercises.map(e => ({ exerciseName: e.exerciseName, targetSetsReps: '' }));

      // Day header row
      const dayRow = ws.addRow([dayLabel, 'Volume', ...ordered.map(w => w.date)]);
      dayRow.eachCell((cell, col) => {
        if (col === 1) {
          styleCell(cell, { bgColor: 'FF1A3A2A', fontColor: 'FF4ADE80', bold: true, sz: 12 });
        } else {
          styleCell(cell, { bgColor: 'FF162032', fontColor: 'FF94A3B8', bold: true, sz: 10, align: 'center' });
        }
      });

      // Exercise rows
      for (const ex of exercises) {
        const cells = ordered.map(w => {
          const found = w.exercises.find(e => e.exerciseName === ex.exerciseName);
          return found ? formatSets(found.sets) : '—';
        });
        const exRow = ws.addRow([ex.exerciseName, ex.targetSetsReps || '', ...cells]);

        exRow.getCell(1).value = ex.exerciseName;
        styleCell(exRow.getCell(1), { bgColor: 'FF131C2E', fontColor: 'FFE2E8F0', bold: true, sz: 11 });
        styleCell(exRow.getCell(2), { bgColor: 'FF0F2318', fontColor: 'FF4ADE80', sz: 10, align: 'center' });

        for (let si = 0; si < ordered.length; si++) {
          const w = ordered[si];
          const prev = ordered[si - 1];
          const found = w.exercises.find(e => e.exerciseName === ex.exerciseName);
          const prevFound = prev?.exercises.find(e => e.exerciseName === ex.exerciseName);

          let bgColor = 'FF131C2E', fontColor = 'FF94A3B8';
          if (found && prevFound) {
            const vol = found.sets.reduce((s, x) => s + x.weight * x.reps, 0);
            const prevVol = prevFound.sets.reduce((s, x) => s + x.weight * x.reps, 0);
            if (vol > prevVol) { bgColor = 'FF0F2318'; fontColor = 'FF4ADE80'; }
            else if (vol < prevVol) { bgColor = 'FF2A0F0F'; fontColor = 'FFF87171'; }
          }
          styleCell(exRow.getCell(3 + si), { bgColor, fontColor, sz: 10, align: 'center' });
        }
      }

      ws.addRow([]); // spacer
    }

    // Column widths
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 10;
    for (let i = 3; i <= 25; i++) ws.getColumn(i).width = 18;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'workout_history.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm('Delete this workout log?')) return;
    try { await deleteWorkout(userId, workoutId); await loadHistory(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>Workout</h1></header>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {successMsg && <p className={styles.success}>{successMsg}</p>}

      {todayIsRest && !restDismissed && (
        <div className={styles.restBanner}>
          <div className={styles.restBannerHeader}>
            <span className={styles.restBannerIcon}>💤</span>
            <div className={styles.restBannerText}>
              <div className={styles.restBannerTitle}>Today is marked as a rest day</div>
              <div className={styles.restBannerSub}>You can&rsquo;t log a workout while today is marked as a rest day. Use &ldquo;Log a workout anyway&rdquo; to clear it.</div>
            </div>
          </div>
          <div className={styles.restBannerActions}>
            <Button variant="secondary" onClick={() => setRestDismissed(true)}>Hide for now</Button>
            <Button onClick={clearTodayRest}>Log a workout anyway</Button>
          </div>
        </div>
      )}

      <div className={styles.tabsBar}>
        <Tabs tabs={TABS} activeId={tab} onChange={setTab} />
      </div>

      {/* ── MY PLAN TAB ─────────────────────────────────────────────────── */}
      {tab === 'plan' && !selectedTemplate && !savedTemplate && (
        <div className={styles.planSection}>
          {templates.length === 0 && !showNewDay && (
            <p className={styles.muted}>No workout days yet. Add your first day below.</p>
          )}

          {templates.map(t => (
            <div key={t.id} className={[styles.dayCard, t.id === upNextId ? styles.dayCardNext : ''].join(' ')}>
              {editingDay?.id === t.id ? (
                <div className={styles.editDayForm}>
                  <Field as="select" label="Type" value={editingDay.exerciseType}
                    onChange={e => setEditingDay({ ...editingDay, exerciseType: e.target.value })}>
                    {EXERCISE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </Field>
                  <div className={styles.editDayActions}>
                    <Button onClick={handleUpdateDay}>Save</Button>
                    <Button variant="secondary" onClick={() => setEditingDay(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className={[styles.dayCardHeader, expandedDay === t.id ? styles.dayCardHeaderOpen : ''].join(' ')}>
                  <button className={styles.dayExpandBtn} onClick={(e) => {
                    e.currentTarget.blur();
                    setExpandedDay(expandedDay === t.id ? null : t.id);
                  }}>
                    <span className={styles.dayTypeBig}>{displayName(t)}</span>
                    {t.id === upNextId && <span className={styles.nextPill}>Next</span>}
                    <span className={styles.dayExCount}>{t.exercises.length} exercises</span>
                    <span className={styles.chev}>{expandedDay === t.id ? '⌃' : '⌄'}</span>
                  </button>
                  <button className={styles.startBtn} onClick={() => initSets(t)} title="Start workout">▶</button>
                </div>
              )}

              {expandedDay === t.id && (
                <div className={styles.exerciseList}>
                  {t.exercises.map(ex => (
                    <div key={ex.id} className={styles.exRow}>
                      {editingEx?.exerciseId === ex.id ? (
                        <div className={styles.editExForm}>
                          <Field value={editingEx.exerciseName}
                            onChange={e => setEditingEx({ ...editingEx, exerciseName: e.target.value })} />
                          <Field value={editingEx.targetSetsReps} placeholder="e.g. 3×8"
                            onChange={e => setEditingEx({ ...editingEx, targetSetsReps: e.target.value })} />
                          <Button onClick={handleUpdateExercise}>Save</Button>
                          <Button variant="secondary" onClick={() => setEditingEx(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span className={styles.exName}>{ex.exerciseName}</span>
                          {ex.targetSetsReps && <span className={styles.exTarget}>{ex.targetSetsReps}</span>}
                          <button className={styles.iconBtn} onClick={() => setEditingEx({
                            templateId: t.id, exerciseId: ex.id,
                            exerciseName: ex.exerciseName, targetSetsReps: ex.targetSetsReps || '',
                          })}>✎</button>
                          <button className={styles.iconBtn + ' ' + styles.dangerBtn}
                            onClick={() => handleRemoveExercise(t.id, ex.id)}>✕</button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add exercise form */}
                  <div className={styles.addExForm}>
                    <Field
                      placeholder="Exercise name"
                      value={newExForm[t.id]?.exerciseName || ''}
                      onChange={e => setNewExForm(prev => ({ ...prev, [t.id]: { ...(prev[t.id] || {}), exerciseName: e.target.value } }))}
                    />
                    <Field
                      placeholder="Sets×Reps (e.g. 3×8)"
                      value={newExForm[t.id]?.targetSetsReps || ''}
                      onChange={e => setNewExForm(prev => ({ ...prev, [t.id]: { ...(prev[t.id] || {}), targetSetsReps: e.target.value } }))}
                    />
                    <Button onClick={() => handleAddExercise(t.id)}
                      disabled={!newExForm[t.id]?.exerciseName?.trim()}>
                      Add
                    </Button>
                  </div>
                  <button
                    className={styles.deleteDayBtn}
                    onClick={() => handleDeleteDay(t.id)}
                  >
                    Delete this day
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* New day form */}
          {showNewDay ? (
            <div className={styles.newDayForm}>
              <Field as="select" label="Type" value={newDayForm.exerciseType}
                onChange={e => setNewDayForm({ ...newDayForm, exerciseType: e.target.value })}>
                {EXERCISE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </Field>
              <Field label="Label (optional, e.g. Legs 2)" value={newDayForm.label}
                onChange={e => setNewDayForm({ ...newDayForm, label: e.target.value })}
                placeholder="Leave empty to use type name" />
              <div className={styles.editDayActions}>
                <Button onClick={handleCreateDay}>Create day</Button>
                <Button variant="secondary" onClick={() => setShowNewDay(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button className={styles.addDayBtn} onClick={() => setShowNewDay(true)}>+ Add workout day</button>
          )}
        </div>
      )}

      {/* ── LOG FORM (inline in plan tab when a day is started) ─────────── */}
      {tab === 'plan' && savedTemplate && (
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Workout Saved!</h2>
          <p className={styles.successSub}>{displayName(savedTemplate)}</p>
          <Button block onClick={() => {
            setProgressDay(String(savedTemplate.id));
            setProgressTemplateId(savedTemplate.id);
            loadVolume(savedTemplate.exerciseType, savedTemplate.id);
            setSavedTemplate(null);
            setTab('progress');
          }}>
            See progress
          </Button>
          <button className={styles.successBack} onClick={() => setSavedTemplate(null)}>
            Back to plan
          </button>
        </div>
      )}

      {tab === 'plan' && selectedTemplate && !previewing && (
        <div className={styles.logForm} onTouchStart={unlockAudio} onClick={unlockAudio}>
          {/* Global rest timer bar removed - shown inline per exercise */}

          <div className={styles.logHeader}>
            <div className={styles.logHeaderTop}>
              <button className={styles.backBtn} onClick={() => { setSelectedTemplate(null); setSets({}); setPreviewing(false); }}>‹</button>
              <div className={styles.logTitle}>New {displayName(selectedTemplate)} Workout</div>
            </div>
            <div className={styles.logHeaderBottom}>
              <input type="date" className={styles.dateInput} value={logDate}
                onChange={e => { setLogDate(e.target.value); saveDraft(sets, e.target.value); }} />
              {localStorage.getItem(draftKey(selectedTemplate.id)) && (
                <button className={styles.discardBtn} onClick={() => { clearDraft(); initSets(selectedTemplate); }}>
                  Discard draft
                </button>
              )}
            </div>
          </div>

          {/* Previous sessions table */}
          {(() => {
            const prev = history
              .filter(w => w.templateId === selectedTemplate.id ||
                (w.templateId == null && w.exerciseType === selectedTemplate.exerciseType && (w.label || '') === (selectedTemplate.label || '')))
              .slice(0, 8)
              .reverse();
            const newestId = prev[prev.length - 1]?.id;
            return (
              <SessionsTable
                sessions={prev}
                exercises={selectedTemplate.exercises}
                highlightId={newestId}
                autoScroll={true}
                styles={styles}
              />
            );
          })()}

          {(() => {
            const total = selectedTemplate.exercises.length;
            const done = selectedTemplate.exercises.filter(ex => {
              const s = sets[ex.exerciseName] || [];
              return s.length > 0 && s.every(x => x.weight && x.reps);
            }).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div className={styles.progressBarWrap}>
                <div className={styles.progressBarTrack}>
                  <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.progressBarLabel}>{done}/{total} exercises</span>
              </div>
            );
          })()}

          {selectedTemplate.exercises.map(ex => {
            const isOpen = openExercise === ex.exerciseName;
            const exSets = sets[ex.exerciseName] || [];
            const filled = exSets.filter(s => s.weight && s.reps).length;
            const last = lastByExercise[ex.exerciseName];
            const target = parseTarget(ex.targetSetsReps);
            const suggestion = last ? nextSuggestion(last.sets, target) : null;
            const lastLabel = last ? lastTimeSummary(last.sets) : null;
            return (
              <React.Fragment key={ex.exerciseName}>
                {restTimer?.exerciseName === ex.exerciseName && (() => {
                  const pct = restTimer.remaining / restTimer.total;
                  const tone = pct > 0.5 ? 'green' : pct > 0.25 ? 'orange' : 'red';
                  return (
                  <div className={[styles.restBar, styles[`restBar_${tone}`]].join(' ')}>
                    <div className={styles.restBarTrack}>
                      <div className={[styles.restBarFill, styles[`restBarFill_${tone}`]].join(' ')} style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className={[styles.restBarLabel, styles[`restBarLabel_${tone}`]].join(' ')}>Rest · {fmtTime(restTimer.remaining)}</span>
                    <button className={styles.restBarStop} onClick={stopRest}>✕</button>
                  </div>
                  );
                })()}
              <div className={[styles.exerciseCard, isOpen ? styles.exerciseCardOpen : ''].join(' ')}>
                <button
                  type="button"
                  className={styles.exerciseToggle}
                  onClick={() => setOpenExercise(isOpen ? null : ex.exerciseName)}
                >
                  <span className={styles.exerciseName}>{ex.exerciseName}</span>
                  <div className={styles.exerciseToggleRight}>
                    {restTimer?.exerciseName === ex.exerciseName && (
                      <span className={styles.restTimerBadge} onClick={e => { e.stopPropagation(); stopRest(); }}>
                        ⏱ {fmtTime(restTimer.remaining)}
                      </span>
                    )}
                    {ex.targetSetsReps && <span className={styles.exerciseTarget}>{ex.targetSetsReps}</span>}
                    {filled > 0 && <span className={styles.exerciseFilled}>{filled}/{exSets.length}</span>}
                    <span className={styles.chev}>{isOpen ? '⌃' : '⌄'}</span>
                  </div>
                </button>
                {isOpen && (
                  <>
                    {(lastLabel || suggestion) && (
                      <div className={styles.coachCard}>
                        {lastLabel && (
                          <div className={styles.coachLastRow}>
                            <span className={styles.coachLabel}>Last time</span>
                            <span className={styles.coachLast}>{lastLabel}</span>
                            {last?.date && <span className={styles.coachDatePill}>{last.date}</span>}
                          </div>
                        )}
                        {suggestion && (
                          <div className={styles.coachTryRow}>
                            <span className={styles.coachTryIcon}>
                              {suggestion.kind === 'weight' ? '▲' : '↻'}
                            </span>
                            <div className={styles.coachTryMain}>
                              <div className={styles.coachTryValue}>
                                {suggestion.weight}<span className={styles.coachTryUnit}>kg</span>
                                {suggestion.repLabel && (
                                  <span className={styles.coachTryReps}>× {suggestion.repLabel}</span>
                                )}
                              </div>
                              <div className={styles.coachTryHint}>
                                {suggestion.kind === 'weight'
                                  ? 'Increase the weight'
                                  : suggestion.shortSets?.length
                                    ? <>Aim for more reps on <span className={styles.coachSets}>{formatSetList(suggestion.shortSets)}</span></>
                                    : 'Aim for more reps'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={styles.setHeader}>
                      <span>Set</span><span>Weight (kg)</span><span>Reps</span><span></span>
                    </div>
                    {exSets.map((s, idx) => (
                      <div key={idx} className={styles.setRow}>
                        <span className={styles.setNum}>{idx + 1}</span>
                        <input type="number" min="0" step="0.5" className={styles.setInput}
                          value={s.weight} placeholder="kg"
                          onChange={e => updateSet(ex.exerciseName, idx, 'weight', e.target.value)} />
                        <input type="number" min="0" className={styles.setInput}
                          value={s.reps} placeholder="reps"
                          onChange={e => updateSet(ex.exerciseName, idx, 'reps', e.target.value)}
                          onBlur={() => handleSetBlur(ex.exerciseName)} />
                        <button className={styles.removeSetBtn} onClick={() => removeSet(ex.exerciseName, idx)}>✕</button>
                      </div>
                    ))}
                    <button className={styles.addSetBtn} onClick={() => addSet(ex.exerciseName)}>+ Add set</button>
                    <div className={styles.restConfig}>
                      <span className={styles.restConfigLabel}>Rest:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={styles.restConfigInput}
                        defaultValue={restDefaults[ex.exerciseName] !== undefined ? restDefaults[ex.exerciseName] / 60 : 3}
                        onBlur={e => {
                          const v = parseFloat(e.target.value.replace(',', '.'));
                          const secs = isNaN(v) || v < 0.5 ? 180 : Math.round(v * 60);
                          setRestDefaults(prev => ({ ...prev, [ex.exerciseName]: secs }));
                          e.target.value = secs / 60;
                        }}
                      />
                      <span className={styles.restConfigLabel}>min</span>
                    </div>
                  </>
                )}
              </div>
              </React.Fragment>
            );
          })}

          <Button block disabled={saving} onClick={() => setPreviewing(true)}>
            Save workout
          </Button>
        </div>
      )}

      {/* ── PREVIEW / CONFIRM (before actually saving) ──────────────────── */}
      {tab === 'plan' && selectedTemplate && previewing && (
        <div className={styles.previewScreen}>
          <div className={styles.logHeader}>
            <div className={styles.logHeaderTop}>
              <button className={styles.backBtn} onClick={() => setPreviewing(false)}>‹</button>
              <div className={styles.logTitle}>Review {displayName(selectedTemplate)} Workout</div>
            </div>
            <div className={styles.previewDate}>{logDate}</div>
          </div>

          <p className={styles.previewHint}>Check everything looks right before saving.</p>

          <div className={styles.previewList}>
            {selectedTemplate.exercises.map(ex => {
              const exSets = (sets[ex.exerciseName] || []).filter(s => s.weight && s.reps);
              return (
                <div key={ex.exerciseName} className={styles.previewCard}>
                  <div className={styles.previewExName}>{ex.exerciseName}</div>
                  {exSets.length === 0 ? (
                    <div className={styles.previewEmpty}>No sets — won&rsquo;t be saved</div>
                  ) : (
                    <div className={styles.previewSets}>
                      {exSets.map((s, i) => (
                        <span key={i} className={styles.previewSet}>{s.weight}×{s.reps}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button block disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Confirm & save'}
          </Button>
          <button className={styles.previewBack} onClick={() => setPreviewing(false)}>
            Back to editing
          </button>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
        <div className={styles.historyList}>
          {history.length === 0 && <p className={styles.muted}>No workouts logged yet.</p>}
          {(() => {
            // Group by templateId — for old logs without templateId, match by exerciseType+label
            const byTemplate = {};
            for (const w of history) {
              let key;
              if (w.templateId != null) {
                key = `tid_${w.templateId}`;
              } else {
                // Try to match to a template by exerciseType + label
                const matched = templates.find(t =>
                  t.exerciseType === w.exerciseType && (t.label || '') === (w.label || '')
                );
                key = matched ? `tid_${matched.id}` : `${w.exerciseType}_${w.label || ''}`;
              }
              if (!byTemplate[key]) byTemplate[key] = [];
              byTemplate[key].push(w);
            }
            return Object.entries(byTemplate)
              .sort(([a], [b]) => {
                const tidA = a.startsWith('tid_') ? parseInt(a.slice(4)) : null;
                const tidB = b.startsWith('tid_') ? parseInt(b.slice(4)) : null;
                const ta = templates.find(t => (tidA ? t.id === tidA : t.exerciseType === a.split('_')[0]))?.sortOrder ?? 999;
                const tb = templates.find(t => (tidB ? t.id === tidB : t.exerciseType === b.split('_')[0]))?.sortOrder ?? 999;
                return ta - tb;
              })
              .map(([key, sessions]) => {
                const ordered = [...sessions].reverse();
                const tid = key.startsWith('tid_') ? parseInt(key.slice(4)) : null;
                const tmpl = tid
                  ? templates.find(t => t.id === tid)
                  : templates.find(t => t.exerciseType === sessions[0]?.exerciseType && !t.label);
                const dayLabel = tmpl ? displayName(tmpl) : (
                  sessions[0]?.label
                    ? `${TYPE_LABELS[sessions[0].exerciseType] || sessions[0].exerciseType} ${sessions[0].label}`
                    : (TYPE_LABELS[sessions[0]?.exerciseType] || sessions[0]?.exerciseType)
                );
                const exercises = tmpl
                  ? tmpl.exercises
                  : ordered[0].exercises.map(e => ({ exerciseName: e.exerciseName, targetSetsReps: '' }));
                return (
                  <div key={key} className={styles.historyCard}>
                    <div className={styles.historyCardHeader}>
                      <div className={styles.historyDay}>{dayLabel}</div>
                    </div>
                    <SessionsTable
                      sessions={ordered}
                      exercises={exercises}
                      highlightId={null}
                      colorCells={true}
                      autoScroll={true}
                      styles={styles}
                    />
                  </div>
                );
              });
          })()}
        </div>
        {history.length > 0 && (
          <button className={styles.exportBtn} onClick={() => handleExportHistory()}>
            ↓ Export as Excel
          </button>
        )}
        </>
      )}

      {/* ── PROGRESS TAB ─────────────────────────────────────────────────── */}
      {tab === 'progress' && (
        <div className={styles.progressSection}>
          <select className={styles.daySelectInput} value={progressDay}
            onChange={e => {
              const tid = parseInt(e.target.value);
              const tmpl = templates.find(t => t.id === tid);
              setProgressDay(e.target.value);
              setProgressTemplateId(tid);
              if (tmpl) loadVolume(tmpl.exerciseType, tid);
            }}>
            <option value="">Select a day to compare</option>
            {templates.map(t => <option key={t.id} value={t.id}>{displayName(t)}</option>)}
          </select>

          {progressDay && volume.length === 0 && (
            <p className={styles.muted}>No data yet. Log at least two sessions of this day to see progress.</p>
          )}

          {volume.map(v => (
              <div key={v.exerciseName} className={styles.volumeCard}>
                <div className={styles.volumeHeader}>
                  <span className={styles.volumeName}>{v.exerciseName}</span>
                  <div className={styles.volumeHeaderRight}>
                    <div className={styles.volumePills}>
                      {v.diffLabel.map((p, i) => (
                        <span key={i} className={[styles.volumeDiff, styles[`volumeDiff_${p.dir}`]].join(' ')}>
                          {p.label}
                        </span>
                      ))}
                    </div>
                    <button
                      className={styles.chartBtn}
                      onClick={() => setChartExercise({ name: v.exerciseName, templateId: progressTemplateId })}
                      title="Show full chart"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v18h18"/>
                        <path d="M7 16l4-4 4 4 5-6"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={styles.volumeGrid}>
                  <div>
                    <div className={styles.volumeLabel}>Latest</div>
                    {v.latestDate && <div className={styles.volumeDate}>{v.latestDate}</div>}
                    <div className={styles.volumeSets}>
                      {v.latestSets.map((s, i) => <span key={i}>{s.weight}×{s.reps}</span>)}
                    </div>
                  </div>
                  <div>
                    <div className={styles.volumeLabel}>Previous</div>
                    {v.previousDate && <div className={styles.volumeDate}>{v.previousDate}</div>}
                    <div className={styles.volumeSets}>
                      {v.prevSets.map((s, i) => <span key={i}>{s.weight}×{s.reps}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Exercise chart modal */}
      {chartExercise && (() => {
        const matchSession = (w) => {
          if (chartExercise.templateId) {
            const tmpl = templates.find(t => t.id === chartExercise.templateId);
            return w.templateId === chartExercise.templateId ||
              (w.templateId == null && w.exerciseType === tmpl?.exerciseType &&
               (w.label || '') === (tmpl?.label || ''));
          }
          return true;
        };
        const sessions = history.filter(matchSession).reverse();
        const labels = sessions.map(w => w.date);
        const maxWeights = sessions.map(w => {
          const ex = w.exercises.find(e => e.exerciseName === chartExercise.name);
          if (!ex || !ex.sets.length) return null;
          return ex.sets.reduce((s, x) => s + x.weight, 0) / ex.sets.length;
        });
        const totalReps = sessions.map(w => {
          const ex = w.exercises.find(e => e.exerciseName === chartExercise.name);
          return ex ? ex.sets.reduce((s, x) => s + x.reps, 0) : null;
        });
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#4ade80';
        const protein = getComputedStyle(document.documentElement).getPropertyValue('--color-protein').trim() || '#22d3ee';
        const data = {
          labels,
          datasets: [
            {
              label: 'Avg weight (kg)',
              data: maxWeights,
              borderColor: accent,
              backgroundColor: accent + '33',
              borderWidth: 2,
              pointRadius: 3,
              yAxisID: 'y',
              spanGaps: true,
            },
            {
              label: 'Total reps',
              data: totalReps,
              borderColor: protein,
              backgroundColor: protein + '33',
              borderWidth: 2,
              pointRadius: 3,
              yAxisID: 'y2',
              spanGaps: true,
            },
          ],
        };
        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: {
            y: { position: 'left', title: { display: true, text: 'avg kg' } },
            y2: { position: 'right', title: { display: true, text: 'reps' }, grid: { drawOnChartArea: false } },
          },
        };
        return (
          <div className={styles.chartOverlay} onClick={() => setChartExercise(null)}>
            <div className={styles.chartModal} onClick={e => e.stopPropagation()}>
              <div className={styles.chartModalHeader}>
                <span>{chartExercise.name}</span>
                <button className={styles.noteClose} onClick={() => setChartExercise(null)}>✕</button>
              </div>
              {sessions.length < 2
                ? <p className={styles.muted}>Need at least 2 sessions to show a chart.</p>
                : <div style={{ height: 260 }}><Line data={data} options={options} /></div>
              }
            </div>
          </div>
        );
      })()}
    </div>
  );
}
