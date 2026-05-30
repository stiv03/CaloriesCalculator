# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile-first redesign of the React frontend with a tabbed Profile page, bottom-sheet food logging, expandable concentric→2×2 macro rings, auto light/dark theme, and a punch-list of bug fixes — preserving all backend behavior except for adding one new password-update endpoint.

**Architecture:** All flat-file `src/` components are reorganized into `api/`, `auth/`, `components/`, `features/today/`, `features/profile/`, `styles/`. A single CSS-variables design system supplies tokens that auto-switch via `prefers-color-scheme`. Pages own their data via `useState`/`useEffect`; no global state library is added. Bottom tab bar (mobile) / top bar (desktop) wraps `/today` and `/profile`. Auth pages live outside the shell.

**Tech Stack:** React 18, react-router-dom 6, axios 1, chart.js 3, react-chartjs-2 5, react-autosuggest 10, CSS Modules, react-scripts 3 (kept).

**Spec:** `docs/superpowers/specs/2026-05-30-frontend-redesign-design.md`

---

## File map

**New files:**

```
frontend/src/
  styles/
    tokens.css
    base.css
    typography.css
  api/
    client.js               # was axiosConfig.js, moved + cleaned
    auth.js
    meals.js
    profile.js
  auth/
    storage.js              # was utils/auth.js
  components/
    AppShell.jsx + .module.css
    Sheet.jsx + .module.css
    MacroRings.jsx + .module.css
    DayPicker.jsx + .module.css
    Field.jsx + .module.css
    PasswordField.jsx + .module.css
    Button.jsx + .module.css
    Tabs.jsx + .module.css
    ErrorBanner.jsx + .module.css
    ReminderDot.jsx + .module.css
    ConfirmDialog.jsx + .module.css
  features/
    auth/
      RegisterPage.jsx + .module.css
      LoginPage.jsx + .module.css
      validation.js
    today/
      TodayPage.jsx + .module.css
      MealCard.jsx + .module.css
      AddMealSheet.jsx + .module.css
      AddProductSheet.jsx + .module.css
      dateFormat.js
    profile/
      ProfilePage.jsx + .module.css
      WeightChart.jsx (moved + restyled)
      MeasurementChart.jsx (moved + restyled)
      tabs/
        ProfileTab.jsx + .module.css
        WeightTab.jsx + .module.css
        BodyTab.jsx + .module.css
      reminders.js          # checkWeightReminder / checkMeasurementReminder helpers
      weeklyAverages.js     # computeWeeklyAverages, extracted from UserProfile.js
  __tests__/                 # one file per pure module that has tests
    dateFormat.test.js
    validation.test.js
    weeklyAverages.test.js
    macroMath.test.js
    reminders.test.js
```

**Backend additions:**

```
src/main/java/com/stoyandev/caloriecalculator/
  dto/UpdateUserPasswordRequestDTO.java          (new)
  controller/UserController.java                 (modify: add updatePassword endpoint)
  service/UserService.java                       (modify: add updatePassword signature)
  service/implementations/UserServiceImpl.java   (modify: implement updatePassword)
  security/auth/RegisterRequest.java             (modify: add gender field)
  security/service/AuthenticationService.java    (modify: write gender on register)
```

**Files deleted at the end (Task 27):**

```
frontend/src/
  RegistrationForm.js, RegistrationForm.css
  LoginForm.js, LoginForm.css
  CaloriesCalculator.js, CaloriesCalculator.module.css
  UserProfile.js, UserProfile.css
  WeightChart.css                              (replaced by MOdule)
  MeasurementChart.css                         (replaced)
  axiosConfig.js
  utils/auth.js
  App.css                                      (logic moved to base.css + tokens.css)
  index.css                                    (replaced by base.css + tokens.css)
  App.test.js                                  (replaced by App.smoke.test.js if needed)
```

`utils/` directory will be empty after `utils/auth.js` moves; remove the directory.

---

## Conventions used by every task

- Run frontend commands from `frontend/`. Run backend commands from repo root with `JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home`.
- Frontend tests: `npm test -- --watchAll=false <pattern>`
- Backend compile/test: `mvn -q compile` / `mvn -q test`
- Each commit message uses the conventional format: `feat(scope): subject`, `fix(scope): subject`, `chore(scope): subject`, `test(scope): subject`, `style(scope): subject`.
- Every CSS Module file uses `var(--token-name)` for ALL colors and ALL spacings — no hex literals, no pixel literals (except for sub-pixel borders like `1px`).
- Every new component imports its own CSS Module (`import styles from './X.module.css'`) and uses `className={styles.foo}`.
- Logic-bearing modules (anything ending in `.js` that is not a `.jsx` component) get a unit test in `__tests__/`.
- Components themselves get manual-QA checkpoints, not unit tests, per the spec.
- After every task, run `npm test -- --watchAll=false` to confirm existing tests still pass before committing.

The plan has 28 tasks. Tasks 1–4 are foundational; 5–18 build features in dependency order; 19–22 are the Profile tabs; 23–24 are backend; 25–28 are wiring + cleanup.

---

The full plan continues across **28 tasks** below. Due to length, the plan is split into sections — each section is a self-contained group of tasks. Each task uses the bite-sized step format.

[Tasks 1–28 follow on the next pages of this document. Continue scrolling.]

---

## Task 1: Create design tokens CSS

**Files:**
- Create: `frontend/src/styles/tokens.css`

- [ ] **Step 1: Write the file**

```css
/* frontend/src/styles/tokens.css
   Design tokens — light theme on :root, dark via prefers-color-scheme.
   Components must reference colors and spacings ONLY through these vars. */

:root {
  /* Surfaces */
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-2: #f0f0f0;
  --color-border: #e6e6e6;
  --color-overlay: rgba(0, 0, 0, 0.45);

  /* Text */
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --color-text-inverse: #ffffff;

  /* Brand / accents */
  --color-accent: #16a34a;
  --color-accent-hover: #15803d;

  /* Macro colors */
  --color-calories: #16a34a;
  --color-protein: #2563eb;
  --color-carbs: #d97706;
  --color-fat: #dc2626;

  /* States */
  --color-danger: #dc2626;
  --color-danger-hover: #b91c1c;
  --color-warn: #d97706;
  --color-success: #16a34a;
  --color-track: #e5e7eb; /* unfilled portion of rings/bars */

  /* Spacing scale (4px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.18);

  /* Typography */
  --font-body: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans',
               'Segoe UI', 'Roboto', sans-serif;
  --font-display: 'Oranienbaum', Georgia, serif;

  /* Layout */
  --tab-bar-height: 64px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  /* Z layers */
  --z-tab-bar: 50;
  --z-sheet-backdrop: 100;
  --z-sheet: 110;
  --z-toast: 200;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f0f0f;
    --color-surface: #1a1a1a;
    --color-surface-2: #262626;
    --color-border: #2a2a2a;
    --color-overlay: rgba(0, 0, 0, 0.65);

    --color-text: #ededed;
    --color-text-muted: #9ca3af;
    --color-text-inverse: #0f0f0f;

    --color-accent: #4ade80;
    --color-accent-hover: #22c55e;

    --color-calories: #4ade80;
    --color-protein: #60a5fa;
    --color-carbs: #fbbf24;
    --color-fat: #f87171;

    --color-danger: #f87171;
    --color-danger-hover: #ef4444;
    --color-warn: #fbbf24;
    --color-success: #4ade80;
    --color-track: #2a2a2a;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.6);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/tokens.css
git commit -m "feat(styles): add design tokens with light/dark theme"
```

---

## Task 2: Add base CSS (resets, body, focus styles)

**Files:**
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/styles/typography.css`

- [ ] **Step 1: Write base.css**

```css
/* frontend/src/styles/base.css */

*, *::before, *::after { box-sizing: border-box; }

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: transparent;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input, select, textarea {
  font-family: inherit;
  font-size: 16px; /* prevents iOS zoom on focus */
}

a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Visually-hidden text for accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* Prevent horizontal scroll across the app */
body { overflow-x: hidden; }
```

- [ ] **Step 2: Write typography.css**

```css
/* frontend/src/styles/typography.css */

h1, h2, h3, h4 {
  margin: 0;
  font-weight: 700;
  color: var(--color-text);
}

h1 { font-size: 24px; line-height: 1.2; }
h2 { font-size: 20px; line-height: 1.25; }
h3 { font-size: 16px; line-height: 1.3; }
h4 { font-size: 14px; line-height: 1.3; letter-spacing: 0.5px; text-transform: uppercase; color: var(--color-text-muted); }

p { margin: 0; line-height: 1.5; }

.label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/base.css frontend/src/styles/typography.css
git commit -m "feat(styles): add base resets and typography rules"
```

---

## Task 3: Move and clean axios client

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/auth/storage.js`

Move `axiosConfig.js` to `api/client.js` and `utils/auth.js` to `auth/storage.js`. We don't delete the originals yet — Task 27 cleans up after every importer is migrated.

- [ ] **Step 1: Write `auth/storage.js`**

```javascript
// frontend/src/auth/storage.js
// Wrappers around localStorage for the JWT and userId. Single source of
// truth — never read these keys directly from any component.

const TOKEN_KEY = 'jwtToken';
const USER_ID_KEY = 'userId';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getUserId = () => localStorage.getItem(USER_ID_KEY);
export const setUserId = (userId) => localStorage.setItem(USER_ID_KEY, String(userId));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
};

export const isAuthenticated = () => Boolean(getToken());
```

- [ ] **Step 2: Write `api/client.js`**

```javascript
// frontend/src/api/client.js
// Configured axios instance shared by every API wrapper.
// Auto-attaches Bearer token on non-/auth/ requests.
// Handles 401 globally by clearing auth + redirecting to /login.

import axios from 'axios';
import { getToken, clearAuth } from '../auth/storage';

const client = axios.create({
  baseURL: 'http://localhost:8080/api/v1/',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && !config.url.includes('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      // Hard redirect — wipes all in-memory state from the previous session.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

/**
 * Convert raw axios error into a stable shape the UI can rely on.
 * Backend's GlobalExceptionHandler returns { status, error, message, fieldErrors? }.
 */
function normalizeError(err) {
  if (err.response) {
    const body = err.response.data || {};
    return {
      status: err.response.status,
      message: body.message || err.message || 'Request failed',
      fieldErrors: body.fieldErrors || null,
      raw: err,
    };
  }
  if (err.request) {
    return { status: 0, message: 'No response from server', fieldErrors: null, raw: err };
  }
  return { status: 0, message: err.message || 'Request error', fieldErrors: null, raw: err };
}

export default client;
```

- [ ] **Step 3: Verify the existing tests still pass** (App.test.js currently passes against the old structure)

Run from `frontend/`:

```bash
npm test -- --watchAll=false 2>&1 | tail -10
```

Expected: PASS (existing 1 test).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/client.js frontend/src/auth/storage.js
git commit -m "feat(api): introduce api/client.js and auth/storage.js with 401 interceptor"
```

---

## Task 4: API wrappers — auth, meals, profile

**Files:**
- Create: `frontend/src/api/auth.js`
- Create: `frontend/src/api/meals.js`
- Create: `frontend/src/api/profile.js`

- [ ] **Step 1: Write `api/auth.js`**

```javascript
// frontend/src/api/auth.js
import client from './client';

export async function register(payload) {
  // payload: { name, age, gender, weight, height, username, password }
  const { data } = await client.post('/auth/register', payload);
  return data; // { token, userId }
}

export async function login(payload) {
  // payload: { username, password }
  const { data } = await client.post('/auth/login', payload);
  return data; // { token, userId }
}

export async function changePassword(userId, newPassword) {
  await client.put(`/update/password/${userId}`, { newPassword });
}
```

- [ ] **Step 2: Write `api/meals.js`**

```javascript
// frontend/src/api/meals.js
import client from './client';

export async function listMealsForDay(userId, dateStr /* dd/MM/yyyy */) {
  const { data } = await client.get(`/meals/date/${userId}`, { params: { date: dateStr } });
  return data;
}

export async function getDailyMacros(userId, dateStr) {
  const { data } = await client.get(`/meals/${userId}/totalMacros`, { params: { date: dateStr } });
  return data; // { date, calories, protein, fat, carb }
}

export async function getAllMacros(userId) {
  const { data } = await client.get(`/meals/${userId}/allMacros`);
  return data;
}

export async function addMeal(userId, productId, grams) {
  await client.post(`/meals/${userId}`, { productId, grams });
}

export async function updateMealQuantity(userId, mealId, newQuantity) {
  const { data } = await client.put(`/meals/upgrade/quantity/${userId}/meal/${mealId}`, { newQuantity });
  return data;
}

export async function deleteMeal(mealId) {
  await client.delete(`/meals/delete/meal/${mealId}`);
}

export async function searchProducts(query) {
  const { data } = await client.get('/products/search', { params: { query } });
  return data;
}

