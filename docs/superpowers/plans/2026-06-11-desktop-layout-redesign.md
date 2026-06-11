# Desktop Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom/top tab bar with a left sidebar on desktop (≥768px), redesign Today and Profile pages to use the available width, while keeping the current mobile layout unchanged.

**Architecture:** Approach A — single responsive `AppShell` with CSS-only breakpoints. Same DOM rendered on both viewports; `@media (min-width: 768px)` flips orientation. No JS-based viewport detection. The bottom-sheet → modal flip for `Sheet` is already implemented in CSS and needs no changes.

**Tech Stack:** React 17 (CRA 3, react-scripts 3, `--openssl-legacy-provider` flag), CSS Modules, design tokens via `:root` CSS variables, react-router-dom v6, Jest (CRA test runner).

**Spec:** `docs/superpowers/specs/2026-06-11-desktop-layout-redesign-design.md`

---

## File Structure

**Modified files:**

- `frontend/src/styles/tokens.css` — three new layout tokens
- `frontend/src/auth/storage.js` — `getUsername` / `setUsername` + clear in `clearAuth`
- `frontend/src/features/auth/LoginPage.jsx` — call `setUsername` on success
- `frontend/src/features/auth/RegisterPage.jsx` — call `setUsername` on success
- `frontend/src/components/AppShell.jsx` — add user block in sidebar
- `frontend/src/components/AppShell.module.css` — bottom tab bar (mobile) / left sidebar (desktop)
- `frontend/src/features/today/TodayPage.jsx` — `.layout` wrapper + inline add-meal button
- `frontend/src/features/today/TodayPage.module.css` — two-column desktop grid; sticky macros; hide FAB on desktop
- `frontend/src/features/profile/ProfilePage.jsx` — `.layout` wrapper around tabs+content
- `frontend/src/features/profile/ProfilePage.module.css` — vertical sub-nav on desktop; hide mobile summary on desktop

**New files:**

- `frontend/src/__tests__/storage.test.js` — Jest tests for the username helpers

No new components. No new dependencies.

---

## Task 1: Add layout tokens

**Files:**
- Modify: `frontend/src/styles/tokens.css`

- [ ] **Step 1: Add new tokens to `:root`**

In `frontend/src/styles/tokens.css`, in the `:root` block, find the `/* Layout */` section that currently contains `--tab-bar-height: 64px;` and `--safe-area-bottom: env(...);`. Add three new variables in that section:

```css
  /* Layout */
  --tab-bar-height: 64px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --sidebar-width: 240px;
  --sub-nav-width: 200px;
  --content-max: 1200px;
```

Do **not** add anything to the `@media (prefers-color-scheme: dark)` block — these are layout sizes, not colors.

- [ ] **Step 2: Verify the file still parses**

Run: `cd frontend && npm start` (or just leave a previous dev server running — CRA hot-reloads CSS).
Expected: app loads at `http://localhost:3000` with no console errors. Stop the server (Ctrl+C) once verified.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/tokens.css
git commit -m "feat(tokens): add sidebar/sub-nav/content-max layout tokens"
```

---

## Task 2: Cache username in localStorage (TDD)

**Files:**
- Modify: `frontend/src/auth/storage.js`
- Create: `frontend/src/__tests__/storage.test.js`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/storage.test.js`:

```javascript
import {
  setUsername, getUsername, clearAuth, setToken, setUserId,
} from '../auth/storage';

describe('username storage', () => {
  beforeEach(() => localStorage.clear());

  test('setUsername then getUsername returns the value', () => {
    setUsername('alice');
    expect(getUsername()).toBe('alice');
  });

  test('getUsername returns null when not set', () => {
    expect(getUsername()).toBeNull();
  });

  test('setUsername coerces non-strings via String()', () => {
    setUsername(42);
    expect(getUsername()).toBe('42');
  });

  test('clearAuth removes username along with token and userId', () => {
    setToken('t');
    setUserId(7);
    setUsername('alice');
    clearAuth();
    expect(getUsername()).toBeNull();
    expect(localStorage.getItem('jwtToken')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from repo root: `cd frontend && npm test -- --watchAll=false src/__tests__/storage.test.js`
Expected: FAIL with `setUsername is not a function` (or similar — the helpers don't exist yet).

- [ ] **Step 3: Implement the helpers**

Replace the contents of `frontend/src/auth/storage.js` with:

```javascript
// frontend/src/auth/storage.js
// Wrappers around localStorage for the JWT, userId, and username. Single
// source of truth — never read these keys directly from any component.

