// frontend/src/features/profile/WeightChart.jsx
import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function readCssVar(name) {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Simple moving average — window of N days, returns null for points with insufficient data. */
function movingAverage(values, window) {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export default function WeightChart({ weightRecords }) {
  const [limit, setLimit] = useState(30);
  const [maWindow, setMaWindow] = useState(7);

  const sorted = useMemo(() => (
    [...(weightRecords || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [weightRecords]);

  const visible = useMemo(() => (
    limit === 'all' ? sorted : sorted.slice(-limit)
  ), [sorted, limit]);

  const weights = visible.map((r) => parseFloat(r.weight));
  const maData = useMemo(() => movingAverage(weights, maWindow), [weights, maWindow]);

  const accent = readCssVar('--color-protein') || '#2563eb';
  const maColor = readCssVar('--color-accent') || '#16a34a';

  const data = {
    labels: visible.map((r) => r.date),
    datasets: [
      {
        label: 'Weight (kg)',
        data: weights,
        borderColor: accent,
        backgroundColor: accent + '22',
        borderWidth: 1.5,
        pointRadius: 2,
        tension: 0.1,
      },
      {
        label: `${maWindow}-day avg`,
        data: maData,
        borderColor: maColor,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.4,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
    scales: {
      y: { title: { display: true, text: 'kg' } },
    },
  };

  if (sorted.length === 0) return <p style={{ color: 'var(--color-text-muted)' }}>No weight records yet.</p>;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
        gap: 'var(--space-3)',
        flexWrap: 'wrap',
      }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Weight trend</h3>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <select value={maWindow}
                  onChange={(e) => setMaWindow(parseInt(e.target.value, 10))}
                  style={{
                    padding: 'var(--space-1) var(--space-2)',
                    fontSize: 12,
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
            <option value={3}>3-day avg</option>
            <option value={7}>7-day avg</option>
            <option value={14}>14-day avg</option>
          </select>
          <select value={limit}
                  onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                  style={{
                    padding: 'var(--space-1) var(--space-2)',
                    fontSize: 12,
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
        </div>
      </div>
      <div style={{ height: 240 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