export async function createProduct(product) {
  const { data } = await client.post('/new/product', product);
  return data;
}
```

- [ ] **Step 3: Write `api/profile.js`**

```javascript
// frontend/src/api/profile.js
import client from './client';

export async function getUser(userId) {
  const { data } = await client.get(`/user/${userId}`);
  return data;
}

export async function updateWeight(userId, newWeight) {
  const { data } = await client.put(`/update/weight/${userId}`, { newWeight });
  return data;
}

export async function updateHeight(userId, newHeight) {
  const { data } = await client.put(`/update/height/${userId}`, { newHeight });
  return data;
}

export async function updateAge(userId, newAge) {
  const { data } = await client.put(`/update/age/${userId}`, { newAge });
  return data;
}

export async function updateStatus(userId, statusCode) {
  const { data } = await client.put(`/update/status/${userId}`, statusCode, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export async function updateActivity(userId, activityCode) {
  const { data } = await client.put(`/update/activity/${userId}`, activityCode, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export async function getWeightRecords(userId) {
  const { data } = await client.get(`/${userId}/weightRecords`);
  return data;
}

export async function getMeasurements(userId) {
  const { data } = await client.get(`/user/measurements/${userId}`);
  return data;
}

export async function getLatestMeasurement(userId) {
  const { data } = await client.get(`/user/latestMeasurement/${userId}`);
  return data;
}

export async function addMeasurement(userId, measurements) {
  const { data } = await client.post(`/add/${userId}/measurements`, measurements);
  return data;
}

export async function getGoal(userId) {
  const { data } = await client.get(`/user/${userId}/getGoal`);
  return data;
}

export async function setGoal(userId, goal) {
  const { data } = await client.post(`/user/${userId}/setGoal`, goal);
  return data;
}

export async function autoSetGoal(userId) {
  const { data } = await client.post(`/user/${userId}/autoSetGoal`);
  return data;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/auth.js frontend/src/api/meals.js frontend/src/api/profile.js
git commit -m "feat(api): add auth/meals/profile API wrappers"
```

---

## Task 5: Button primitive

**Files:**
- Create: `frontend/src/components/Button.jsx`
- Create: `frontend/src/components/Button.module.css`

- [ ] **Step 1: Write Button.jsx**

```jsx
// frontend/src/components/Button.jsx
import React from 'react';
import styles from './Button.module.css';

/**
 * Button primitive. Variants:
 *   - primary  (default) — solid accent
 *   - secondary          — outlined
 *   - danger             — solid red
 *   - ghost              — transparent
 * Pass `block` for full-width.
 */
export default function Button({
  variant = 'primary',
  block = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  const classes = [styles.button, styles[variant], block ? styles.block : '', className]
    .filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Write Button.module.css**

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  min-height: 44px; /* iOS tap-target */
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.button:disabled { opacity: 0.5; cursor: not-allowed; }

.block { width: 100%; }

.primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}
.primary:hover:not(:disabled) { background: var(--color-accent-hover); }

.secondary {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}
.secondary:hover:not(:disabled) { background: var(--color-surface-2); }

.danger {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}
.danger:hover:not(:disabled) { background: var(--color-danger-hover); }

.ghost {
  background: transparent;
  color: var(--color-text);
}
.ghost:hover:not(:disabled) { background: var(--color-surface-2); }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Button.jsx frontend/src/components/Button.module.css
git commit -m "feat(components): add Button primitive"
```

---

## Task 6: Field primitive (input + label + error)

**Files:**
- Create: `frontend/src/components/Field.jsx`
- Create: `frontend/src/components/Field.module.css`

- [ ] **Step 1: Write Field.jsx**

```jsx
// frontend/src/components/Field.jsx
import React, { useId } from 'react';
import styles from './Field.module.css';

/**
 * Labeled form field with inline error slot.
 * Pass `as="select"` to render a select with <option> children.
 */
export default function Field({
  label,
  error,
  as = 'input',
  className,
  children,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const Tag = as;
  const inputClass = [styles.input, error ? styles.inputError : ''].filter(Boolean).join(' ');
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <Tag id={id} className={inputClass} aria-invalid={!!error} {...rest}>
        {children}
      </Tag>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write Field.module.css**

```css
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 16px; /* prevents iOS zoom */
  min-height: 44px;
  transition: border-color 0.15s ease;
}

.input:focus { border-color: var(--color-accent); outline: none; }

.inputError { border-color: var(--color-danger); }

.error {
  margin-top: var(--space-1);
  color: var(--color-danger);
  font-size: 13px;
}

select.input {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--color-text-muted) 50%),
                    linear-gradient(135deg, var(--color-text-muted) 50%, transparent 50%);
  background-position: calc(100% - 18px) center, calc(100% - 13px) center;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: var(--space-7);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Field.jsx frontend/src/components/Field.module.css
git commit -m "feat(components): add Field primitive (input/select with label + error)"
```

---

## Task 7: PasswordField primitive (Field + eye toggle)

**Files:**
- Create: `frontend/src/components/PasswordField.jsx`
- Create: `frontend/src/components/PasswordField.module.css`

- [ ] **Step 1: Write PasswordField.jsx**

```jsx
// frontend/src/components/PasswordField.jsx
import React, { useId, useState } from 'react';
import fieldStyles from './Field.module.css';
import styles from './PasswordField.module.css';

export default function PasswordField({ label, error, id: providedId, ...rest }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const [visible, setVisible] = useState(false);

  const inputClass = [fieldStyles.input, styles.input, error ? fieldStyles.inputError : '']
    .filter(Boolean).join(' ');

  return (
    <div className={fieldStyles.field}>
      {label && <label className={fieldStyles.label} htmlFor={id}>{label}</label>}
      <div className={styles.wrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={inputClass}
          aria-invalid={!!error}
          {...rest}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? '🙈' : '👁'}
        </button>
      </div>
      {error && <p className={fieldStyles.error} role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write PasswordField.module.css**

```css
.wrap { position: relative; }

.input { padding-right: var(--space-7); }

.toggle {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  font-size: 18px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
.toggle:hover { color: var(--color-text); }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PasswordField.jsx frontend/src/components/PasswordField.module.css
git commit -m "feat(components): add PasswordField with eye toggle"
```

---

## Task 8: ErrorBanner + ReminderDot

**Files:**
- Create: `frontend/src/components/ErrorBanner.jsx`
- Create: `frontend/src/components/ErrorBanner.module.css`
- Create: `frontend/src/components/ReminderDot.jsx`
- Create: `frontend/src/components/ReminderDot.module.css`

- [ ] **Step 1: ErrorBanner.jsx**

```jsx
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
```

- [ ] **Step 2: ErrorBanner.module.css**

```css
.banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: color-mix(in srgb, var(--color-danger) 12%, var(--color-surface));
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-size: 14px;
}

.text { flex: 1; }

.close {
  background: transparent;
  border: 0;
  color: inherit;
  font-size: 22px;
  line-height: 1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 3: ReminderDot.jsx**

```jsx
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
```

- [ ] **Step 4: ReminderDot.module.css**

```css
.dot {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-danger);
  color: var(--color-text-inverse);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ErrorBanner.* frontend/src/components/ReminderDot.*
git commit -m "feat(components): add ErrorBanner and ReminderDot"
```

---

## Task 9: Sheet primitive (bottom sheet / centered modal)

**Files:**
- Create: `frontend/src/components/Sheet.jsx`
- Create: `frontend/src/components/Sheet.module.css`

- [ ] **Step 1: Sheet.jsx**

```jsx
// frontend/src/components/Sheet.jsx
import React, { useEffect } from 'react';
import styles from './Sheet.module.css';

/**
 * Mobile: slides up from bottom. Desktop (>= 768px): renders as a
 * centered modal. Backdrop click and Escape close it. Caller controls
 * `isOpen` and `onClose`. Body scroll is locked while open.
 */
export default function Sheet({ isOpen, onClose, title, children, footer }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.handle} aria-hidden="true" />
        {title && (
          <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sheet.module.css**

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: var(--z-sheet-backdrop);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.18s ease-out;
}

.sheet {
  position: relative;
  width: 100%;
  max-height: 90vh;
  background: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-lg);
  z-index: var(--z-sheet);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.22s ease-out;
  padding-bottom: var(--safe-area-bottom);
}

.handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  margin: var(--space-3) auto var(--space-2);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.title { flex: 1; font-size: 16px; }

.close {
  background: transparent;
  border: 0;
  color: var(--color-text-muted);
  font-size: 28px;
  line-height: 1;
  width: 36px;
  height: 36px;
}

.body { padding: var(--space-4); overflow-y: auto; flex: 1; }

.footer {
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}

@media (min-width: 768px) {
  .backdrop { align-items: center; }
  .sheet {
    max-width: 460px;
    border-radius: var(--radius-lg);
    max-height: min(80vh, 640px);
  }
  .handle { display: none; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@media (min-width: 768px) {
  @keyframes slideUp {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sheet.*
git commit -m "feat(components): add Sheet primitive (bottom on mobile, modal on desktop)"
```

---

## Task 10: Tabs primitive (in-page tabs)

**Files:**
- Create: `frontend/src/components/Tabs.jsx`
- Create: `frontend/src/components/Tabs.module.css`

- [ ] **Step 1: Tabs.jsx**

```jsx
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
```

- [ ] **Step 2: Tabs.module.css**

```css
.tabs {
  display: flex;
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  gap: var(--space-1);
}

.tab {
  flex: 1;
  padding: var(--space-3);
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease, color 0.15s ease;
  min-height: 40px;
}

.tab:hover { color: var(--color-text); }

.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Tabs.*
git commit -m "feat(components): add Tabs primitive"
```

---

## Task 11: ConfirmDialog primitive

**Files:**
- Create: `frontend/src/components/ConfirmDialog.jsx`
- Create: `frontend/src/components/ConfirmDialog.module.css`

- [ ] **Step 1: ConfirmDialog.jsx**

```jsx
// frontend/src/components/ConfirmDialog.jsx
import React from 'react';
import Sheet from './Sheet';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" block onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            block
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {message && <p className={styles.message}>{message}</p>}
    </Sheet>
  );
}
```

- [ ] **Step 2: ConfirmDialog.module.css**

```css
.message { color: var(--color-text); font-size: 15px; }

.actions {
  display: flex;
  gap: var(--space-3);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ConfirmDialog.*
git commit -m "feat(components): add ConfirmDialog (Sheet + Button composition)"
```

---

## Task 12: dateFormat helpers (TDD — pure logic)

**Files:**
- Create: `frontend/src/features/today/dateFormat.js`
- Create: `frontend/src/__tests__/dateFormat.test.js`

These functions replace the locale-dependent `new Date().toLocaleDateString()` bug.

- [ ] **Step 1: Write the failing tests**

```javascript
// frontend/src/__tests__/dateFormat.test.js
import {
  formatBackendDate, parseBackendDate, formatHumanDate,
  isToday, isFuture, addDays,
} from '../features/today/dateFormat';

describe('formatBackendDate', () => {
  test('formats 2026-05-30 as 30/05/2026', () => {
    expect(formatBackendDate(new Date(2026, 4, 30))).toBe('30/05/2026');
  });
  test('zero-pads single digits', () => {
    expect(formatBackendDate(new Date(2026, 0, 3))).toBe('03/01/2026');
  });
});

describe('parseBackendDate', () => {
  test('parses dd/MM/yyyy', () => {
    const d = parseBackendDate('03/01/2026');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(3);
  });
  test('throws on invalid format', () => {
    expect(() => parseBackendDate('2026-01-03')).toThrow();
  });
});

describe('formatHumanDate', () => {
  test('formats as "Sat, May 30"', () => {
    // 2026-05-30 is a Saturday
    expect(formatHumanDate(new Date(2026, 4, 30))).toBe('Sat, May 30');
  });
});

describe('isToday', () => {
  test('returns true for now', () => {
    expect(isToday(new Date())).toBe(true);
  });
  test('returns false for yesterday', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(isToday(y)).toBe(false);
  });
});

describe('isFuture', () => {
  test('false for today', () => {
    expect(isFuture(new Date())).toBe(false);
  });
  test('true for tomorrow', () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    expect(isFuture(t)).toBe(true);
  });
});

describe('addDays', () => {
  test('adds positive days', () => {
    const d = addDays(new Date(2026, 4, 30), 1);
    expect(d.getDate()).toBe(31);
  });
  test('subtracts negative days', () => {
    const d = addDays(new Date(2026, 4, 30), -1);
    expect(d.getDate()).toBe(29);
  });
  test('does not mutate input', () => {
    const orig = new Date(2026, 4, 30);
    addDays(orig, 5);
    expect(orig.getDate()).toBe(30);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL** (file doesn't exist)

```bash
cd frontend && npm test -- --watchAll=false dateFormat 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement dateFormat.js**

```javascript
// frontend/src/features/today/dateFormat.js
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n) => String(n).padStart(2, '0');

/** Backend's UserMealsController formatter is "dd/MM/yyyy". */
export function formatBackendDate(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function parseBackendDate(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (!m) throw new Error(`Invalid backend date: ${str}`);
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** "Sat, May 30" — readable, locale-independent. */
export function formatHumanDate(date) {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear()
      && date.getMonth() === t.getMonth()
      && date.getDate() === t.getDate();
}

export function isFuture(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

export function addDays(date, days) {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --watchAll=false dateFormat 2>&1 | tail -10
```

Expected: 6 test suites pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/today/dateFormat.js frontend/src/__tests__/dateFormat.test.js
git commit -m "feat(today): add dateFormat helpers (replaces locale-dependent date code)"
```

---

## Task 13: Form validation helpers (TDD — pure logic)

**Files:**
- Create: `frontend/src/features/auth/validation.js`
- Create: `frontend/src/__tests__/validation.test.js`

- [ ] **Step 1: Write tests**

```javascript
// frontend/src/__tests__/validation.test.js
import { validateRegister, validateLogin, validateChangePassword } from '../features/auth/validation';

describe('validateRegister', () => {
  test('all valid → no errors', () => {
    expect(validateRegister({
      name: 'Stoyan', age: '25', gender: 'MALE', weight: '75',
      height: '180', username: 'stoyan', password: 'secret123',
    })).toEqual({});
  });
  test('missing name', () => {
    const e = validateRegister({ name: '', age: '25', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e.name).toBeTruthy();
  });
  test('age out of range', () => {
    const e = validateRegister({ name: 'a', age: '0', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e.age).toBeTruthy();
    const e2 = validateRegister({ name: 'a', age: '200', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e2.age).toBeTruthy();
  });
  test('gender required', () => {
    const e = validateRegister({ name: 'a', age: '25', gender: '',
      weight: '75', height: '180', username: 'a', password: 'secret123' });
    expect(e.gender).toBeTruthy();
  });
  test('password too short', () => {
    const e = validateRegister({ name: 'a', age: '25', gender: 'MALE',
      weight: '75', height: '180', username: 'a', password: '123' });
    expect(e.password).toBeTruthy();
  });
});

describe('validateLogin', () => {
  test('valid', () => {
    expect(validateLogin({ username: 'a', password: 'b' })).toEqual({});
  });
  test('missing username', () => {
    expect(validateLogin({ username: '', password: 'b' }).username).toBeTruthy();
  });
});

describe('validateChangePassword', () => {
  test('valid', () => {
    expect(validateChangePassword({ newPassword: 'secret123', confirm: 'secret123' })).toEqual({});
  });
  test('mismatch', () => {
    const e = validateChangePassword({ newPassword: 'secret123', confirm: 'secret124' });
    expect(e.confirm).toBeTruthy();
  });
  test('too short', () => {
    expect(validateChangePassword({ newPassword: 'a', confirm: 'a' }).newPassword).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --watchAll=false validation 2>&1 | tail -10
```

- [ ] **Step 3: Implement validation.js**

```javascript
// frontend/src/features/auth/validation.js
const MIN_PASSWORD = 6;

const required = (v) => v && String(v).trim().length > 0;
const numberInRange = (v, min, max) => {
  const n = parseFloat(v);
  return !Number.isNaN(n) && n >= min && n <= max;
};

export function validateRegister(form) {
  const e = {};
  if (!required(form.name)) e.name = 'Name is required';
  if (!numberInRange(form.age, 1, 120)) e.age = 'Enter a valid age (1–120)';
  if (!required(form.gender)) e.gender = 'Select a gender';
  if (!numberInRange(form.weight, 1, 500)) e.weight = 'Enter a valid weight (kg)';
  if (!numberInRange(form.height, 1, 300)) e.height = 'Enter a valid height (cm)';
  if (!required(form.username)) e.username = 'Username is required';
  if (!form.password || form.password.length < MIN_PASSWORD) {
    e.password = `Password must be at least ${MIN_PASSWORD} characters`;
  }
  return e;
}

export function validateLogin(form) {
  const e = {};
  if (!required(form.username)) e.username = 'Username is required';
  if (!required(form.password)) e.password = 'Password is required';
  return e;
}

export function validateChangePassword(form) {
  const e = {};
  if (!form.newPassword || form.newPassword.length < MIN_PASSWORD) {
    e.newPassword = `Password must be at least ${MIN_PASSWORD} characters`;
  }
  if (form.newPassword !== form.confirm) {
    e.confirm = 'Passwords do not match';
  }
  return e;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- --watchAll=false validation 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/validation.js frontend/src/__tests__/validation.test.js
git commit -m "feat(auth): add form validation helpers"
```

---

## Task 14: weeklyAverages + reminders helpers (TDD)

**Files:**
- Create: `frontend/src/features/profile/weeklyAverages.js`
- Create: `frontend/src/features/profile/reminders.js`
- Create: `frontend/src/__tests__/weeklyAverages.test.js`
- Create: `frontend/src/__tests__/reminders.test.js`

These extract logic that's currently inline in `UserProfile.js` so it's testable.

- [ ] **Step 1: Write weeklyAverages.test.js**

```javascript
// frontend/src/__tests__/weeklyAverages.test.js
import { computeWeeklyAverages } from '../features/profile/weeklyAverages';

describe('computeWeeklyAverages', () => {
  test('empty input → all null', () => {
    expect(computeWeeklyAverages([])).toEqual({ thisWeek: null, lastWeek: null, diff: null });
  });

  test('only this week → lastWeek null, diff null', () => {
    const records = [
      { date: '2026-05-25', weight: 80 }, // Mon
      { date: '2026-05-26', weight: 80.5 },
    ];
    const r = computeWeeklyAverages(records);
    expect(r.thisWeek).toBeCloseTo(80.25);
    expect(r.lastWeek).toBeNull();
    expect(r.diff).toBeNull();
  });

  test('this and last week → diff is thisWeek - lastWeek', () => {
    // Anchor: 2026-05-30 (Sat). ISO week starts Mon 2026-05-25.
    // Last week: 2026-05-18 .. 2026-05-24.
    const records = [
      { date: '2026-05-19', weight: 80 },
      { date: '2026-05-20', weight: 80 },
      { date: '2026-05-26', weight: 79 },
      { date: '2026-05-30', weight: 79 },
    ];
    const r = computeWeeklyAverages(records);
    expect(r.thisWeek).toBeCloseTo(79);
    expect(r.lastWeek).toBeCloseTo(80);
    expect(r.diff).toBeCloseTo(-1);
  });
});
```

- [ ] **Step 2: Write reminders.test.js**

```javascript
// frontend/src/__tests__/reminders.test.js
import { needsWeightReminder, needsMeasurementReminder } from '../features/profile/reminders';

describe('needsWeightReminder', () => {
  test('null/undefined → false', () => {
    expect(needsWeightReminder(null)).toBe(false);
    expect(needsWeightReminder(undefined)).toBe(false);
  });
  test('today → false', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(needsWeightReminder(today)).toBe(false);
  });
  test('yesterday or earlier → true', () => {
    const y = new Date(); y.setDate(y.getDate() - 2);
    expect(needsWeightReminder(y.toISOString().slice(0, 10))).toBe(true);
  });
});

describe('needsMeasurementReminder', () => {
  test('null → false', () => {
    expect(needsMeasurementReminder(null)).toBe(false);
  });
  test('within last 6 days → false', () => {
    const d = new Date(); d.setDate(d.getDate() - 5);
    expect(needsMeasurementReminder(d.toISOString().slice(0, 10))).toBe(false);
  });
  test('7+ days ago → true', () => {
    const d = new Date(); d.setDate(d.getDate() - 8);
    expect(needsMeasurementReminder(d.toISOString().slice(0, 10))).toBe(true);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
npm test -- --watchAll=false weeklyAverages reminders 2>&1 | tail -10
```

- [ ] **Step 4: Implement weeklyAverages.js**

Take the existing `computeWeeklyAverages` from `UserProfile.js:428-505` and lift it. The behaviour is preserved:

```javascript
// frontend/src/features/profile/weeklyAverages.js

const toMidnight = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

const startOfISOWeek = (d) => {
  const x = toMidnight(d);
  const day = x.getDay() || 7; // Sun=0 -> 7
  x.setDate(x.getDate() - (day - 1));
  return x;
};

const formatWeekRange = (start, end) => {
  const pad = (n) => String(n).padStart(2, '0');
  const sDay = pad(start.getDate());
  const sMonth = pad(start.getMonth() + 1);
  const eDay = pad(end.getDate());
  const eMonth = pad(end.getMonth() + 1);
  return `${sDay}-${eDay}.${sMonth}.${start.getFullYear()}`;
};

const parseDateLoose = (s) => {
  if (s == null) return null;
  if (s instanceof Date && !isNaN(s)) return toMidnight(s);
  if (typeof s !== 'string') return null;
  const str = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return toMidnight(new Date(`${str}T00:00:00`));
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return toMidnight(new Date(str.replace(' ', 'T')));
  }
  let m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(str);
  if (m) { const [, dd, mm, yyyy] = m; return toMidnight(new Date(`${yyyy}-${mm}-${dd}T00:00:00`)); }
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (m) { const [, dd, mm, yyyy] = m; return toMidnight(new Date(`${yyyy}-${mm}-${dd}T00:00:00`)); }
  const d = new Date(str.replace(' ', 'T'));
  return isNaN(d) ? null : toMidnight(d);
};

export function computeWeeklyAverages(records) {
  if (!records || records.length === 0) {
    return { thisWeek: null, lastWeek: null, diff: null };
  }

  const parsed = [];
  for (const r of records) {
    const d = parseDateLoose(r?.date);
    const w = parseFloat(r?.weight);
    if (d && !Number.isNaN(w)) parsed.push({ d, w });
  }
  if (!parsed.length) return { thisWeek: null, lastWeek: null, diff: null };

  const latestDate = new Date(Math.max(...parsed.map((p) => +p.d)));
  const startThis = startOfISOWeek(latestDate);
  const endThis = new Date(startThis); endThis.setDate(startThis.getDate() + 7);
  const startLast = new Date(startThis); startLast.setDate(startThis.getDate() - 7);
  const endLast = new Date(startThis);

  const thisWeek = [];
  const lastWeek = [];
  for (const p of parsed) {
    if (p.d >= startThis && p.d < endThis) thisWeek.push(p.w);
    else if (p.d >= startLast && p.d < endLast) lastWeek.push(p.w);
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const aThis = avg(thisWeek);
  const aLast = avg(lastWeek);
  const diff = aThis != null && aLast != null ? aThis - aLast : null;

  return {
    thisWeek: aThis,
    lastWeek: aLast,
    diff,
    rangeThis: formatWeekRange(startThis, new Date(endThis.getTime() - 1)),
    rangeLast: formatWeekRange(startLast, new Date(endLast.getTime() - 1)),
  };
}
```

- [ ] **Step 5: Implement reminders.js**

```javascript
// frontend/src/features/profile/reminders.js

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
};

export function needsWeightReminder(lastDateStr) {
  const days = daysSince(lastDateStr);
  return days != null && days >= 1;
}

export function needsMeasurementReminder(lastDateStr) {
  const days = daysSince(lastDateStr);
  return days != null && days >= 7;
}
```

- [ ] **Step 6: Run — expect PASS**

```bash
npm test -- --watchAll=false weeklyAverages reminders 2>&1 | tail -10
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/profile/weeklyAverages.js \
        frontend/src/features/profile/reminders.js \
        frontend/src/__tests__/weeklyAverages.test.js \
        frontend/src/__tests__/reminders.test.js
git commit -m "feat(profile): extract weeklyAverages + reminders helpers (TDD)"
```

---

## Task 15: AppShell with bottom tab bar

**Files:**
- Create: `frontend/src/components/AppShell.jsx`
- Create: `frontend/src/components/AppShell.module.css`

- [ ] **Step 1: AppShell.jsx**

```jsx
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
```

- [ ] **Step 2: AppShell.module.css**

```css
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
  padding-bottom: calc(var(--tab-bar-height) + var(--safe-area-bottom));
}

.tabBar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-tab-bar);
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  height: calc(var(--tab-bar-height) + var(--safe-area-bottom));
  padding-bottom: var(--safe-area-bottom);
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

@media (min-width: 768px) {
  .shell { flex-direction: column; }
  .main { padding-bottom: 0; padding-top: var(--tab-bar-height); }
  .tabBar {
    position: sticky;
    top: 0;
    bottom: auto;
    height: var(--tab-bar-height);
    padding-bottom: 0;
    justify-content: center;
    gap: var(--space-5);
    border-top: 0;
    border-bottom: 1px solid var(--color-border);
  }
  .tab { flex: 0 0 auto; flex-direction: row; gap: var(--space-2); padding: 0 var(--space-4); }
  .icon { font-size: 18px; }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AppShell.*
git commit -m "feat(components): add AppShell with bottom tab bar / desktop top bar"
```

---

## Task 16: RegisterPage

**Files:**
- Create: `frontend/src/features/auth/RegisterPage.jsx`
- Create: `frontend/src/features/auth/RegisterPage.module.css`

- [ ] **Step 1: RegisterPage.jsx**

```jsx
// frontend/src/features/auth/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth';
import { setToken, setUserId } from '../../auth/storage';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { validateRegister } from './validation';
import styles from './RegisterPage.module.css';

const EMPTY = {
  name: '', age: '', gender: '', weight: '', height: '',
  username: '', password: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validateRegister(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const { token, userId } = await authApi.register({
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        weight: Number(form.weight),
        height: Number(form.height),
        username: form.username,
        password: form.password,
      });
      setToken(token);
      setUserId(userId);
      navigate('/today');
    } catch (err) {
      setServerError(err.message || 'Registration failed');
      if (err.fieldErrors) setErrors(err.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Field label="Name" value={form.name} onChange={update('name')}
                 error={errors.name} autoComplete="name" />
          <Field label="Age" type="number" value={form.age} onChange={update('age')}
                 error={errors.age} min="1" />
          <Field label="Gender" as="select" value={form.gender} onChange={update('gender')}
                 error={errors.gender}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Field>
          <Field label="Weight (kg)" type="number" step="0.1" value={form.weight}
                 onChange={update('weight')} error={errors.weight} min="1" />
          <Field label="Height (cm)" type="number" value={form.height}
                 onChange={update('height')} error={errors.height} min="1" />
          <Field label="Username" value={form.username} onChange={update('username')}
                 error={errors.username} autoComplete="username" />
          <PasswordField label="Password" value={form.password} onChange={update('password')}
                         error={errors.password} autoComplete="new-password" />
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className={styles.foot}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: RegisterPage.module.css**

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-5) var(--space-4);
  background: var(--color-bg);
}

.card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}

.title {
  margin-bottom: var(--space-5);
  font-size: 22px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.foot {
  margin-top: var(--space-5);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/RegisterPage.*
git commit -m "feat(auth): add RegisterPage with inline validation and auto-login"
```

---

## Task 17: LoginPage

**Files:**
- Create: `frontend/src/features/auth/LoginPage.jsx`
- Create: `frontend/src/features/auth/LoginPage.module.css`

- [ ] **Step 1: LoginPage.jsx**

```jsx
// frontend/src/features/auth/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth';
import { setToken, setUserId } from '../../auth/storage';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { validateLogin } from './validation';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validateLogin(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const { token, userId } = await authApi.login(form);
      setToken(token);
      setUserId(userId);
      navigate('/today');
    } catch (err) {
      setServerError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Field label="Username" value={form.username} onChange={update('username')}
                 error={errors.username} autoComplete="username" />
          <PasswordField label="Password" value={form.password} onChange={update('password')}
                         error={errors.password} autoComplete="current-password" />
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className={styles.foot}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: LoginPage.module.css**

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5) var(--space-4);
  background: var(--color-bg);
}

.card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}

.title { margin-bottom: var(--space-5); font-size: 22px; }
.form { display: flex; flex-direction: column; gap: var(--space-4); }
.foot {
  margin-top: var(--space-5);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/LoginPage.*
git commit -m "feat(auth): add LoginPage with inline validation"
```

---

## Task 18: macroMath helpers (TDD) + MacroRings component

**Files:**
- Create: `frontend/src/components/macroMath.js`
- Create: `frontend/src/__tests__/macroMath.test.js`
- Create: `frontend/src/components/MacroRings.jsx`
- Create: `frontend/src/components/MacroRings.module.css`

- [ ] **Step 1: Write macroMath tests**

```javascript
// frontend/src/__tests__/macroMath.test.js
import { ringDashOffset, statusForPercent } from '../components/macroMath';

describe('ringDashOffset', () => {
  test('0% → full circumference', () => {
    expect(ringDashOffset(0, 100, 100)).toBeCloseTo(100);
  });
  test('100% → 0', () => {
    expect(ringDashOffset(100, 100, 100)).toBeCloseTo(0);
  });
  test('150% → 0 (clamped, ring stays full)', () => {
    expect(ringDashOffset(150, 100, 100)).toBeCloseTo(0);
  });
  test('zero goal → full circumference (no fill)', () => {
    expect(ringDashOffset(50, 0, 100)).toBeCloseTo(100);
  });
});

describe('statusForPercent', () => {
  test('under 100 → "under"', () => {
    expect(statusForPercent(0, 100)).toBe('under');
    expect(statusForPercent(99, 100)).toBe('under');
  });
  test('100 to 105 → "near"', () => {
    expect(statusForPercent(100, 100)).toBe('near');
    expect(statusForPercent(105, 100)).toBe('near');
  });
  test('above 105 → "over"', () => {
    expect(statusForPercent(106, 100)).toBe('over');
    expect(statusForPercent(200, 100)).toBe('over');
  });
  test('zero goal → "under"', () => {
    expect(statusForPercent(50, 0)).toBe('under');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement macroMath.js**

```javascript
// frontend/src/components/macroMath.js
/**
 * Compute SVG stroke-dashoffset for a progress ring.
 * @param {number} value      Eaten amount.
 * @param {number} goal       Daily goal.
 * @param {number} circumference   2 * pi * r of the ring.
 * @returns {number} dashoffset in user units. 0 = full ring; circumference = empty.
 */
export function ringDashOffset(value, goal, circumference) {
  if (!goal || goal <= 0) return circumference;
  const pct = Math.min(value / goal, 1);
  return circumference * (1 - pct);
}

/** Used for color-coding. Mirrors the original CaloriesCalculator over-limit logic. */
export function statusForPercent(value, goal) {
  if (!goal || goal <= 0) return 'under';
  const pct = (value / goal) * 100;
  if (pct > 105) return 'over';
  if (pct >= 100) return 'near';
  return 'under';
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Implement MacroRings.jsx**

```jsx
// frontend/src/components/MacroRings.jsx
import React, { useEffect, useState } from 'react';
import styles from './MacroRings.module.css';
import { ringDashOffset, statusForPercent } from './macroMath';

const STORAGE_KEY = 'caloriescalc:macros-expanded';

const COLOR_VARS = {
  calories: '--color-calories',
  protein: '--color-protein',
  carbs: '--color-carbs',
  fat: '--color-fat',
};

function statusColor(metricKey, status) {
  if (status === 'over') return 'var(--color-danger)';
  if (status === 'near') return 'var(--color-success)';
  return `var(${COLOR_VARS[metricKey]})`;
}

/**
 * Concentric (default) or expanded 2x2 grid of rings.
 * Click anywhere on the rings to toggle. Choice persists in localStorage.
 *
 * Props:
 *   totals: { calories, protein, carbs, fat }   (numbers, eaten amounts)
 *   goals:  { calories, protein, carbs, fat }   (numbers, daily goals)
 */
export default function MacroRings({ totals, goals }) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0'); } catch {}
  }, [expanded]);

  const metrics = [
    { key: 'calories', label: 'CALORIES', value: totals.calories || 0, goal: goals.calories || 0, unit: 'kcal' },
    { key: 'protein',  label: 'PROTEIN',  value: totals.protein  || 0, goal: goals.protein  || 0, unit: 'g' },
    { key: 'carbs',    label: 'CARBS',    value: totals.carbs    || 0, goal: goals.carbs    || 0, unit: 'g' },
    { key: 'fat',      label: 'FAT',      value: totals.fat      || 0, goal: goals.fat      || 0, unit: 'g' },
  ];

  return (
    <div
      className={[styles.root, expanded ? styles.expanded : styles.collapsed].join(' ')}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      aria-pressed={expanded}
      aria-label={expanded ? 'Collapse macro rings' : 'Expand macro rings'}
    >
      {expanded
        ? <ExpandedGrid metrics={metrics} />
        : <ConcentricRings metrics={metrics} />}
      <p className={styles.hint}>
        {expanded ? 'Tap to collapse ⌃' : 'Tap to expand ⌄'}
      </p>
    </div>
  );
}

function ConcentricRings({ metrics }) {
  const STROKE = 11;
  const radii = [78, 62, 46, 30]; // outer → inner
  const size = 180;
  const center = size / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={styles.concentricSvg}
      aria-hidden="true"
    >
      {metrics.map((m, i) => {
        const r = radii[i];
        const c = 2 * Math.PI * r;
        const status = statusForPercent(m.value, m.goal);
        const color = statusColor(m.key, status);
        return (
          <g key={m.key} transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={r}
                    fill="none" stroke="var(--color-track)" strokeWidth={STROKE} />
            <circle cx={center} cy={center} r={r}
                    fill="none" stroke={color} strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={ringDashOffset(m.value, m.goal, c)} />
          </g>
        );
      })}
    </svg>
  );
}

function ExpandedGrid({ metrics }) {
  const STROKE = 7;
  const r = 44;
  const size = 100;
  const c = 2 * Math.PI * r;
  return (
    <div className={styles.grid}>
      {metrics.map((m) => {
        const status = statusForPercent(m.value, m.goal);
        const color = statusColor(m.key, status);
        return (
          <div key={m.key} className={styles.cell}>
            <div className={styles.ringWrap}>
              <svg viewBox={`0 0 ${size} ${size}`} className={styles.cellSvg}>
                <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                  <circle cx={size/2} cy={size/2} r={r}
                          fill="none" stroke="var(--color-track)" strokeWidth={STROKE} />
                  <circle cx={size/2} cy={size/2} r={r}
                          fill="none" stroke={color} strokeWidth={STROKE}
                          strokeLinecap="round"
                          strokeDasharray={c}
                          strokeDashoffset={ringDashOffset(m.value, m.goal, c)} />
                </g>
              </svg>
              <div className={styles.cellNumbers}>
                <div className={styles.cellValue}>
                  {Math.round(m.value)}{m.unit !== 'kcal' && <span className={styles.cellUnit}>{m.unit}</span>}
                </div>
                <div className={styles.cellGoal}>
                  / {Math.round(m.goal)}{m.unit === 'kcal' ? '' : m.unit}
                </div>
              </div>
            </div>
            <div className={styles.cellLabel}>{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: MacroRings.module.css**

```css
.root {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  cursor: pointer;
  user-select: none;
  transition: all 0.25s ease;
}

.collapsed { text-align: center; }
.expanded { padding: var(--space-4); }

.concentricSvg {
  width: 100%;
  max-width: 240px;
  height: auto;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.cell {
  text-align: center;
}

.ringWrap {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto;
}

.cellSvg { width: 100%; height: 100%; }

.cellNumbers {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.cellValue { font-size: 18px; font-weight: 700; line-height: 1; color: var(--color-text); }
.cellUnit  { font-size: 12px; color: var(--color-text-muted); margin-left: 1px; }
.cellGoal  { margin-top: 2px; font-size: 11px; color: var(--color-text-muted); }
.cellLabel {
  margin-top: var(--space-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

.hint {
  margin-top: var(--space-3);
  text-align: center;
  font-size: 11px;
  color: var(--color-text-muted);
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/MacroRings.* \
        frontend/src/components/macroMath.js \
        frontend/src/__tests__/macroMath.test.js
git commit -m "feat(components): add MacroRings (concentric + expanded grid, persistent)"
```

---

## Task 19: DayPicker

**Files:**
- Create: `frontend/src/components/DayPicker.jsx`
- Create: `frontend/src/components/DayPicker.module.css`

- [ ] **Step 1: DayPicker.jsx**

```jsx
// frontend/src/components/DayPicker.jsx
import React, { useRef } from 'react';
import { addDays, formatHumanDate, isToday, isFuture } from '../features/today/dateFormat';
import styles from './DayPicker.module.css';

/**
 * Header day picker. Caller owns the selected date and the change handler.
 *
 *   ‹  Sat, May 30  ›   [Today]
 *
 * - Left arrow → previous day
 * - Right arrow → next day (disabled if would be in future)
 * - Tap centre date → opens hidden <input type=date> picker
 * - "Today" pill appears when not on today
 */
export default function DayPicker({ value, onChange }) {
  const inputRef = useRef(null);

  const goPrev = () => onChange(addDays(value, -1));
  const goNext = () => { const next = addDays(value, 1); if (!isFuture(next)) onChange(next); };
  const goToday = () => onChange(new Date());

  const handlePickerChange = (e) => {
    const v = e.target.value; // YYYY-MM-DD
    if (!v) return;
    const [y, m, d] = v.split('-').map(Number);
    onChange(new Date(y, m - 1, d));
  };

  const isoValue = `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  const today = isToday(value);
  const nextDisabled = isFuture(addDays(value, 1));

  return (
    <div className={styles.bar}>
      <button onClick={goPrev} className={styles.arrow} aria-label="Previous day">‹</button>
      <button
        className={styles.dateBtn}
        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.click()}
      >
        <span className={styles.date}>{formatHumanDate(value)}</span>
        {today && <span className={styles.todayLabel}>Today</span>}
        <input
          ref={inputRef}
          type="date"
          value={isoValue}
          onChange={handlePickerChange}
          className={styles.hiddenInput}
          aria-label="Pick a date"
        />
      </button>
      <button
        onClick={goNext}
        className={styles.arrow}
        disabled={nextDisabled}
        aria-label="Next day"
      >›</button>
      {!today && (
        <button className={styles.pill} onClick={goToday}>Today</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: DayPicker.module.css**

```css
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
}

.arrow {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 24px;
  border-radius: var(--radius-pill);
}
.arrow:disabled { opacity: 0.3; cursor: not-allowed; }
.arrow:hover:not(:disabled) { background: var(--color-surface-2); color: var(--color-text); }

.dateBtn {
  flex: 1;
  position: relative;
  background: transparent;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2);
  border-radius: var(--radius-md);
}
.dateBtn:hover { background: var(--color-surface-2); }

.date { font-size: 16px; font-weight: 600; color: var(--color-text); }
.todayLabel { font-size: 11px; color: var(--color-text-muted); }

.hiddenInput {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.pill {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-2);
  border: 0;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DayPicker.*
git commit -m "feat(components): add DayPicker with arrows + native date input"
```

---

## Task 20: MealCard (tap-to-expand inline editor)

**Files:**
- Create: `frontend/src/features/today/MealCard.jsx`
- Create: `frontend/src/features/today/MealCard.module.css`

- [ ] **Step 1: MealCard.jsx**

```jsx
// frontend/src/features/today/MealCard.jsx
import React, { useState } from 'react';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import styles from './MealCard.module.css';

/**
 * Renders one meal as a card. Tapping the card opens an inline editor
 * with grams input and Save/Delete buttons. Only one card on the page
 * is expanded at a time — the parent enforces this via `expanded`.
 */
export default function MealCard({ meal, expanded, onExpand, onSave, onDelete }) {
  const [grams, setGrams] = useState(String(meal.quantity));
  const [confirming, setConfirming] = useState(false);

  // Reset grams when collapsing or when the meal changes
  React.useEffect(() => {
    if (!expanded) setGrams(String(meal.quantity));
  }, [expanded, meal.quantity]);

  const p = meal.product;
  const factor = (Number(grams) || meal.quantity) / 100;
  const kcal = p.caloriesPer100Grams * (meal.quantity / 100);
  const protein = p.proteinPer100Grams * (meal.quantity / 100);
  const carbs = p.carbsPer100Grams * (meal.quantity / 100);
  const fat = p.fatPer100Grams * (meal.quantity / 100);

  const handleSave = async () => {
    const n = parseFloat(grams);
    if (Number.isNaN(n) || n <= 0) return;
    await onSave(n);
  };

  const previewKcal = Math.round(p.caloriesPer100Grams * factor);

  return (
    <div className={[styles.card, expanded ? styles.expanded : ''].join(' ')}>
      <button className={styles.summary} onClick={onExpand}>
        <div className={styles.left}>
          <div className={styles.name}>{p.name}</div>
          <div className={styles.sub}>{meal.quantity}g · {Math.round(kcal)} kcal</div>
        </div>
        <div className={styles.right}>
          <div className={styles.macros}>
            P {protein.toFixed(1)} · C {carbs.toFixed(1)} · F {fat.toFixed(1)}
          </div>
        </div>
      </button>
      {expanded && (
        <div className={styles.editor}>
          <label className={styles.editorLabel}>Quantity (grams)</label>
          <input
            type="number"
            value={grams}
            min="1"
            step="any"
            onChange={(e) => setGrams(e.target.value)}
            className={styles.editorInput}
            autoFocus
          />
          {Number(grams) > 0 && (
            <p className={styles.editorPreview}>
              ≈ {previewKcal} kcal at {grams}g
            </p>
          )}
          <div className={styles.editorActions}>
            <Button variant="primary" block onClick={handleSave}>Save</Button>
            <Button variant="secondary" block onClick={() => setConfirming(true)}>Delete</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirming}
        title="Delete this meal?"
        message={`Remove ${p.name} (${meal.quantity}g) from today?`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { setConfirming(false); await onDelete(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: MealCard.module.css**

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}
.card:hover { box-shadow: var(--shadow-sm); }
.expanded { box-shadow: var(--shadow-md); }

.summary {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.left { flex: 1; min-width: 0; }
.name { font-weight: 600; color: var(--color-text); }
.sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

.right { flex-shrink: 0; text-align: right; }
.macros { font-size: 11px; color: var(--color-text-muted); }

.editor {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.editorLabel { font-size: 13px; font-weight: 600; color: var(--color-text-muted); }
.editorInput {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: 16px;
  min-height: 44px;
}

.editorPreview { font-size: 12px; color: var(--color-text-muted); margin-top: -4px; }

.editorActions {
  display: flex;
  gap: var(--space-3);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/today/MealCard.*
git commit -m "feat(today): add MealCard with inline edit/delete editor"
```

---

## Task 21: AddProductSheet

**Files:**
- Create: `frontend/src/features/today/AddProductSheet.jsx`
- Create: `frontend/src/features/today/AddProductSheet.module.css`

- [ ] **Step 1: AddProductSheet.jsx**

```jsx
// frontend/src/features/today/AddProductSheet.jsx
import React, { useState } from 'react';
import Sheet from '../../components/Sheet';
import Field from '../../components/Field';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { createProduct } from '../../api/meals';
import styles from './AddProductSheet.module.css';

const PRODUCT_TYPES = [
  { value: 'MEAT', label: 'Meat' },
  { value: 'FRUITS', label: 'Fruits' },
  { value: 'VEGETABLES', label: 'Vegetables' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'LEGUMES', label: 'Legumes' },
  { value: 'CEREALS', label: 'Cereals' },
  { value: 'TUBERS', label: 'Tubers' },
];

const EMPTY = {
  name: '',
  productType: '',
  caloriesPer100Grams: '',
  proteinPer100Grams: '',
  fatPer100Grams: '',
  carbsPer100Grams: '',
};

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = 'Required';
  if (!form.productType) e.productType = 'Pick a type';
  for (const k of ['caloriesPer100Grams', 'proteinPer100Grams', 'fatPer100Grams', 'carbsPer100Grams']) {
    const n = parseFloat(form[k]);
    if (Number.isNaN(n) || n < 0) e[k] = 'Invalid';
  }
  return e;
}

/** Returns the created product to the caller via onCreated. */
export default function AddProductSheet({ isOpen, onClose, onCreated, defaultName = '' }) {
  const [form, setForm] = useState({ ...EMPTY, name: defaultName });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  React.useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY, name: defaultName });
      setErrors({});
      setServerError('');
    }
  }, [isOpen, defaultName]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setSubmitting(true);
    try {
      const created = await createProduct({
        name: form.name.trim(),
        productType: form.productType,
        caloriesPer100Grams: parseFloat(form.caloriesPer100Grams),
        proteinPer100Grams: parseFloat(form.proteinPer100Grams),
        fatPer100Grams: parseFloat(form.fatPer100Grams),
        carbsPer100Grams: parseFloat(form.carbsPer100Grams),
      });
      onCreated(created);
    } catch (err) {
      setServerError(err.message || 'Could not save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="New product"
      footer={
        <Button block onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save product'}
        </Button>
      }
    >
      <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
      <div className={styles.fields}>
        <Field label="Name" value={form.name} onChange={update('name')} error={errors.name} />
        <Field label="Type" as="select" value={form.productType}
               onChange={update('productType')} error={errors.productType}>
          <option value="">Select type</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Field>
        <Field label="Calories per 100g" type="number" min="0" step="any"
               value={form.caloriesPer100Grams} onChange={update('caloriesPer100Grams')}
               error={errors.caloriesPer100Grams} />
        <Field label="Protein per 100g" type="number" min="0" step="any"
               value={form.proteinPer100Grams} onChange={update('proteinPer100Grams')}
               error={errors.proteinPer100Grams} />
        <Field label="Carbs per 100g" type="number" min="0" step="any"
               value={form.carbsPer100Grams} onChange={update('carbsPer100Grams')}
               error={errors.carbsPer100Grams} />
        <Field label="Fat per 100g" type="number" min="0" step="any"
               value={form.fatPer100Grams} onChange={update('fatPer100Grams')}
               error={errors.fatPer100Grams} />
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 2: AddProductSheet.module.css**

```css
.fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/today/AddProductSheet.*
git commit -m "feat(today): add AddProductSheet"
```

---

## Task 22: AddMealSheet (search → grams)

**Files:**
- Create: `frontend/src/features/today/AddMealSheet.jsx`
- Create: `frontend/src/features/today/AddMealSheet.module.css`

- [ ] **Step 1: AddMealSheet.jsx**

```jsx
// frontend/src/features/today/AddMealSheet.jsx
import React, { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet';
import Field from '../../components/Field';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { addMeal, searchProducts } from '../../api/meals';
import { getUserId } from '../../auth/storage';
import AddProductSheet from './AddProductSheet';
import styles from './AddMealSheet.module.css';

/**
 * Two-step bottom sheet:
 *   step 'search'  → user types, sees live results
 *   step 'grams'   → user enters grams + Add
 *
 * If no results: "Create new product" link opens the AddProductSheet
 * stacked on top. After creation, jumps to step 'grams' with the new product.
 */
export default function AddMealSheet({ isOpen, onClose, onAdded }) {
  const [step, setStep] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);

  // Reset state every time we open
  useEffect(() => {
    if (isOpen) {
      setStep('search'); setQuery(''); setResults([]); setSelected(null);
      setGrams(''); setServerError(''); setSubmitting(false);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (step !== 'search') return undefined;
    if (!query || query.trim().length < 1) { setResults([]); return undefined; }
    const handle = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const r = await searchProducts(query.trim());
        setResults(r);
      } catch (err) {
        // Silent on search errors — user retries by typing again
        console.error('Search failed:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, step]);

  const pick = (product) => {
    setSelected(product);
    setStep('grams');
    setGrams('');
  };

  const handleAdd = async () => {
    const n = parseFloat(grams);
    if (Number.isNaN(n) || n <= 0) return;
    setSubmitting(true);
    setServerError('');
    try {
      await addMeal(getUserId(), selected.productId, Math.round(n));
      onAdded();
    } catch (err) {
      setServerError(err.message || 'Could not add meal');
    } finally {
      setSubmitting(false);
    }
  };

  const title = step === 'search' ? 'Add a meal' : `How much ${selected?.name}?`;

  const footer = step === 'grams'
    ? (
        <Button block disabled={!grams || submitting} onClick={handleAdd}>
          {submitting ? 'Adding…' : 'Add meal'}
        </Button>
      )
    : null;

  return (
    <>
      <Sheet isOpen={isOpen && !productSheetOpen} onClose={onClose} title={title} footer={footer}>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
        {step === 'search' && (
          <div className={styles.search}>
            <Field
              label="Search"
              placeholder="Type a product name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className={styles.results}>
              {loadingSearch && <p className={styles.muted}>Searching…</p>}
              {!loadingSearch && query && results.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.muted}>No products match "{query}".</p>
                  <Button variant="secondary" block onClick={() => setProductSheetOpen(true)}>
                    + Create new product
                  </Button>
                </div>
              )}
              {results.map((p) => (
                <button key={p.productId} className={styles.result} onClick={() => pick(p)}>
                  <div className={styles.resultName}>{p.name}</div>
                  <div className={styles.resultMacros}>
                    {Math.round(p.caloriesPer100Grams)} kcal · P {p.proteinPer100Grams}
                    {' '}· C {p.carbsPer100Grams} · F {p.fatPer100Grams} (per 100g)
                  </div>
                </button>
              ))}
              {!query && results.length === 0 && (
                <p className={styles.muted}>Start typing to search products.</p>
              )}
            </div>
          </div>
        )}
        {step === 'grams' && selected && (
          <div className={styles.gramsStep}>
            <button className={styles.back} onClick={() => setStep('search')} aria-label="Back">‹ Search</button>
            <p className={styles.selected}>
              {selected.name} — {Math.round(selected.caloriesPer100Grams)} kcal / 100g
            </p>
            <Field
              label="Grams"
              type="number"
              min="1"
              step="any"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              autoFocus
            />
            {grams && parseFloat(grams) > 0 && (
              <p className={styles.preview}>
                ≈ {Math.round(selected.caloriesPer100Grams * parseFloat(grams) / 100)} kcal
              </p>
            )}
          </div>
        )}
      </Sheet>
      <AddProductSheet
        isOpen={productSheetOpen}
        onClose={() => setProductSheetOpen(false)}
        defaultName={query}
        onCreated={(created) => {
          setProductSheetOpen(false);
          // The /new/product response shape currently differs from /products/search;
          // re-search so the picked item has the same shape as a search result.
          setQuery(created.name);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: AddMealSheet.module.css**

```css
.search { display: flex; flex-direction: column; gap: var(--space-4); }

.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 50vh;
  overflow-y: auto;
}

.result {
  text-align: left;
  background: var(--color-surface-2);
  border: 0;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
}
.result:hover { background: var(--color-border); }

.resultName { font-weight: 600; color: var(--color-text); margin-bottom: 2px; }
.resultMacros { font-size: 12px; color: var(--color-text-muted); }

.empty { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3) 0; }
.muted { color: var(--color-text-muted); font-size: 14px; }

.gramsStep { display: flex; flex-direction: column; gap: var(--space-3); }
.back {
  align-self: flex-start;
  background: transparent;
  border: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  padding: var(--space-2) 0;
}
.selected { font-weight: 600; color: var(--color-text); }
.preview { font-size: 13px; color: var(--color-text-muted); }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/today/AddMealSheet.*
git commit -m "feat(today): add AddMealSheet (search → grams flow)"
```

---

## Task 23: TodayPage

**Files:**
- Create: `frontend/src/features/today/TodayPage.jsx`
- Create: `frontend/src/features/today/TodayPage.module.css`

- [ ] **Step 1: TodayPage.jsx**

```jsx
// frontend/src/features/today/TodayPage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import DayPicker from '../../components/DayPicker';
import MacroRings from '../../components/MacroRings';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import MealCard from './MealCard';
import AddMealSheet from './AddMealSheet';
import {
  listMealsForDay, getDailyMacros, updateMealQuantity, deleteMeal,
} from '../../api/meals';
import { getGoal } from '../../api/profile';
import { getUserId } from '../../auth/storage';
import { formatBackendDate } from './dateFormat';
import styles from './TodayPage.module.css';

const ZERO_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const ZERO_GOALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function TodayPage() {
  const userId = getUserId();
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState(ZERO_TOTALS);
  const [goals, setGoals] = useState(ZERO_GOALS);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const dateStr = formatBackendDate(date);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mealsRes, macrosRes] = await Promise.all([
        listMealsForDay(userId, dateStr),
        getDailyMacros(userId, dateStr),
      ]);
      setMeals(mealsRes);
      setTotals({
        calories: macrosRes.calories || 0,
        protein: macrosRes.protein || 0,
        carbs: macrosRes.carb || 0,
        fat: macrosRes.fat || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load day');
    } finally {
      setLoading(false);
    }
  }, [userId, dateStr]);

  useEffect(() => { loadDay(); }, [loadDay]);

  // Goals are user-wide, not per-day — load once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await getGoal(userId);
        if (!cancelled) {
          setGoals({
            calories: g.calories || 0,
            protein: g.protein || 0,
            carbs: g.carbs || 0,
            fat: g.fat || 0,
          });
        }
      } catch (_err) {
        // Goal may not be set yet — leave zeros
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSaveMeal = async (mealId, newQuantity) => {
    try {
      await updateMealQuantity(userId, mealId, newQuantity);
      setExpandedMealId(null);
      await loadDay();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    try {
      await deleteMeal(mealId);
      setExpandedMealId(null);
      await loadDay();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <DayPicker value={date} onChange={setDate} />
      </header>

      <section className={styles.macroSection}>
        <MacroRings totals={totals} goals={goals} />
      </section>

      <section className={styles.mealsSection}>
        <h2 className={styles.h2}>Meals</h2>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {loading && meals.length === 0 && <p className={styles.muted}>Loading…</p>}
        {!loading && meals.length === 0 && (
          <p className={styles.muted}>No meals logged yet.</p>
        )}
        {meals.map((meal) => (
          <MealCard
            key={meal.mealId}
            meal={meal}
            expanded={expandedMealId === meal.mealId}
            onExpand={() =>
              setExpandedMealId((cur) => (cur === meal.mealId ? null : meal.mealId))
            }
            onSave={(newQ) => handleSaveMeal(meal.mealId, newQ)}
            onDelete={() => handleDeleteMeal(meal.mealId)}
          />
        ))}
      </section>

      <button
        className={styles.fab}
        onClick={() => setAddSheetOpen(true)}
        aria-label="Add meal"
      >+</button>

      <AddMealSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onAdded={async () => { setAddSheetOpen(false); await loadDay(); }}
      />
    </div>
  );
}
```

- [ ] **Step 2: TodayPage.module.css**

```css
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 var(--space-4) var(--space-6);
}

.header { padding: var(--space-3) 0; }

.macroSection { margin-bottom: var(--space-5); }

.mealsSection { display: flex; flex-direction: column; gap: var(--space-2); }

.h2 { margin-bottom: var(--space-3); }

.muted { color: var(--color-text-muted); font-size: 14px; padding: var(--space-3) 0; }

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
  .fab { bottom: var(--space-5); }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/today/TodayPage.*
git commit -m "feat(today): add TodayPage (DayPicker + MacroRings + meal list + FAB)"
```

---

## Task 24: Backend — gender on RegisterRequest + password update endpoint

This task is purely backend. Run all commands from the **repo root**, with
`JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home`.

**Files:**
- Modify: `src/main/java/com/stoyandev/caloriecalculator/security/auth/RegisterRequest.java`
- Modify: `src/main/java/com/stoyandev/caloriecalculator/security/service/AuthenticationService.java`
- Create: `src/main/java/com/stoyandev/caloriecalculator/dto/UpdateUserPasswordRequestDTO.java`
- Modify: `src/main/java/com/stoyandev/caloriecalculator/service/UserService.java`
- Modify: `src/main/java/com/stoyandev/caloriecalculator/service/implementations/UserServiceImpl.java`
- Modify: `src/main/java/com/stoyandev/caloriecalculator/controller/UserController.java`

- [ ] **Step 1: Add gender to RegisterRequest**

Replace the contents of `RegisterRequest.java`:

```java
package com.stoyandev.caloriecalculator.security.auth;

import com.stoyandev.caloriecalculator.entity.enums.GenderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    private String name;
    private int age;
    private GenderType gender;
    private double weight;
    private int height;
    private String username;
    private String password;
}
```

- [ ] **Step 2: Wire gender into AuthenticationService.register**

In `AuthenticationService.java`, locate the `Users.builder()` chain inside `register(...)` and add `.genderType(request.getGender())` immediately after `.age(request.getAge())`:

```java
var user = Users.builder()
        .name(request.getName())
        .age(request.getAge())
        .genderType(request.getGender())
        .weight(request.getWeight())
        .height(request.getHeight())
        .username(request.getUsername())
        .password(passwordEncoder.encode(request.getPassword()))
        .userType(UserType.USER)
        .status(Status.MAINTAINING)
        .activity(Activity.NORMAL)
        .build();
```

- [ ] **Step 3: Create UpdateUserPasswordRequestDTO**

```java
// src/main/java/com/stoyandev/caloriecalculator/dto/UpdateUserPasswordRequestDTO.java
package com.stoyandev.caloriecalculator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserPasswordRequestDTO(
        @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
        String newPassword) {
}
```

- [ ] **Step 4: Add updatePassword to UserService interface**

In `UserService.java`, add the method signature:

```java
void updatePassword(Long userId, String newPassword);
```

- [ ] **Step 5: Implement in UserServiceImpl**

Inject `PasswordEncoder` if not already present, then add:

```java
// Add field (with the other repository fields):
private final PasswordEncoder passwordEncoder;

// Add method (anywhere among the other @Override methods):
@Override
public void updatePassword(final Long userId, final String newPassword) {
    final var user = userRepository
            .findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    user.setPassword(passwordEncoder.encode(newPassword));
    userRepository.save(user);
}
```

Add the import at the top: `import org.springframework.security.crypto.password.PasswordEncoder;`

Note: `@AllArgsConstructor` (Lombok) auto-generates the constructor with the new field, so no manual constructor change is needed.

- [ ] **Step 6: Add controller endpoint**

In `UserController.java`, add the import:

```java
import com.stoyandev.caloriecalculator.dto.UpdateUserPasswordRequestDTO;
import jakarta.validation.Valid;
```

And add the method:

```java
@PutMapping("/update/password/{id}")
@PreAuthorize("@userAccessService.hasAccess(#id)")
public ResponseEntity<Void> updatePassword(
        @PathVariable Long id,
        @Valid @RequestBody UpdateUserPasswordRequestDTO body) {
    userService.updatePassword(id, body.newPassword());
    return ResponseEntity.ok().build();
}
```

- [ ] **Step 7: Compile**

```bash
cd /Users/I760712/IdeaProjects/CaloriesCalculator
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home mvn -q -DskipTests compile 2>&1 | tail -10
```

Expected: clean compile.

- [ ] **Step 8: Run existing tests**

```bash
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home mvn -q test 2>&1 | tail -10
```

Expected: BUILD SUCCESS, all 6 tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/com/stoyandev/caloriecalculator/security/auth/RegisterRequest.java \
        src/main/java/com/stoyandev/caloriecalculator/security/service/AuthenticationService.java \
        src/main/java/com/stoyandev/caloriecalculator/dto/UpdateUserPasswordRequestDTO.java \
        src/main/java/com/stoyandev/caloriecalculator/service/UserService.java \
        src/main/java/com/stoyandev/caloriecalculator/service/implementations/UserServiceImpl.java \
        src/main/java/com/stoyandev/caloriecalculator/controller/UserController.java
git commit -m "feat(api): persist gender on register + add password update endpoint"
```

---

## Task 25: ProfilePage shell + ProfileTab + WeightTab + BodyTab

This is one larger task because the three tabs share state lifted into `ProfilePage`. Each sub-component is small.

**Files:**
- Create: `frontend/src/features/profile/ProfilePage.jsx`
- Create: `frontend/src/features/profile/ProfilePage.module.css`
- Create: `frontend/src/features/profile/tabs/ProfileTab.jsx`
- Create: `frontend/src/features/profile/tabs/ProfileTab.module.css`
- Create: `frontend/src/features/profile/tabs/WeightTab.jsx`
- Create: `frontend/src/features/profile/tabs/WeightTab.module.css`
- Create: `frontend/src/features/profile/tabs/BodyTab.jsx`
- Create: `frontend/src/features/profile/tabs/BodyTab.module.css`
- Create: `frontend/src/features/profile/WeightChart.jsx`
- Create: `frontend/src/features/profile/MeasurementChart.jsx`

- [ ] **Step 1: ProfilePage.jsx**

```jsx
// frontend/src/features/profile/ProfilePage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import Tabs from '../../components/Tabs';
import ErrorBanner from '../../components/ErrorBanner';
import {
  getUser, getGoal, getWeightRecords, getMeasurements, getLatestMeasurement,
} from '../../api/profile';
import { getAllMacros } from '../../api/meals';
import { getUserId } from '../../auth/storage';
import ProfileTab from './tabs/ProfileTab';
import WeightTab from './tabs/WeightTab';
import BodyTab from './tabs/BodyTab';
import styles from './ProfilePage.module.css';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'weight', label: 'Weight' },
  { id: 'body', label: 'Body' },
];

export default function ProfilePage() {
  const userId = getUserId();
  const [activeTab, setActiveTab] = useState('profile');

  const [user, setUser] = useState(null);
  const [goal, setGoal] = useState(null);
  const [weightRecords, setWeightRecords] = useState([]);
  const [allMacros, setAllMacros] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [error, setError] = useState('');

  const refreshUser = useCallback(async () => {
    try { setUser(await getUser(userId)); }
    catch (e) { setError(e.message); }
  }, [userId]);

  const refreshGoal = useCallback(async () => {
    try { setGoal(await getGoal(userId)); }
    catch (_e) { /* may not be set */ }
  }, [userId]);

  const refreshWeights = useCallback(async () => {
    try {
      const r = await getWeightRecords(userId);
      // Latest first for the records list; weeklyAverages uses the data either way
      setWeightRecords([...r].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) { setError(e.message); }
  }, [userId]);

  const refreshMacros = useCallback(async () => {
    try {
      const m = await getAllMacros(userId);
      setAllMacros([...m].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (_e) { /* ignore — empty list shows */ }
  }, [userId]);

  const refreshMeasurements = useCallback(async () => {
    try {
      const list = await getMeasurements(userId);
      setMeasurements([...list].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) { setError(e.message); }
    try { setLatestMeasurement(await getLatestMeasurement(userId)); }
    catch (_e) { setLatestMeasurement(null); }
  }, [userId]);

  useEffect(() => {
    refreshUser();
    refreshGoal();
    refreshWeights();
    refreshMacros();
    refreshMeasurements();
  }, [refreshUser, refreshGoal, refreshWeights, refreshMacros, refreshMeasurements]);

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

      <div className={styles.tabsBar}>
        <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

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
  );
}
```

- [ ] **Step 2: ProfilePage.module.css**

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

.tabsBar { margin-bottom: var(--space-4); }
.content { display: flex; flex-direction: column; gap: var(--space-5); }
```

- [ ] **Step 3: ProfileTab.jsx**

```jsx
// frontend/src/features/profile/tabs/ProfileTab.jsx
import React, { useState } from 'react';
import Field from '../../../components/Field';
import PasswordField from '../../../components/PasswordField';
import Button from '../../../components/Button';
import ErrorBanner from '../../../components/ErrorBanner';
import ReminderDot from '../../../components/ReminderDot';
import {
  updateWeight, updateStatus, updateActivity, setGoal as apiSetGoal, autoSetGoal,
  addMeasurement,
} from '../../../api/profile';
import { changePassword } from '../../../api/auth';
import { getUserId, clearAuth } from '../../../auth/storage';
import { needsWeightReminder, needsMeasurementReminder } from '../reminders';
import { validateChangePassword } from '../../auth/validation';
import styles from './ProfileTab.module.css';

const STATUS_OPTIONS = [
  { code: '1', label: 'Normal Bulk' }, { code: '2', label: 'Slow Bulk' },
  { code: '3', label: 'Fast Bulk' }, { code: '4', label: 'Normal Cut' },
  { code: '5', label: 'Slow Cut' }, { code: '6', label: 'Fast Cut' },
  { code: '7', label: 'Maintaining' },
];
const ACTIVITY_OPTIONS = [
  { code: '1', label: 'Minimal' }, { code: '2', label: 'Low' },
  { code: '3', label: 'Normal' }, { code: '4', label: 'High' },
  { code: '5', label: 'Very High' },
];

const EMPTY_GOAL = { calories: '', protein: '', carbs: '', fat: '' };
const EMPTY_MEAS = {
  shoulder: '', chest: '', biceps: '', waist: '', hips: '', thigh: '', calf: '',
};

export default function ProfileTab({
  user, goal, weightRecords, latestMeasurement,
  onRefreshUser, onRefreshGoal, onRefreshWeights, onRefreshMeasurements,
}) {
  const userId = getUserId();
  const [error, setError] = useState('');

  // Weight
  const [newWeight, setNewWeight] = useState('');
  const showWeightReminder = needsWeightReminder(weightRecords[0]?.date);

  // Goals
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [goalsOpen, setGoalsOpen] = useState(false);
  React.useEffect(() => {
    if (goal) setGoalForm({
      calories: goal.calories || '', protein: goal.protein || '',
      carbs: goal.carbs || '', fat: goal.fat || '',
    });
  }, [goal]);

  // Measurements
  const [measOpen, setMeasOpen] = useState(false);
  const [measForm, setMeasForm] = useState(EMPTY_MEAS);
  const showMeasReminder = needsMeasurementReminder(latestMeasurement?.date);

  // Change password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSuccess, setPwSuccess] = useState('');

  const handleWeight = async () => {
    const n = parseFloat(newWeight);
    if (Number.isNaN(n) || n <= 0) { setError('Enter a valid weight'); return; }
    try {
      await updateWeight(userId, n);
      setNewWeight('');
      await Promise.all([onRefreshUser(), onRefreshWeights()]);
    } catch (e) { setError(e.message); }
  };

  const handleStatus = async (e) => {
    const code = e.target.value;
    if (!code) return;
    try { await updateStatus(userId, parseInt(code, 10)); await onRefreshUser(); }
    catch (err) { setError(err.message); }
  };

  const handleActivity = async (e) => {
    const code = e.target.value;
    if (!code) return;
    try { await updateActivity(userId, parseInt(code, 10)); await onRefreshUser(); }
    catch (err) { setError(err.message); }
  };

  const handleGoalSubmit = async () => {
    try {
      await apiSetGoal(userId, {
        calories: Number(goalForm.calories) || 0,
        protein: Number(goalForm.protein) || 0,
        carbs: Number(goalForm.carbs) || 0,
        fat: Number(goalForm.fat) || 0,
      });
      await onRefreshGoal();
    } catch (e) { setError(e.message); }
  };

  const handleAuto = async () => {
    try { await autoSetGoal(userId); await onRefreshGoal(); }
    catch (e) { setError(e.message); }
  };

  const handleMeasSubmit = async () => {
    const payload = Object.fromEntries(
      Object.entries(measForm).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    try {
      await addMeasurement(userId, payload);
      setMeasForm(EMPTY_MEAS);
      await onRefreshMeasurements();
    } catch (e) { setError(e.message); }
  };

  const handlePwSubmit = async () => {
    setPwSuccess('');
    const v = validateChangePassword(pwForm);
    setPwErrors(v);
    if (Object.keys(v).length > 0) return;
    try {
      await changePassword(userId, pwForm.newPassword);
      setPwForm({ newPassword: '', confirm: '' });
      setPwSuccess('Password updated');
    } catch (e) { setError(e.message); }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div className={styles.tab}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <Section title="Update weight">
        <div className={styles.weightRow} style={{ position: 'relative' }}>
          <Field
            type="number" min="1" step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder={user?.weight ? `Current: ${user.weight} kg` : 'New weight (kg)'}
          />
          <div className={styles.weightBtn} style={{ position: 'relative' }}>
            <Button onClick={handleWeight}>Save</Button>
            <ReminderDot visible={showWeightReminder} label="No weight logged today" />
          </div>
        </div>
      </Section>

      <Section title="Goals" expandable open={goalsOpen} onToggle={() => setGoalsOpen((o) => !o)}>
        <div className={styles.grid2}>
          <Field label="Calories" type="number" min="0" value={goalForm.calories}
                 onChange={(e) => setGoalForm({ ...goalForm, calories: e.target.value })} />
          <Field label="Protein (g)" type="number" min="0" value={goalForm.protein}
                 onChange={(e) => setGoalForm({ ...goalForm, protein: e.target.value })} />
          <Field label="Carbs (g)" type="number" min="0" value={goalForm.carbs}
                 onChange={(e) => setGoalForm({ ...goalForm, carbs: e.target.value })} />
          <Field label="Fat (g)" type="number" min="0" value={goalForm.fat}
                 onChange={(e) => setGoalForm({ ...goalForm, fat: e.target.value })} />
        </div>
        <div className={styles.actions}>
          <Button block onClick={handleGoalSubmit}>Save goals</Button>
          <Button variant="secondary" block onClick={handleAuto}>Auto-calculate</Button>
        </div>
      </Section>

      <Section title="Status">
        <Field as="select" value="" onChange={handleStatus}>
          <option value="">
            {user?.status ? `Current: ${user.status.replace('_', ' ').toLowerCase()}` : 'Select status'}
          </option>
          {STATUS_OPTIONS.map((s) => (<option key={s.code} value={s.code}>{s.label}</option>))}
        </Field>
      </Section>

      <Section title="Activity">
        <Field as="select" value="" onChange={handleActivity}>
          <option value="">
            {user?.activity ? `Current: ${user.activity.toLowerCase()}` : 'Select activity'}
          </option>
          {ACTIVITY_OPTIONS.map((a) => (<option key={a.code} value={a.code}>{a.label}</option>))}
        </Field>
      </Section>

      <Section title="Add measurements" expandable open={measOpen}
               onToggle={() => setMeasOpen((o) => !o)}
               headerExtra={<ReminderDot visible={showMeasReminder} label="No recent measurements" />}>
        <div className={styles.grid2}>
          {Object.keys(EMPTY_MEAS).map((k) => (
            <Field key={k}
                   label={`${k[0].toUpperCase() + k.slice(1)} (cm)`}
                   type="number" step="0.1" min="0"
                   value={measForm[k]}
                   onChange={(e) => setMeasForm({ ...measForm, [k]: e.target.value })} />
          ))}
        </div>
        <Button block onClick={handleMeasSubmit}>Save measurements</Button>
      </Section>

      <Section title="Change password" expandable open={pwOpen} onToggle={() => setPwOpen((o) => !o)}>
        {pwSuccess && <p className={styles.success}>{pwSuccess}</p>}
        <PasswordField label="New password" value={pwForm.newPassword}
                       onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                       error={pwErrors.newPassword} autoComplete="new-password" />
        <PasswordField label="Confirm new password" value={pwForm.confirm}
                       onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                       error={pwErrors.confirm} autoComplete="new-password" />
        <Button block onClick={handlePwSubmit}>Update password</Button>
      </Section>

      <Section title="">
        <Button variant="danger" block onClick={handleLogout}>Logout</Button>
      </Section>
    </div>
  );
}

function Section({ title, expandable = false, open = true, onToggle, headerExtra, children }) {
  return (
    <section className={styles.section}>
      {title && (
        expandable
          ? (
            <button className={styles.sectionHead} onClick={onToggle} style={{ position: 'relative' }}>
              <span>{title}</span>
              <span className={styles.chev}>{open ? '⌃' : '⌄'}</span>
              {headerExtra}
            </button>
          )
          : <h3 className={styles.sectionTitle}>{title}</h3>
      )}
      {(!expandable || open) && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}
```

- [ ] **Step 4: ProfileTab.module.css**

```css
.tab { display: flex; flex-direction: column; gap: var(--space-4); }

.section { background: var(--color-surface); border-radius: var(--radius-md); }

.sectionTitle {
  padding: var(--space-3) var(--space-4) 0;
  font-size: 13px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.sectionHead {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: transparent;
  border: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.chev { color: var(--color-text-muted); margin-left: var(--space-3); }

.sectionBody {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.weightRow { display: flex; gap: var(--space-3); align-items: flex-end; }
.weightRow > :first-child { flex: 1; }

.weightBtn { padding-bottom: 0; }

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.actions { display: flex; flex-direction: column; gap: var(--space-2); }

.success {
  background: color-mix(in srgb, var(--color-success) 12%, var(--color-surface));
  color: var(--color-success);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
}
```

- [ ] **Step 5: WeightChart.jsx (relocated, themed)**

```jsx
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
```

- [ ] **Step 6: MeasurementChart.jsx (relocated, themed)**

```jsx
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
```

- [ ] **Step 7: WeightTab.jsx**

```jsx
// frontend/src/features/profile/tabs/WeightTab.jsx
import React, { useMemo, useState } from 'react';
import WeightChart from '../WeightChart';
import { computeWeeklyAverages } from '../weeklyAverages';
import styles from './WeightTab.module.css';

export default function WeightTab({ weightRecords, allMacros }) {
  const weekly = useMemo(() => computeWeeklyAverages(weightRecords), [weightRecords]);
  const [showMacros, setShowMacros] = useState(false);

  const trendIcon = weekly.diff == null ? '—' : weekly.diff > 0 ? '▲' : weekly.diff < 0 ? '▼' : '—';

  return (
    <div className={styles.tab}>
      <div className={styles.weeklyCard}>
        <div className={styles.weeklyHeader}>
          <span className={styles.weeklyTitle}>Weekly average</span>
          <span className={styles.weeklyDelta}>
            {weekly.diff == null ? '—' : `${trendIcon} ${Math.abs(weekly.diff).toFixed(2)} kg`}
          </span>
        </div>
        <div className={styles.weeklyGrid}>
          <div>
            <div className={styles.weeklyLabel}>This week</div>
            <div className={styles.weeklyValue}>
              {weekly.thisWeek != null ? `${weekly.thisWeek.toFixed(2)} kg` : 'n/a'}
            </div>
            <div className={styles.weeklyRange}>{weekly.rangeThis || '–'}</div>
          </div>
          <div>
            <div className={styles.weeklyLabel}>Last week</div>
            <div className={styles.weeklyValue}>
              {weekly.lastWeek != null ? `${weekly.lastWeek.toFixed(2)} kg` : 'n/a'}
            </div>
            <div className={styles.weeklyRange}>{weekly.rangeLast || '–'}</div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Weight trend</h3>
        <WeightChart weightRecords={weightRecords} />
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Weight records</h3>
        {weightRecords.length === 0 && <p className={styles.muted}>No records yet.</p>}
        {weightRecords.length > 0 && (
          <ul className={styles.list}>
            {weightRecords.map((r, i) => (
              <li key={`${r.date}-${i}`} className={styles.row}>
                <span>{r.date}</span><strong>{r.weight} kg</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <button className={styles.toggleBtn} onClick={() => setShowMacros((s) => !s)}>
          {showMacros ? 'Hide macro history' : 'Show macro history'} ({allMacros.length} days)
        </button>
        {showMacros && allMacros.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th><th>Cal</th><th>P</th><th>C</th><th>F</th>
              </tr>
            </thead>
            <tbody>
              {allMacros.map((m, i) => (
                <tr key={`${m.date}-${i}`}>
                  <td>{m.date}</td>
                  <td>{Math.round(m.calories || 0)}</td>
                  <td>{(m.protein || 0).toFixed(1)}</td>
                  <td>{(m.carb || 0).toFixed(1)}</td>
                  <td>{(m.fat || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: WeightTab.module.css**

```css
.tab { display: flex; flex-direction: column; gap: var(--space-4); }

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.h3 { margin-bottom: var(--space-3); }
.muted { color: var(--color-text-muted); }

.weeklyCard {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.weeklyHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
.weeklyTitle { font-weight: 600; }
.weeklyDelta { font-weight: 700; color: var(--color-text); }
.weeklyGrid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.weeklyLabel { font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: 0.5px; }
.weeklyValue { font-size: 20px; font-weight: 700; margin-top: var(--space-1); }
.weeklyRange { font-size: 11px; color: var(--color-text-muted); }

.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 14px;
}

.toggleBtn {
  width: 100%;
  background: transparent;
  border: 0;
  color: var(--color-accent);
  font-weight: 600;
  padding: var(--space-2) 0;
  text-align: left;
}

.table {
  width: 100%;
  margin-top: var(--space-3);
  border-collapse: collapse;
  font-size: 13px;
}
.table th, .table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.table th { color: var(--color-text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; }
```

- [ ] **Step 9: BodyTab.jsx**

```jsx
// frontend/src/features/profile/tabs/BodyTab.jsx
import React from 'react';
import MeasurementChart from '../MeasurementChart';
import styles from './BodyTab.module.css';

const PARTS = ['shoulder', 'chest', 'biceps', 'waist', 'hips', 'thigh', 'calf'];

export default function BodyTab({ measurements, latestMeasurement }) {
  return (
    <div className={styles.tab}>
      <div className={styles.card}>
        <h3 className={styles.h3}>
          Latest measurement
          {latestMeasurement?.date && (
            <span className={styles.muted}>
              {' '}— {new Date(latestMeasurement.date).toLocaleDateString()}
            </span>
          )}
        </h3>
        {!latestMeasurement && <p className={styles.muted}>No measurements yet.</p>}
        {latestMeasurement && (
          <ul className={styles.list}>
            {PARTS.map((p) => (
              <li key={p} className={styles.row}>
                <span>{p[0].toUpperCase() + p.slice(1)}</span>
                <strong>{latestMeasurement[p]} cm</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Body measurements over time</h3>
        <MeasurementChart measurementRecords={measurements} />
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Records</h3>
        {measurements.length === 0 && <p className={styles.muted}>No records yet.</p>}
        {measurements.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  {PARTS.map((p) => (<th key={p}>{p[0].toUpperCase() + p.slice(1, 3)}</th>))}
                </tr>
              </thead>
              <tbody>
                {measurements.map((r, i) => (
                  <tr key={`${r.date}-${i}`}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    {PARTS.map((p) => (<td key={p}>{r[p]}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: BodyTab.module.css**

```css
.tab { display: flex; flex-direction: column; gap: var(--space-4); }
.card { background: var(--color-surface); border-radius: var(--radius-md); padding: var(--space-4); }
.h3 { margin-bottom: var(--space-3); }
.muted { color: var(--color-text-muted); }

.list { list-style: none; padding: 0; margin: 0; }
.row {
  display: flex; justify-content: space-between;
  padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

.tableWrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 12px; }
.table th, .table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  white-space: nowrap;
}
.table th { color: var(--color-text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; }
```

- [ ] **Step 11: Commit**

```bash
git add frontend/src/features/profile/
git commit -m "feat(profile): add ProfilePage with Profile/Weight/Body tabs"
```

---

## Task 26: Wire App.jsx routing + delete App.test.js

**Files:**
- Modify: `frontend/src/App.js` → rewrite as `App.jsx`
- Modify: `frontend/src/index.js` (update entry imports)
- Delete: `frontend/src/App.test.js`

- [ ] **Step 1: Rewrite App routing**

Replace `frontend/src/App.js` with `frontend/src/App.jsx`:

```jsx
// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import RegisterPage from './features/auth/RegisterPage';
import LoginPage from './features/auth/LoginPage';
import TodayPage from './features/today/TodayPage';
import ProfilePage from './features/profile/ProfilePage';
import { isAuthenticated } from './auth/storage';

import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';

const RequireAuth = ({ children }) =>
  isAuthenticated() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        {/* Old route still resolves */}
        <Route path="/calories-calculator" element={<Navigate to="/today" replace />} />
        <Route path="/user-profile" element={<Navigate to="/profile" replace />} />
        <Route path="/" element={<Navigate to={isAuthenticated() ? '/today' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Then delete the old `App.js`:

```bash
rm frontend/src/App.js
```

- [ ] **Step 2: Update entry imports**

Edit `frontend/src/index.js` so it points to the new App and drops the old `index.css`:

```javascript
// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

- [ ] **Step 3: Delete App.test.js**

```bash
rm frontend/src/App.test.js
```

- [ ] **Step 4: Run tests — confirm everything green**

```bash
cd frontend && npm test -- --watchAll=false 2>&1 | tail -20
```

Expected: only the pure-logic tests run (dateFormat, validation, weeklyAverages, reminders, macroMath); all pass.

- [ ] **Step 5: Smoke-build**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: build succeeds. If react-scripts 3 errors on optional chaining (`?.`) — replace with explicit `&&` checks. The plan code does NOT use `??`, but does use `?.`; if blocked, do a search-and-replace for the affected files.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(app): wire routes through AppShell + redirect old paths"
```

---

## Task 27: Delete old files and dead deps

**Files to delete (after verifying no imports reference them — `grep` check first):**

- [ ] **Step 1: grep-check no references remain**

```bash
cd frontend/src && grep -RIl --include='*.js' --include='*.jsx' \
  -e "RegistrationForm" -e "LoginForm" -e "CaloriesCalculator" \
  -e "UserProfile" -e "axiosConfig" -e "utils/auth" .
```

Expected: only matches in files that are themselves about to be deleted (the originals). If there's any other hit, fix the import there before deleting.

- [ ] **Step 2: Delete old files**

```bash
cd frontend/src
rm -f \
  RegistrationForm.js RegistrationForm.css \
  LoginForm.js LoginForm.css \
  CaloriesCalculator.js CaloriesCalculator.module.css \
  UserProfile.js UserProfile.css \
  WeightChart.jsx WeightChart.css \
  MeasurementChart.jsx MeasurementChart.css \
  axiosConfig.js \
  App.css index.css

rm -rf utils
```

(`WeightChart.jsx` and `MeasurementChart.jsx` are deleted from the root — replaced by the copies under `features/profile/`.)

- [ ] **Step 3: Check `react-circular-progressbar` usage**

```bash
cd /Users/I760712/IdeaProjects/CaloriesCalculator/frontend
grep -RIl react-circular-progressbar src 2>/dev/null
```

If empty, remove from `package.json` `dependencies`:

```bash
npm uninstall react-circular-progressbar
```

- [ ] **Step 4: Check `react-autosuggest` usage**

```bash
grep -RIl react-autosuggest src 2>/dev/null
```

If empty (the new AddMealSheet doesn't use it), uninstall:

```bash
npm uninstall react-autosuggest
```

- [ ] **Step 5: Final test run**

```bash
npm test -- --watchAll=false 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

Expected: tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove old flat-file components and unused deps"
```

---

## Task 28: Manual QA checklist

This task is execution + observation, not code. Run the backend and frontend, then walk through the list.

- [ ] **Step 1: Start backend**

```bash
cd /Users/I760712/IdeaProjects/CaloriesCalculator
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home mvn spring-boot:run
```

- [ ] **Step 2: Start frontend (separate terminal)**

```bash
cd /Users/I760712/IdeaProjects/CaloriesCalculator/frontend
npm start
```

- [ ] **Step 3: Walk through each scenario**

Auth:
- [ ] `/register` is mobile-friendly (test at 360px width via DevTools).
- [ ] Submitting an empty form shows inline errors per field.
- [ ] Selecting "Female" in the dropdown and registering successfully → lands on `/today`.
- [ ] Refresh — still on `/today`, still authenticated.
- [ ] Logout from Profile tab → lands on `/login`.
- [ ] Logging in with the freshly-registered user works.

Today:
- [ ] DayPicker arrows work; right arrow disables when on today.
- [ ] Tapping the date opens a native date picker.
- [ ] MacroRings concentric mode is the default; tapping expands to 2×2.
- [ ] Refresh — chosen mode persists.
- [ ] Tap the FAB (`+`) — AddMealSheet opens from the bottom.
- [ ] Type a query, results appear; tap a result → step 2 shows; enter grams → tap Add → meal appears.
- [ ] No-results case: "Create new product" → AddProductSheet opens, fill it in, save → returned to AddMealSheet with the new product available via search.
- [ ] Tap a meal card → editor expands inline; Save updates totals; Delete shows confirmation, then removes the card.

Profile:
- [ ] Profile tab shows correct name + status + activity.
- [ ] Update weight saves and the input clears.
- [ ] Status / activity dropdowns save on change.
- [ ] Goals form shows current values, "Save goals" persists, "Auto-calculate" fills numbers.
- [ ] Add Measurements form saves; reminder dot disappears (or doesn't appear if today's submission is recent).
- [ ] Change password → log out → log in with new password works.
- [ ] Weight tab: weekly avg correct; chart renders; records list visible; "Show macro history" toggle works.
- [ ] Body tab: latest measurement list, chart, records table.

Theme:
- [ ] Switch macOS / Windows / iOS to dark mode → entire app re-themes; refresh re-themes; light mode reverses.

Mobile:
- [ ] At 360px width: no horizontal scroll, no clipped buttons, no off-screen content.
- [ ] At 414px (iPhone width): same.
- [ ] Tap the FAB while on the bottom of a long meal list — it sits above the tab bar with safe-area padding on iOS.

- [ ] **Step 4: Note any issues, fix, commit per issue**

For each found issue, decide: fix-now (small) or new task (big). Commit fixes with `fix(scope): ...` messages.

- [ ] **Step 5: Final cleanup commit (if anything was fixed)**

Already covered by per-issue commits. Nothing extra unless you find a stray issue.

---

## After all 28 tasks

The frontend now ships with:
- A mobile-first design system that auto-light/darks
- Bottom-sheet food logging with inline create-product
- Concentric→2×2 macro rings (persistent)
- Day-by-day navigation
- Tabbed profile (Profile · Weight · Body)
- Inline-edit/delete meal cards
- Change-password flow + new backend endpoint
- All eleven catalogued bugs fixed
- Full test coverage of pure logic helpers (~25 tests)
- Old flat-file components and CSS deleted

---

## Self-review summary

Coverage check against the spec sections:

| Spec section | Tasks |
|---|---|
| Goals 1 (mobile usability) | All component tasks include responsive CSS; Task 28 verifies. |
| Goals 2 (food-logging flow) | Tasks 21, 22, 23 |
| Goals 3 (Profile tabbed) | Task 25 |
| Goals 4 (bug fixes) | Spread across Tasks 12, 13, 16, 23, 24, 26 |
| Goals 5 (design system) | Tasks 1, 2 |
| Routes | Task 26 |
| Layout (AppShell) | Task 15 |
| Component tree | Tasks 5–11, 15, 18–22, 25 |
| Data flow & state | Pages own state; lifted in Task 25 (ProfilePage) |
| API layer | Tasks 3, 4 |
| Food-logging flow | Tasks 21, 22 |
| Edit/delete meal | Task 20 (component) + Task 23 (wiring) |
| Macros display + colors | Task 18 |
| Day navigation | Task 19 (component), Task 23 (wiring) |
| Profile tabs | Task 25 |
| Auth forms | Tasks 16, 17 |
| Design tokens | Task 1 |
| Backend addition | Task 24 |
| Bug fixes table | All 11 covered (gender→16, redirect→16, locale date→12+23, alert→6+13+20+25, empty records→25, fetched-and-ignored goal→25, manual auth→3, body class→16+17, key collision→20, Bulgarian comments→26 (rewrite drops them), App.css absolute path→2+26) |
| Error handling (ApiError shape, 401, no alert) | Tasks 3, 8 |
| Testing strategy | Tasks 12, 13, 14, 18 (pure logic with TDD); Task 28 (manual QA) |
| Implementation ordering 1–12 | Tasks 1–28 follow the spec order with backend (Task 24) intentionally bundled before final wiring so the password endpoint exists when ProfileTab needs it. |

Type/method-signature consistency check:
- `addMeal(userId, productId, grams)` — same shape in `api/meals.js`, AddMealSheet, and TodayPage. ✓
- `MacroRings` props `{ totals, goals }` — TodayPage passes both with default zeros. ✓
- `MealCard` props `{ meal, expanded, onExpand, onSave, onDelete }` — TodayPage matches. ✓
- `Field` exports `as` prop for select; AddProductSheet, ProfileTab, RegisterPage all use it consistently. ✓
- `Sheet` props `{ isOpen, onClose, title, footer, children }` — used identically in AddMealSheet, AddProductSheet, ConfirmDialog. ✓
- Backend: `RegisterRequest.gender` is `GenderType`; frontend sends string `"MALE"` / `"FEMALE"` which Jackson resolves via `@Enumerated(EnumType.STRING)` on `Users.genderType` plus standard string-to-enum coercion. ✓ (Note: `RegisterRequest` is not the entity, so the field type is the enum directly — Jackson handles the JSON-string→enum conversion automatically.)

All gaps resolved.
