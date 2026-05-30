// frontend/src/components/ReminderDot.jsx
import React from 'react';
import styles from './ReminderDot.module.css';

/** Small "!" badge pinned to a positioned parent. Parent must be position: relative. */
export default function ReminderDot({ visible = true, label = 'New reminder' }) {
  if (!visible) return null;
  return (
    <span className={styles.dot} role="status" aria-label={label}>!</span>
  );
}
