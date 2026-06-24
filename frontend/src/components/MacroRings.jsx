// frontend/src/components/MacroRings.jsx
import React from 'react';
import styles from './MacroRings.module.css';
import { ringDashOffset, statusForPercent } from './macroMath';

const COLOR_VARS = {
  calories: '--color-calories',
  protein: '--color-protein',
  carbs: '--color-carbs',
  fat: '--color-fat',
};

function statusColor(metricKey, status) {
  if (status === 'over') return 'var(--color-danger)';
  if (status === 'near') return 'var(--color-success)';
  return `var(${COLOR_VARS[metricKey]})`;
}

/** What goes in the center of a macro ring: remaining if under, "0g" at goal, "+Xg over" past it. */
function renderRemaining(value, goal, unit) {
  if (!goal || goal <= 0) return `0${unit}`;
  const diff = Math.round(goal - value);
  if (diff < 0) return `+${Math.abs(diff)}${unit} over`;
  return `${diff}${unit}`;
}

/**
 * Headline calorie progress bar + 3-up macro rings (protein/carbs/fat).
 *
 * Props:
 *   totals: { calories, protein, carbs, fat }   (numbers, eaten amounts)
 *   goals:  { calories, protein, carbs, fat }   (numbers, daily goals)
 */
export default function MacroRings({ totals, goals }) {
  const macros = [
    { key: 'protein', label: 'PROTEIN', value: totals.protein || 0, goal: goals.protein || 0, unit: 'g' },
    { key: 'carbs',   label: 'CARBS',   value: totals.carbs   || 0, goal: goals.carbs   || 0, unit: 'g' },
    { key: 'fat',     label: 'FAT',     value: totals.fat     || 0, goal: goals.fat     || 0, unit: 'g' },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <CaloriesBar value={totals.calories || 0} goal={goals.calories || 0} />
      </div>
      <div className={styles.card}>
        <div className={styles.macroHeader}>
          <span className={styles.calLabel}>Macros</span>
        </div>
        <div className={styles.macroGrid}>
          {macros.map((m) => <MacroRing key={m.key} metricKey={m.key} label={m.label} value={m.value} goal={m.goal} unit={m.unit} />)}
        </div>
      </div>
    </div>
  );
}

function CaloriesBar({ value, goal }) {
  const status = statusForPercent(value, goal);
  const color = statusColor('calories', status);
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  // When over-budget we still cap the bar at 100% but recolor to danger;
  // the "over" amount is conveyed by the eaten/goal numbers.
  const diff = Math.round(goal - value);
  const remainingText = (() => {
    if (!goal || goal <= 0) return 'No goal set';
    if (diff < 0) return `+${Math.abs(diff)} over`;
    return `${diff} left`;
  })();

  return (
    <div className={styles.calBar}>
      <div className={styles.calHeader}>
        <span className={styles.calLabel}>Calories</span>
      </div>
      <div className={styles.calNumbers}>
        <span className={styles.calValue}>{Math.round(value)}</span>
        <span className={styles.calGoal}> / {Math.round(goal)} kcal</span>
        <span className={styles.calRemaining}>{remainingText}</span>
      </div>
      <div className={styles.calTrack} aria-hidden="true">
        <div
          className={styles.calFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MacroRing({ metricKey, label, value, goal, unit }) {
  const STROKE = 7;
  const r = 44;
  const size = 100;
  const c = 2 * Math.PI * r;
  const status = statusForPercent(value, goal);
  const color = statusColor(metricKey, status);

  return (
    <div className={styles.cell}>
      <div className={styles.ringWrap}>
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.cellSvg} aria-hidden="true">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="var(--color-track)" strokeWidth={STROKE} />
            <circle cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={ringDashOffset(value, goal, c)} />
          </g>
        </svg>
        <div className={styles.cellNumbers}>
          <div className={styles.cellValue}>
            {renderRemaining(value, goal, unit)}
          </div>
          {value < goal && <div className={styles.cellRemaining}>Left</div>}
        </div>
      </div>
      <div className={styles.cellLabel} style={{ color: `var(${COLOR_VARS[metricKey]})` }}>{label}</div>
      <div className={styles.cellGoal}>
        {Math.round(value)}{unit}/{Math.round(goal)}{unit}
      </div>
    </div>
  );
}
