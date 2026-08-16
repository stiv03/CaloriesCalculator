import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Legend,
} from 'chart.js';
import { computeWeeklySummary } from './weeklySummary';
import styles from './WeekDashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

/** Read a CSS custom property off :root, with a fallback. */
function readCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * 7-day macro trend: one line each for protein / carbs / fat, using the app's
 * macro color tokens. `days` is the 7 CalendarDayDTO-shaped objects for the
 * visible week (some may be undefined for unlogged days). Unlogged days are
 * left as gaps (null) so the line doesn't dip to zero on a missed day.
 */
function MacroChart({ days }) {
  const protein = readCssVar('--color-protein', '#22d3ee');
  const carbs = readCssVar('--color-carbs', '#f59e0b');
  const fat = readCssVar('--color-fat', '#a78bfa');
  const grid = readCssVar('--color-border', '#243049');
  const ink = readCssVar('--color-text-muted', '#94a3b8');

  // A day is plotted only if food was actually logged that day. The backend
  // returns a row for EVERY day in range — including unlogged and future days —
  // with calories/macros = 0, so we must gap on `calories > 0` rather than on
  // the object's presence. Gaps (null) + spanGaps make the line stop at the
  // last logged day instead of dropping to zero across unlogged/future days.
  const macroOf = (d, key) => (d && (d.calories || 0) > 0 && d[key] != null ? Math.round(d[key]) : null);
  const list = days || [];
  const hasAny = list.some((d) => d && (d.calories || 0) > 0);

  const lineFor = (label, key, color) => ({
    label,
    data: list.map((d) => macroOf(d, key)),
    borderColor: color,
    backgroundColor: color + '33',
    borderWidth: 2,
    pointRadius: 3,
    tension: 0.3,
    spanGaps: true,
  });

  const data = {
    labels: DAY_LABELS,
    datasets: [
      lineFor('Protein', 'protein', protein),
      lineFor('Carbs', 'carbs', carbs),
      lineFor('Fat', 'fat', fat),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, color: ink, font: { size: 11 } } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y} g` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: ink, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: grid }, ticks: { color: ink, font: { size: 11 } }, title: { display: true, text: 'grams', color: ink } },
    },
  };

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>Macros this week</div>
      {hasAny
        ? <div className={styles.chartBox}><Line data={data} options={options} /></div>
        : <p className={styles.chartEmpty}>No macros logged this week yet.</p>}
    </div>
  );
}

/** 7-day steps bar chart. `stepsByDay` is a 7-length array (null where no data). */
function StepsChart({ stepsByDay }) {
  const accent = readCssVar('--color-accent', '#3b82f6');
  const grid = readCssVar('--color-border', '#243049');
  const ink = readCssVar('--color-text-muted', '#94a3b8');
  const list = stepsByDay || [];
  const hasAny = list.some((v) => v != null && v > 0);

  const data = {
    labels: DAY_LABELS,
    datasets: [{
      label: 'Steps',
      data: list.map((v) => (v != null ? v : 0)),
      backgroundColor: accent,
      borderRadius: 999,
      borderSkipped: false,
      maxBarThickness: 24,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.parsed.y.toLocaleString()} steps` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: ink, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: grid }, ticks: { color: ink, font: { size: 11 } } },
    },
  };

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>Steps this week</div>
      {hasAny
        ? <div className={styles.chartBox}><Bar data={data} options={options} /></div>
        : <p className={styles.chartEmpty}>No step data this week.</p>}
    </div>
  );
}

/**
 * Stat tile. `color` picks a categorical accent (see CSS); `size` is 'wide',
 * 'sq' (square), or 'tall'. The accent shows as a left bar + colored value, so
 * the text itself stays in ink tokens and remains readable in light/dark.
 */
function Tile({ label, value, sub, color, size = 'sq', tone }) {
  return (
    <div className={[styles.tile, styles[`size_${size}`], styles[`c_${color}`]].join(' ')}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={[styles.tileValue, tone ? styles[`tone_${tone}`] : ''].join(' ')}>{value}</div>
      {sub && <div className={styles.tileSub}>{sub}</div>}
    </div>
  );
}

/** Minutes → "7h 12m" / "45m". Null-safe: returns em dash. */
function fmtSleep(mins) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Weekly progress summary rendered below the week grid. `days` is the 7
 * CalendarDayDTO-shaped objects for the visible week (some may be undefined).
 */
export default function WeekDashboard({ days }) {
  const s = computeWeeklySummary(days);

  const calValue = s.avgCalories != null ? s.avgCalories.toLocaleString() : '—';
  const calSub = s.avgCalories != null
    ? `${s.calorieGoal ? `goal ${s.calorieGoal.toLocaleString()} · ` : ''}${s.daysLogged}/7 days logged`
    : 'not logged';

  let weightValue = '—';
  let weightTone = null;
  if (s.weightChange != null) {
    const sign = s.weightChange > 0 ? '+' : '';
    weightValue = `${sign}${s.weightChange} kg`;
    weightTone = s.weightChange < 0 ? 'good' : s.weightChange > 0 ? 'warn' : null;
  }
  const weightSub = s.weighIns >= 2 ? `${s.weighIns} weigh-ins` : 'need 2+ weigh-ins';

  return (
    <div className={styles.dashboard}>
      <div className={styles.title}>This week</div>
      <div className={styles.bento}>
        {/* Hero: calories — full-width rectangle */}
        <Tile
          size="wide" color="blue"
          label="Avg calories / day" value={calValue} sub={calSub}
        />
        {/* Two squares */}
        <Tile
          size="sq" color="aqua"
          label="Weight" value={weightValue} sub={weightSub} tone={weightTone}
        />
        <Tile
          size="sq" color="orange"
          label="Training"
          value={`${s.workouts}`}
          sub={`workout${s.workouts === 1 ? '' : 's'}${s.restDays ? ` · ${s.restDays} rest` : ''}`}
        />
        {/* Two squares */}
        <Tile
          size="sq" color="magenta"
          label="Supplements"
          value={s.suppTakenPct != null ? `${s.suppTakenPct}%` : '—'}
          sub={s.suppTakenPct != null ? 'taken' : 'no routine'}
        />
        <Tile
          size="sq" color="teal"
          label="Avg steps / day"
          value={s.avgSteps != null ? s.avgSteps.toLocaleString() : '—'}
          sub={s.avgSteps != null ? 'from Google Health' : 'not synced'}
        />
        {/* Sleep: three equal boxes on one row — total / deep / REM. */}
        <div className={styles.sleepRow}>
          <Tile
            size="third" color="indigo"
            label="Avg sleep / night"
            value={fmtSleep(s.avgSleepMinutes)}
            sub={s.sleepNights > 0 ? `${s.sleepNights} night${s.sleepNights === 1 ? '' : 's'}` : 'not synced'}
          />
          <Tile
            size="third" color="indigo"
            label="Avg deep"
            value={fmtSleep(s.avgDeepMinutes)}
            sub={s.sleepNights > 0 ? 'per night' : 'not synced'}
          />
          <Tile
            size="third" color="indigo"
            label="Avg REM"
            value={fmtSleep(s.avgRemMinutes)}
            sub={s.sleepNights > 0 ? 'per night' : 'not synced'}
          />
        </div>
      </div>
      <MacroChart days={days} />
      <StepsChart stepsByDay={s.stepsByDay} />
      {s.insight && <p className={styles.insight}>{s.insight}</p>}
    </div>
  );
}
