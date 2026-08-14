// frontend/src/features/profile/tabs/StepsTab.jsx
import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import styles from './WeightTab.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function readCssVar(name) {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Steps history bar chart + summary. `steps` = [{date, steps}] ascending. */
export default function StepsTab({ steps = [] }) {
  const [limit, setLimit] = useState(30);

  const sorted = useMemo(
    () => [...steps].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [steps],
  );
  const visible = useMemo(
    () => (limit === 'all' ? sorted : sorted.slice(-limit)),
    [sorted, limit],
  );

  const avg = visible.length
    ? Math.round(visible.reduce((s, r) => s + (r.steps || 0), 0) / visible.length)
    : 0;
  const best = visible.reduce((m, r) => Math.max(m, r.steps || 0), 0);

  const accent = readCssVar('--color-accent') || '#16a34a';

  const data = {
    labels: visible.map((r) => r.date),
    datasets: [{
      label: 'Steps',
      data: visible.map((r) => r.steps),
      backgroundColor: accent,
      borderRadius: 3,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'steps' } } },
  };

  if (sorted.length === 0) {
    return (
      <div className={styles.tab}>
        <div className={styles.card}>
          <h3 className={styles.h3}>Steps</h3>
          <p className={styles.muted}>
            No step data yet. Connect Google Health in your profile and sync to import steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tab}>
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 'var(--space-3)', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Steps · avg {avg.toLocaleString()}/day · best {best.toLocaleString()}</h3>
          <select value={limit}
                  onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                  style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 12,
                           background: 'var(--color-surface)', color: 'var(--color-text)',
                           border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <option value={7}>Last 7 days</option>
            <option value={15}>Last 15 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div style={{ height: 240 }}>
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
