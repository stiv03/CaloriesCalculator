// frontend/src/components/StreakChips.jsx
import React from 'react';
import styles from './StreakChips.module.css';

const MealsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 2v7a3 3 0 0 0 3 3v10" />
    <path d="M9 2v7a3 3 0 0 1-3 3" />
    <path d="M6 2v7" />
    <path d="M18 2c-1.7 0-3 2-3 5v6h3v9" />
  </svg>
);

const WeightIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5" r="3" />
    <path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.9-2.54L19.4 9.46A2 2 0 0 0 17.5 8z" />
  </svg>
);

const SuppsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="9" width="20" height="6" rx="3" transform="rotate(-30 12 12)" />
    <line x1="9.5" y1="6.5" x2="14.5" y2="17.5" />
  </svg>
);

export default function StreakChips({ streaks, loading }) {
  const items = [
    { key: 'meals',       label: 'Meals',   Icon: MealsIcon,  value: streaks?.meals ?? 0 },
    { key: 'weight',      label: 'Weight',  Icon: WeightIcon, value: streaks?.weight ?? 0 },
    { key: 'supplements', label: 'Supps',   Icon: SuppsIcon,  value: streaks?.supplements ?? 0 },
  ];

  return (
    <div className={styles.row} aria-label="Streaks">
      {items.map((it) => (
        <div
          key={it.key}
          className={[styles.chip, it.value > 0 ? styles.chipActive : ''].join(' ')}
          title={`${it.label}: ${it.value}-day streak`}
        >
          <span className={styles.flame} aria-hidden="true">🔥</span>
          <span className={styles.value}>{loading ? '—' : it.value}</span>
          <span className={styles.label}>{it.label}</span>
          <span className={styles.icon}><it.Icon /></span>
        </div>
      ))}
    </div>
  );
}
