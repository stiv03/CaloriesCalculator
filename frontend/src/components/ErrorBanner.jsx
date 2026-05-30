// frontend/src/components/ErrorBanner.jsx
import React from 'react';
import styles from './ErrorBanner.module.css';

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.text}>{message}</span>
      {onDismiss && (
        <button className={styles.close} onClick={onDismiss} aria-label="Dismiss">×</button>
      )}
    </div>
  );
}