const TOKEN_KEY = 'jwtToken';
const USER_ID_KEY = 'userId';
const USERNAME_KEY = 'username';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getUserId = () => localStorage.getItem(USER_ID_KEY);
export const setUserId = (userId) => localStorage.setItem(USER_ID_KEY, String(userId));
export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const setUsername = (username) => localStorage.setItem(USERNAME_KEY, String(username));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USERNAME_KEY);
};

export const isAuthenticated = () => Boolean(getToken());
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watchAll=false src/__tests__/storage.test.js`
Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/storage.js frontend/src/__tests__/storage.test.js
git commit -m "feat(auth): cache username in localStorage with getUsername/setUsername"
```

---

## Task 3: Persist username on login and register

**Files:**
- Modify: `frontend/src/features/auth/LoginPage.jsx`
- Modify: `frontend/src/features/auth/RegisterPage.jsx`

- [ ] **Step 1: Update LoginPage**

In `frontend/src/features/auth/LoginPage.jsx`, find the import of `setToken, setUserId` (look near the top — it's from `'../../auth/storage'`). Add `setUsername` to that import. Then, in `handleSubmit` after `setUserId(userId)`, add `setUsername(form.username)`.

Concretely, the import should change from something like:

```javascript
import { setToken, setUserId } from '../../auth/storage';
```

to:

```javascript
import { setToken, setUserId, setUsername } from '../../auth/storage';
```

And in the success block of `handleSubmit`:

```javascript
      const { token, userId } = await authApi.login(form);
      setToken(token);
      setUserId(userId);
      setUsername(form.username);
      navigate('/today');
```

- [ ] **Step 2: Update RegisterPage**

Same pattern in `frontend/src/features/auth/RegisterPage.jsx`. Add `setUsername` to the existing import from `'../../auth/storage'`. In the success block of `handleSubmit`, after `setUserId(userId)`, add `setUsername(form.username);`.

- [ ] **Step 3: Verify by logging in via the dev server**

Start the backend (`./mvnw spring-boot:run` from repo root) and the frontend (`cd frontend && npm start`). Log in with an existing user, open DevTools → Application → Local Storage, and verify a `username` key now exists with the entered username as its value. Log out (Profile tab → Logout button) and verify the `username` entry is gone.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/auth/LoginPage.jsx frontend/src/features/auth/RegisterPage.jsx
git commit -m "feat(auth): persist username to localStorage on login/register"
```

---

## Task 4: Restructure AppShell DOM

**Files:**
- Modify: `frontend/src/components/AppShell.jsx`

- [ ] **Step 1: Replace AppShell with new structure**

Replace the entire contents of `frontend/src/components/AppShell.jsx` with:

```jsx
// frontend/src/components/AppShell.jsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { getUsername } from '../auth/storage';
import styles from './AppShell.module.css';

/** Wraps authenticated pages. Bottom tab bar on mobile, left sidebar on desktop. */
export default function AppShell() {
  const username = getUsername();
  const initial = username ? username[0].toUpperCase() : '?';

  return (
    <div className={styles.shell}>
      <nav className={styles.primaryNav} aria-label="Primary">
        <ul className={styles.navList}>
          <li>
            <NavLink to="/today" className={({ isActive }) =>
              [styles.tab, isActive ? styles.tabActive : ''].join(' ')}>
              <span className={styles.icon} aria-hidden="true">🍽</span>
              <span className={styles.label}>Today</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={({ isActive }) =>
              [styles.tab, isActive ? styles.tabActive : ''].join(' ')}>
              <span className={styles.icon} aria-hidden="true">👤</span>
              <span className={styles.label}>Profile</span>
            </NavLink>
          </li>
        </ul>
        <div className={styles.userBlock}>
          <NavLink to="/profile" className={styles.userLink} aria-label="Profile">
            <span className={styles.avatar} aria-hidden="true">{initial}</span>
            {username && <span className={styles.userName}>{username}</span>}
          </NavLink>
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
```

The DOM is the same on both viewports; the `<ul>` simply provides a scoped container for the nav links. The `userBlock` is hidden via CSS on mobile (Task 5).

- [ ] **Step 2: Verify it renders without errors**

With `npm start` running, navigate to `/today`. Expected: page still renders. The bottom tab bar will look slightly different (now uses `<ul><li>` markup) but visually similar. The user block at the bottom will appear as broken styling — that's expected; we fix it in Task 5.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AppShell.jsx
git commit -m "feat(shell): restructure AppShell DOM with user block + nav list"
```

---

## Task 5: Rewrite AppShell CSS for sidebar layout

**Files:**
- Modify: `frontend/src/components/AppShell.module.css`

- [ ] **Step 1: Replace AppShell.module.css**

Replace the entire contents of `frontend/src/components/AppShell.module.css` with:

```css
/* MOBILE (default) — bottom tab bar */

.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
  padding-bottom: calc(var(--tab-bar-height) + var(--safe-area-bottom));
  min-width: 0;
}

.primaryNav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-tab-bar);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  height: calc(var(--tab-bar-height) + var(--safe-area-bottom));
  padding-bottom: var(--safe-area-bottom);
}

.navList {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  height: var(--tab-bar-height);
}

.navList > li {
  flex: 1;
  display: flex;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  transition: color 0.15s ease;
}
.tab:hover { text-decoration: none; }

.icon { font-size: 22px; }

.tabActive { color: var(--color-accent); }

.userBlock { display: none; }

/* DESKTOP — left sidebar */

@media (min-width: 768px) {
  .shell { flex-direction: row; }

  .main {
    padding-bottom: 0;
    padding-top: 0;
    flex: 1;
    min-width: 0;
  }

  .primaryNav {
    position: sticky;
    top: 0;
    left: 0;
    bottom: auto;
    right: auto;
    width: var(--sidebar-width);
    height: 100vh;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-top: 0;
    border-right: 1px solid var(--color-border);
    padding: var(--space-5) var(--space-3);
  }

  .navList {
    flex-direction: column;
    height: auto;
    gap: var(--space-1);
  }

  .navList > li { flex: 0 0 auto; }

  .tab {
    flex: 0 0 auto;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: 14px;
  }

  .tab:hover { background: var(--color-surface-2); }

  .tabActive { background: var(--color-surface-2); color: var(--color-accent); }

  .icon { font-size: 18px; }

  .userBlock {
    display: block;
    margin-top: auto;
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .userLink {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    text-decoration: none;
    color: var(--color-text);
    border-radius: var(--radius-md);
  }

  .userLink:hover { background: var(--color-surface-2); text-decoration: none; }

  .avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--color-surface-2);
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
  }

  .userName {
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

- [ ] **Step 2: Manually verify both viewports**

With `npm start` running and a user logged in:

1. Resize the browser to ≥ 768px wide (or DevTools 1280×800):
   - Sidebar visible on the left, full height of the viewport.
   - "🍽 Today" and "👤 Profile" stacked at the top, the active one with a slightly darker background and accent-colored text.
   - User block at the bottom of the sidebar with a circular avatar showing the username's first letter and the username next to it.
2. Resize to < 768px (or DevTools 390×844):
   - Sidebar disappears.
   - Bottom tab bar appears with the same two items, identical to the previous design.
   - User block is not visible.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AppShell.module.css
git commit -m "feat(shell): left sidebar on desktop with user block; bottom bar on mobile"
```

---

## Task 6: Today page — two-column layout on desktop

**Files:**
- Modify: `frontend/src/features/today/TodayPage.jsx`
- Modify: `frontend/src/features/today/TodayPage.module.css`

- [ ] **Step 1: Inspect the current TodayPage render**

Read `frontend/src/features/today/TodayPage.jsx` and locate the `return (...)` block. You'll see roughly:

```
<div className={styles.page}>
  <header>...</header>
  <section className={styles.macroSection}>...</section>
  <ErrorBanner ... />
  <section className={styles.mealsSection}>...</section>
  <button className={styles.fab} ...>+</button>
  <AddMealSheet ... />
</div>
```

We're going to wrap the macro and meals sections in a new `.layout` element, and add a sibling inline button for the meals column on desktop. The FAB stays for mobile.

- [ ] **Step 2: Update TodayPage.jsx render**

Modify the JSX in `TodayPage.jsx` so the macro section, error banner (relocated outside the layout grid is fine), and meals section are wrapped, and an inline add-meal button is rendered alongside the meal list. The structure becomes:

```jsx
<div className={styles.page}>
  <header className={styles.header}>
    <DayPicker date={date} onChange={setDate} />
  </header>

  <ErrorBanner message={error} onDismiss={() => setError('')} />

  <div className={styles.layout}>
    <section className={styles.macroSection}>
      <MacroRings totals={totals} goals={goals} />
    </section>

    <section className={styles.mealsSection}>
      <button
        type="button"
        className={styles.addMealInline}
        onClick={() => setAddSheetOpen(true)}
      >
        + Add meal
      </button>

      {/* existing meal list rendering — keep whatever is there today */}
      {loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : meals.length === 0 ? (
        <p className={styles.muted}>No meals logged for this day.</p>
      ) : (
        meals.map((m) => (
          <MealCard
            key={m.id}
            meal={m}
            expanded={expandedMealId === m.id}
            onToggle={() => setExpandedMealId(expandedMealId === m.id ? null : m.id)}
            onUpdateQuantity={async (q) => {
              await updateMealQuantity(userId, m.id, q);
              loadDay();
            }}
            onDelete={async () => {
              await deleteMeal(userId, m.id);
              setExpandedMealId(null);
              loadDay();
            }}
          />
        ))
      )}
    </section>
  </div>

  <button
    className={styles.fab}
    onClick={() => setAddSheetOpen(true)}
    aria-label="Add meal"
  >
    +
  </button>

  <AddMealSheet
    isOpen={addSheetOpen}
    onClose={() => setAddSheetOpen(false)}
    userId={userId}
    date={dateStr}
    onAdded={() => { setAddSheetOpen(false); loadDay(); }}
  />
</div>
```

**Important:** Do not delete or change the existing meals/loading/empty rendering logic — copy whatever is there today into the meals section. The block above shows the typical shape; if your file has slight differences (props on `MealCard`, etc.), preserve them. The only structural changes are:

1. Wrap macro + meals sections in `<div className={styles.layout}>`.
2. Add `<button className={styles.addMealInline}>+ Add meal</button>` as the first child of the meals section.
3. Move the `<ErrorBanner>` above `.layout` (it already lives near the top, so this may already be the case).

Leave the existing `.fab` button unchanged — it's hidden via CSS on desktop in step 3.

- [ ] **Step 3: Update TodayPage.module.css**

Replace the entire contents of `frontend/src/features/today/TodayPage.module.css` with:

```css
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 var(--space-4) var(--space-6);
}

.header { padding: var(--space-3) 0; }

.layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.macroSection { /* no extra styling on mobile — flex parent handles spacing */ }

.mealsSection { display: flex; flex-direction: column; gap: var(--space-2); }

.h2 { margin-bottom: var(--space-3); }

.muted { color: var(--color-text-muted); font-size: 14px; padding: var(--space-3) 0; }

/* Inline add-meal button: hidden on mobile, visible on desktop */
.addMealInline { display: none; }

.fab {
  position: fixed;
  right: var(--space-4);
  bottom: calc(var(--tab-bar-height) + var(--safe-area-bottom) + var(--space-4));
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: 0;
  font-size: 28px;
  font-weight: 300;
  box-shadow: var(--shadow-md);
  z-index: var(--z-tab-bar);
}
.fab:hover { background: var(--color-accent-hover); }

@media (min-width: 768px) {
  .page {
    max-width: var(--content-max);
    padding: var(--space-5) var(--space-5) var(--space-6);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: var(--space-5);
    align-items: start;
  }

  .macroSection {
    position: sticky;
    top: var(--space-4);
  }

  .fab { display: none; }

  .addMealInline {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-accent);
    color: var(--color-text-inverse);
    border: 0;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: var(--space-2);
  }
  .addMealInline:hover { background: var(--color-accent-hover); }
}
```

- [ ] **Step 4: Verify both viewports**

With `npm start` running:

1. Desktop (≥ 768px): `/today` shows two columns side-by-side. Macros stick to the top of the viewport when you scroll the meal list. The "+ Add meal" inline button sits at the top of the meal list column. The circular FAB is gone.
2. Mobile (< 768px): `/today` looks unchanged — single column with FAB at bottom-right and no inline button.
3. Click the inline button → AddMealSheet opens (as a centered modal at this width since Sheet's CSS handles that). Click the FAB on mobile → same sheet opens (sliding up).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/today/TodayPage.jsx frontend/src/features/today/TodayPage.module.css
git commit -m "feat(today): two-column layout with sticky macros + inline add-meal on desktop"
```

---

## Task 7: Profile page — sub-nav column on desktop

**Files:**
- Modify: `frontend/src/features/profile/ProfilePage.jsx`
- Modify: `frontend/src/features/profile/ProfilePage.module.css`

- [ ] **Step 1: Update ProfilePage.jsx render**

In `frontend/src/features/profile/ProfilePage.jsx`, replace the `return (...)` block. The new render keeps the same data flow but wraps the tabs and content in a `.layout` element so CSS can switch them between vertical (desktop) and horizontal (mobile). The existing `Tabs` component renders the same regardless — it's stateless buttons. CSS controls orientation via the wrapper class.

```jsx
  return (
    <div className={styles.page}>
      <header className={styles.summary}>
        <div className={styles.avatar}>{user?.name ? user.name[0].toUpperCase() : '·'}</div>
        <h1 className={styles.name}>{user?.name || 'Profile'}</h1>
        <p className={styles.subtitle}>
          {user
            ? `${(user.status || 'maintaining').toLowerCase().replace('_', ' ')} · ${(user.activity || 'normal').toLowerCase().replace('_', ' ')} activity`
            : ' '}
        </p>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className={styles.layout}>
        <div className={styles.tabsBar}>
          <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
        </div>

        <section className={styles.content}>
          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              goal={goal}
              weightRecords={weightRecords}
              latestMeasurement={latestMeasurement}
              onRefreshUser={refreshUser}
              onRefreshGoal={refreshGoal}
              onRefreshWeights={refreshWeights}
              onRefreshMeasurements={refreshMeasurements}
            />
          )}
          {activeTab === 'weight' && (
            <WeightTab weightRecords={weightRecords} allMacros={allMacros} />
          )}
          {activeTab === 'body' && (
            <BodyTab measurements={measurements} latestMeasurement={latestMeasurement} />
          )}
        </section>
      </div>
    </div>
  );
```

The only structural change is moving `tabsBar` and `content` inside a single `.layout` wrapper, and moving `ErrorBanner` above the layout (it was already roughly there; verify your file matches).

- [ ] **Step 2: Replace ProfilePage.module.css**

Replace the entire contents of `frontend/src/features/profile/ProfilePage.module.css` with:

```css
.page { max-width: 720px; margin: 0 auto; padding: 0 var(--space-4) var(--space-6); }

.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-5) 0;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-surface-2);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}

