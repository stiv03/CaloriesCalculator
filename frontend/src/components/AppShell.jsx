// frontend/src/components/AppShell.jsx
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import styles from './AppShell.module.css';
import { clearAuth } from '../auth/storage';

/** Inline SVG icons — stroke uses currentColor so they inherit nav colors. */
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const TodayIcon = () => (
  <svg {...iconProps}>
    <path d="M3 2v7a3 3 0 0 0 3 3v10" />
    <path d="M9 2v7a3 3 0 0 1-3 3" />
    <path d="M6 2v7" />
    <path d="M18 2c-1.7 0-3 2-3 5v6h3v9" />
  </svg>
);

const ProgressIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 4 4 5-6" />
  </svg>
);

const SupplementsIcon = () => (
  <svg {...iconProps}>
    {/* Capsule pill on a diagonal: two rounded halves with a split line */}
    <rect x="2" y="9" width="20" height="6" rx="3" transform="rotate(-30 12 12)" />
    <line x1="9.5" y1="6.5" x2="14.5" y2="17.5" />
  </svg>
);

const WorkoutIcon = () => (
  <svg {...iconProps}>
    <path d="M6 4v16" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M18 4v16" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M6 12h12"/>
    <rect x="2" y="7" width="4" height="10" rx="1"/>
    <rect x="18" y="7" width="4" height="10" rx="1"/>
  </svg>
);

const CalendarIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ProfileIcon = () => (
  <svg {...iconProps}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg {...iconProps}>
    <path d="M12 2v10" />
    <path d="M5.5 6.5a8 8 0 1 0 13 0" />
  </svg>
);

/** Wraps authenticated pages. Bottom tab bar on mobile, left sidebar on desktop. */
export default function AppShell() {
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  // Order matches the rendered nav order — used to position the sliding
  // pill on the mobile tab bar.
  const tabs = [
    { to: '/today',       label: 'Today',       Icon: TodayIcon },
    { to: '/progress',    label: 'Progress',    Icon: ProgressIcon },
    { to: '/workout',     label: 'Workout',     Icon: WorkoutIcon },
    { to: '/supplements', label: 'Supps',       Icon: SupplementsIcon },
    { to: '/settings',    label: 'Profile',     Icon: ProfileIcon },
  ];

  // Index of the currently-active tab, or -1 if none matches (e.g. on a
  // sub-route the parent doesn't own). Match by path prefix so /settings/foo
  // still highlights /settings.
  const activeIndex = tabs.findIndex(
    (t) => location.pathname === t.to || location.pathname.startsWith(t.to + '/')
  );

  const renderNavItems = () =>
    tabs.map(({ to, label, Icon }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
      >
        <span className={styles.icon}><Icon /></span>
        <span className={styles.label}>{label}</span>
      </NavLink>
    ));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Primary">
        <div className={styles.brand}>
          <img src="/flex-logo.png" alt="Flex" className={styles.brandLogo} />
        </div>
        <nav className={styles.sidebarNav}>{renderNavItems()}</nav>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          <span className={styles.icon}><LogoutIcon /></span>
          <span className={styles.label}>Logout</span>
        </button>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.tabBar} aria-label="Primary">
        {activeIndex >= 0 && (
          <span
            className={styles.tabPill}
            aria-hidden="true"
            style={{
              width: `calc((100% - var(--space-2) * 2) / ${tabs.length})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
            }}
          />
        )}
        {renderNavItems()}
      </nav>
    </div>
  );
}
