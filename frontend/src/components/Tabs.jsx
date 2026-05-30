// frontend/src/components/Tabs.jsx
import React from 'react';
import styles from './Tabs.module.css';

/**
 * Tabs primitive. Caller passes a list of { id, label } and the active id.
 * Stateless — caller owns the active id (so it can persist or reset on demand).
 */
export default function Tabs({ tabs, activeId, onChange }) {
  return (
    <div role="tablist" className={styles.tabs}>
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            className={[styles.tab, active ? styles.active : ''].join(' ')}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