.name { font-size: 22px; }
.subtitle { color: var(--color-text-muted); font-size: 13px; }

.layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tabsBar { /* mobile: horizontal Tabs renders inside */ }

.content { display: flex; flex-direction: column; gap: var(--space-5); }

@media (min-width: 768px) {
  .page {
    max-width: var(--content-max);
    padding: var(--space-5) var(--space-5) var(--space-6);
  }

  /* Sidebar already shows the user; the centered avatar block is redundant on desktop. */
  .summary { display: none; }

  .layout {
    display: grid;
    grid-template-columns: var(--sub-nav-width) minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }

  /* Force the existing horizontal Tabs to render as a vertical column on desktop. */
  .tabsBar :global([role="tablist"]) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-1);
    border-bottom: 0;
  }

  .tabsBar :global([role="tab"]) {
    text-align: left;
    justify-content: flex-start;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border-bottom: 0;
  }

  .tabsBar :global([role="tab"][aria-selected="true"]) {
    background: var(--color-surface-2);
  }
}
```

The `:global(...)` selectors target the existing `Tabs` markup (`role="tablist"` and `role="tab"`) without modifying `Tabs.module.css` itself. CSS Modules treats anything inside `:global()` as a literal selector. This is the standard pattern in CRA.

- [ ] **Step 3: Verify both viewports**

With `npm start` running:

1. Desktop (≥ 768px): `/profile` shows the centered avatar/name block **gone**. Three vertical buttons on the left (Profile / Weight / Body); active one has a darker background. Active-tab content fills the right column.
2. Mobile (< 768px): `/profile` looks unchanged — centered avatar at top, horizontal tabs underneath, active content below.
3. Switching tabs on either viewport works the same as before; data refresh logic untouched.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/profile/ProfilePage.jsx frontend/src/features/profile/ProfilePage.module.css
git commit -m "feat(profile): vertical sub-nav on desktop; horizontal tabs on mobile"
```

