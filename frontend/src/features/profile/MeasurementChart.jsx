// frontend/src/features/profile/MeasurementChart.jsx
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SERIES = [
  { key: 'shoulder', label: 'Shoulder', color: 'rgb(255, 99, 132)' },
  { key: 'chest',    label: 'Chest',    color: 'rgb(54, 162, 235)' },
  { key: 'biceps',   label: 'Biceps',   color: 'rgb(75, 192, 192)' },
  { key: 'waist',    label: 'Waist',    color: 'rgb(255, 206, 86)' },
  { key: 'hips',     label: 'Hips',     color: 'rgb(153, 102, 255)' },
  { key: 'thigh',    label: 'Thigh',    color: 'rgb(255, 159, 64)' },
  { key: 'calf',     label: 'Calf',     color: 'rgb(99, 255, 132)' },
];

export default function MeasurementChart({ measurementRecords }) {
  const sorted = useMemo(() => (
    [...(measurementRecords || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [measurementRecords]);

  if (sorted.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)' }}>No measurements yet.</p>;
  }

  const labels = sorted.map((r) => new Date(r.date).toLocaleDateString());
  const data = {
    labels,
    datasets: SERIES.map((s) => ({
      label: `${s.label} (cm)`,
      data: sorted.map((r) => r[s.key]),
      borderColor: s.color,
      backgroundColor: s.color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: false, title: { display: true, text: 'cm' } } },
  };
  return <div style={{ height: 280 }}><Line data={data} options={options} /></div>;
}
