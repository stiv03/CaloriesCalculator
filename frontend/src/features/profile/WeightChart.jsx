// frontend/src/features/profile/WeightChart.jsx
import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/** Reads CSS var so light/dark theme is honored. */
function readCssVar(name) {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function WeightChart({ weightRecords }) {
  const [limit, setLimit] = useState(30);

  const sorted = useMemo(() => (
    [...(weightRecords || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [weightRecords]);

  const visible = useMemo(() => (
    limit === 'all' ? sorted : sorted.slice(-limit)
  ), [sorted, limit]);

  const accent = readCssVar('--color-protein') || '#2563eb';

  const data = {
    labels: visible.map((r) => r.date),
    datasets: [{
      label: 'Weight (kg)',
      data: visible.map((r) => r.weight),
      borderColor: accent,
      backgroundColor: accent + '33',
      borderWidth: 2,
      pointRadius: 3,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { title: { display: true, text: 'kg' } },
    },
  };

  if (sorted.length === 0) return <p style={{ color: 'var(--color-text-muted)' }}>No weight records yet.</p>;

  return (
    <div>
      <select value={limit}
              onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              style={{
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}>
        <option value={7}>Last 7 days</option>
        <option value={15}>Last 15 days</option>
        <option value={30}>Last 30 days</option>
        <option value={60}>Last 60 days</option>
        <option value={100}>Last 100 days</option>
        <option value="all">All time</option>
      </select>
      <div style={{ height: 240 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