---

## Task 8: Cross-viewport regression sweep

**Files:**
- None — this is a manual verification pass.

- [ ] **Step 1: Backend running**

Start the backend if it isn't already: `./mvnw spring-boot:run` from the repo root. Verify it's listening on `:8080`.

- [ ] **Step 2: Frontend running**

`cd frontend && npm start` — should auto-open `http://localhost:3000`.

- [ ] **Step 3: Mobile pass (DevTools 390×844 or browser narrower than 768px)**

For an authenticated user:

- [ ] `/today`: bottom tab bar visible with Today/Profile, single-column layout, FAB visible bottom-right, no inline "+ Add meal" button, no sidebar.
- [ ] Tap the FAB → AddMealSheet slides up from the bottom.
- [ ] `/profile`: centered avatar + name at top, horizontal tabs (Profile/Weight/Body), single-column tab content. No sidebar, no vertical sub-nav.
- [ ] Logout from Profile → redirected to `/login`. localStorage no longer has `username`, `userId`, or `jwtToken`.

- [ ] **Step 4: Desktop pass (DevTools 1280×800 or browser wider than 768px)**

For an authenticated user:

- [ ] All pages: sidebar visible on the left with the two nav items and a user block at the bottom. The user block shows the avatar (first letter of username) and the username text.
- [ ] `/today`: two-column dashboard. Left column has DayPicker + macros (sticky). Right column has the "+ Add meal" inline button followed by the meal list. No FAB.
- [ ] Click the inline "+ Add meal" → AddMealSheet renders as a centered modal (existing Sheet CSS).
- [ ] `/profile`: no centered avatar/summary block. Vertical sub-nav on the left (Profile/Weight/Body), active tab content on the right.
- [ ] Click each tab — content swaps in the right column; URL doesn't need to change (existing behavior).
- [ ] Click the user block in the sidebar → navigates to `/profile`.

