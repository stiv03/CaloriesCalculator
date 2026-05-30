// frontend/src/components/AppShell.jsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import styles from './AppShell.module.css';

/** Wraps authenticated pages. Bottom tab bar on mobile, top bar on desktop. */
export default function AppShell() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.tabBar} aria-label="Primary">
        <NavLink to="/today" className={({ isActive }) =>
          [styles.tab, isActive ? styles.tabActive : ''].join(' ')}>
          <span className={styles.icon} aria-hidden="true">🍽</span>
          <span className={styles.label}>Today</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) =>
          [styles.tab, isActive ? styles.tabActive : ''].join(' ')}>
          <span className={styles.icon} aria-hidden="true">👤</span>
          <span className={styles.label}>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
