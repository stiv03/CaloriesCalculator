// frontend/src/components/MacroRings.jsx
import React, { useEffect, useState } from 'react';
import styles from './MacroRings.module.css';
import { ringDashOffset, statusForPercent } from './macroMath';

const STORAGE_KEY = 'caloriescalc:macros-expanded';

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

/**
 * Concentric (default) or expanded 2x2 grid of rings.
 * Click anywhere on the rings to toggle. Choice persists in localStorage.
 *
 * Props:
 *   totals: { calories, protein, carbs, fat }   (numbers, eaten amounts)
 *   goals:  { calories, protein, carbs, fat }   (numbers, daily goals)
 */
export default function MacroRings({ totals, goals }) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0'); } catch {}
  }, [expanded]);

  const metrics = [
    { key: 'calories', label: 'CALORIES', value: totals.calories || 0, goal: goals.calories || 0, unit: 'kcal' },
    { key: 'protein',  label: 'PROTEIN',  value: totals.protein  || 0, goal: goals.protein  || 0, unit: 'g' },
    { key: 'carbs',    label: 'CARBS',    value: totals.carbs    || 0, goal: goals.carbs    || 0, unit: 'g' },
    { key: 'fat',      label: 'FAT',      value: totals.fat      || 0, goal: goals.fat      || 0, unit: 'g' },
  ];

  return (
    <div
      className={[styles.root, expanded ? styles.expanded : styles.collapsed].join(' ')}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      aria-pressed={expanded}
      aria-label={expanded ? 'Collapse macro rings' : 'Expand macro rings'}
    >
      {expanded
        ? <ExpandedGrid metrics={metrics} />
        : <ConcentricRings metrics={metrics} />}
      <p className={styles.hint}>
        {expanded ? 'Tap to collapse ⌃' : 'Tap to expand ⌄'}
      </p>
    </div>
  );
}

function ConcentricRings({ metrics }) {
  const STROKE = 11;
  const radii = [78, 62, 46, 30]; // outer → inner
  const size = 180;
  const center = size / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={styles.concentricSvg}
      aria-hidden="true"
    >
      {metrics.map((m, i) => {
        const r = radii[i];
        const c = 2 * Math.PI * r;
        const status = statusForPercent(m.value, m.goal);
        const color = statusColor(m.key, status);
        return (
          <g key={m.key} transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={r}
                    fill="none" stroke="var(--color-track)" strokeWidth={STROKE} />
            <circle cx={center} cy={center} r={r}
                    fill="none" stroke={color} strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={ringDashOffset(m.value, m.goal, c)} />
          </g>
        );
      })}
    </svg>
  );
}

function ExpandedGrid({ metrics }) {
  const STROKE = 7;
  const r = 44;
  const size = 100;
  const c = 2 * Math.PI * r;
  return (
    <div className={styles.grid}>
      {metrics.map((m) => {
        const status = statusForPercent(m.value, m.goal);
        const color = statusColor(m.key, status);
        return (
          <div key={m.key} className={styles.cell}>
            <div className={styles.ringWrap}>
              <svg viewBox={`0 0 ${size} ${size}`} className={styles.cellSvg}>
                <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                  <circle cx={size/2} cy={size/2} r={r}
                          fill="none" stroke="var(--color-track)" strokeWidth={STROKE} />
                  <circle cx={size/2} cy={size/2} r={r}
                          fill="none" stroke={color} strokeWidth={STROKE}
                          strokeLinecap="round"
                          strokeDasharray={c}
                          strokeDashoffset={ringDashOffset(m.value, m.goal, c)} />
                </g>
              </svg>
              <div className={styles.cellNumbers}>
                <div className={styles.cellValue}>
                  {Math.round(m.value)}{m.unit !== 'kcal' && <span className={styles.cellUnit}>{m.unit}</span>}
                </div>
                <div className={styles.cellGoal}>
                  / {Math.round(m.goal)}{m.unit === 'kcal' ? '' : m.unit}
                </div>
              </div>
            </div>
            <div className={styles.cellLabel}>{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}