- [ ] **Step 5: Cross-viewport resize check**

While on `/today` and `/profile`, slowly drag the browser window across the 768px breakpoint. Expected:

- [ ] No JavaScript errors in the console at any width.
- [ ] At the breakpoint flip, the layout reorganizes (sidebar appears/disappears) — that's expected.
- [ ] No stuck layout artifacts (e.g., bottom tab bar still visible at desktop width or sidebar still visible at mobile width).
- [ ] `localStorage` is unaffected by viewport changes.

- [ ] **Step 6: Logged-in user without cached username (legacy fallback)**

In DevTools → Application → Local Storage → delete the `username` entry while leaving `jwtToken` and `userId` in place. Reload the page.

- [ ] Sidebar's user block shows a `?` initial and no username text (the `<span>` is hidden when username is null).
- [ ] App is otherwise fully functional. Logging in again restores the username.

- [ ] **Step 7: Build sanity check**

Run: `cd frontend && npm run build`
Expected: build completes without errors. Warnings are tolerable; there should be no new ones beyond the existing baseline.

- [ ] **Step 8: No commit needed for this task**

This is a verification-only pass. If any check failed, return to the relevant earlier task and fix.

---

## Notes for the implementer

- **Do not run `git add .` blindly.** The `target/` directory contains compiled `.class` files that have historically been tracked; the recent `2a5d923 chore: untrack target/ test reports` commit removed them. Stage only the files listed in each task.
- **CRA / `--openssl-legacy-provider`:** the `npm test` and `npm start` scripts already include this flag — don't drop it.
- **Dark mode:** the existing token system already drives dark mode via `prefers-color-scheme`. Don't add color literals; use tokens like `--color-surface`, `--color-text`, `--color-accent`. Layout tokens added in Task 1 are theme-independent and live only in `:root`.
- **Hot reload:** CSS module changes hot-reload reliably in CRA; JSX changes occasionally require a full reload. If a styled element looks wrong, hard-refresh (Cmd+Shift+R) before assuming the CSS is broken.
- **No backend changes.** If something tempts you to add fields, stop and re-read the spec — the username caching is purely client-side, using a value the user has already typed in.
