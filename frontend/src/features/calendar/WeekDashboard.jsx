import React from 'react';
import { computeWeeklySummary } from './weeklySummary';
import styles from './WeekDashboard.module.css';

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
          size="sq" color="violet"
          label="Avg protein"
          value={s.avgProtein != null ? `${s.avgProtein}g` : '—'}
          sub={s.avgProtein != null ? 'per logged day' : 'not logged'}
        />
        <Tile
          size="sq" color="magenta"
          label="Supplements"
          value={s.suppTakenPct != null ? `${s.suppTakenPct}%` : '—'}
          sub={s.suppTakenPct != null ? 'taken' : 'no routine'}
        />
      </div>
      {s.insight && <p className={styles.insight}>{s.insight}</p>}
    </div>
  );
}
