// frontend/src/features/profile/tabs/WeightTab.jsx
import React, { useMemo, useState } from 'react';
import WeightChart from '../WeightChart';
import { computeWeeklyAverages } from '../weeklyAverages';
import styles from './WeightTab.module.css';

export default function WeightTab({ weightRecords, allMacros }) {
  const weekly = useMemo(() => computeWeeklyAverages(weightRecords), [weightRecords]);
  const [showMacros, setShowMacros] = useState(false);

  const trendIcon = weekly.diff == null ? '—' : weekly.diff > 0 ? '▲' : weekly.diff < 0 ? '▼' : '—';

  return (
    <div className={styles.tab}>
      <div className={styles.weeklyCard}>
        <div className={styles.weeklyHeader}>
          <span className={styles.weeklyTitle}>Weekly average</span>
          <span className={styles.weeklyDelta}>
            {weekly.diff == null ? '—' : `${trendIcon} ${Math.abs(weekly.diff).toFixed(2)} kg`}
          </span>
        </div>
        <div className={styles.weeklyGrid}>
          <div>
            <div className={styles.weeklyLabel}>This week</div>
            <div className={styles.weeklyValue}>
              {weekly.thisWeek != null ? `${weekly.thisWeek.toFixed(2)} kg` : 'n/a'}
            </div>
            <div className={styles.weeklyRange}>{weekly.rangeThis || '–'}</div>
          </div>
          <div>
            <div className={styles.weeklyLabel}>Last week</div>
            <div className={styles.weeklyValue}>
              {weekly.lastWeek != null ? `${weekly.lastWeek.toFixed(2)} kg` : 'n/a'}
            </div>
            <div className={styles.weeklyRange}>{weekly.rangeLast || '–'}</div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Weight trend</h3>
        <WeightChart weightRecords={weightRecords} />
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Weight records</h3>
        {weightRecords.length === 0 && <p className={styles.muted}>No records yet.</p>}
        {weightRecords.length > 0 && (
          <ul className={styles.list}>
            {weightRecords.map((r, i) => (
              <li key={`${r.date}-${i}`} className={styles.row}>
                <span>{r.date}</span><strong>{r.weight} kg</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <button className={styles.toggleBtn} onClick={() => setShowMacros((s) => !s)}>
          {showMacros ? 'Hide macro history' : 'Show macro history'} ({allMacros.length} days)
        </button>
        {showMacros && allMacros.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th><th>Cal</th><th>P</th><th>C</th><th>F</th>
              </tr>
            </thead>
            <tbody>
              {allMacros.map((m, i) => (
                <tr key={`${m.date}-${i}`}>
                  <td>{m.date}</td>
                  <td>{Math.round(m.calories || 0)}</td>
                  <td>{(m.protein || 0).toFixed(1)}</td>
                  <td>{(m.carb || 0).toFixed(1)}</td>
                  <td>{(m.fat || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
