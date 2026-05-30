# Frontend redesign — design

**Date:** 2026-05-30
**Status:** Approved (pending user spec review)
**Scope chosen:** Mobile-first redesign of all visible UI, same features, no build-tool migration. CRA / `react-scripts` 3 stays.

## Goals

1. Make the app fully usable on a phone (it currently is not — only 3 `@media` queries in ~1850 lines of CSS).
2. Replace the cluttered, modal-and-dropdown-heavy food-logging flow with a focused bottom-sheet flow.
3. Replace the 880-line monolithic Profile page with a tabbed view that hides bulky tables/charts behind dedicated tabs.
4. Fix every concrete bug found in the audit (gender wired to `name`, no redirect after register, locale-dependent date format breaking `dd/MM/yyyy`, etc.).
5. Introduce a small design system based on CSS variables that auto-switches between light and dark with `prefers-color-scheme`.

## Non-goals

- Migrating from CRA to Vite (deferred).
- Backend API contract changes other than one new endpoint (`PUT /update/password/{id}`).
- Adding offline / PWA support.
- Adding charts to anything that doesn't already have them.
- Internationalization or RTL support.

## Architecture

### Routes

```
/register                  → RegisterPage (auto-login + redirect to /today on success)
/login                     → LoginPage   (redirects to /today on success)
/today                     → TodayPage   (renamed from /calories-calculator; old path keeps redirecting)
/profile                   → ProfilePage (tabbed: Profile / Weight / Body)
/                          → redirect to /today if authenticated, else /login
```

### Layout

A single `AppShell` wraps `/today` and `/profile`. AppShell renders:
- Page content (the route's outlet)
- A persistent **bottom tab bar** on mobile (Today · Profile). On desktop (`min-width: 768px`) the same bar shows at the top of the page instead.
- No top header chrome — each page renders its own page-specific header (e.g. the day picker on Today, the user summary on Profile).

Auth pages (`/register`, `/login`) are NOT inside `AppShell` — they're standalone, no tab bar.

### Component tree

```
src/
  api/
    client.js            # existing axiosConfig.js, lightly cleaned up
    auth.js              # login/register/changePassword wrappers
    meals.js             # all meal endpoints
    profile.js           # user/measurements/weight/goals
  auth/
    storage.js           # existing utils/auth.js, kept verbatim
    useAuth.js           # tiny hook: { isAuthenticated, login, logout }
  components/
    AppShell.jsx         # tab bar + outlet
    Sheet.jsx            # bottom-sheet primitive (mobile = bottom-anchored, desktop = centered modal)
    MacroRings.jsx       # the concentric / 2×2 toggle component
    DayPicker.jsx        # ‹ Mon, May 30 › with arrows + native date picker
    Field.jsx            # input + label + inline error helper
    PasswordField.jsx    # Field + eye toggle
    Button.jsx           # primary / secondary / danger variants
    Tabs.jsx             # in-page tabs (used by ProfilePage)
    ErrorBanner.jsx      # top-of-form server error display
    ReminderDot.jsx      # small "!" badge
  features/
    today/
      TodayPage.jsx
      AddMealSheet.jsx   # multi-step bottom sheet (search → grams)
      AddProductSheet.jsx
      MealCard.jsx       # tap to expand to inline editor (Save / Delete)
    profile/
      ProfilePage.jsx          # tab container, renders Profile/Weight/Body tabs
      tabs/
        ProfileTab.jsx         # inputs only: weight, goals, status/activity, measurements, change password, logout
        WeightTab.jsx          # weekly avg + chart + records table + macro history table
        BodyTab.jsx            # latest measurement diagram + chart + records table
      WeightChart.jsx          # existing, restyled
      MeasurementChart.jsx     # existing, restyled
  styles/
    tokens.css           # CSS variables (color/space/radius/font), light + dark
    base.css             # global resets, body, focus styles
    typography.css       # heading/body styles
  App.jsx                # router + AppShell wiring
  index.js               # entry — kept (CRA expects this filename)
```

The flat-file `src/` layout is replaced with the structure above. Each old component maps to one new file:

| Old | New |
|---|---|
| `RegistrationForm.js` | `features/auth/RegisterPage.jsx` |
| `LoginForm.js` | `features/auth/LoginPage.jsx` |
| `CaloriesCalculator.js` | `features/today/TodayPage.jsx` (decomposed into `AddMealSheet.jsx` etc.) |
| `UserProfile.js` | `features/profile/ProfilePage.jsx` (decomposed into `tabs/*`) |
| `WeightChart.jsx` | `features/profile/WeightChart.jsx` |
| `MeasurementChart.jsx` | `features/profile/MeasurementChart.jsx` |
| `axiosConfig.js` | `api/client.js` |
| `utils/auth.js` | `auth/storage.js` |

All old `.css` files are deleted. CSS Modules used per-component (`Component.module.css`) for component-local styles; global tokens / resets / typography in `src/styles/`.

### Data flow & state

No global state library is added. Each page owns its data via:
- `useState` + `useEffect` for fetching (matches the existing app's pattern, no new abstraction).
- Local `useState` for form fields and UI toggles.
- React Router for cross-page navigation.

The `ProfilePage` lifts the user/goals/weight-records/measurements state up so all three tabs share it without re-fetching. Tab switching is local state, not a route.

### API layer

All `axios` calls are wrapped in named functions in `api/`. Components never call `axios` directly. Two reasons: easier mocking later, and a single place to attach the 401-redirect-to-login interceptor (currently handled inconsistently in 3 places).

The existing axios baseURL (`http://localhost:8080/api/v1/`) and request interceptor (auto-`Bearer` header for non-`/auth/` requests) are preserved verbatim.

## Key flows

### Food logging — bottom-sheet flow

1. On `/today`, user taps the floating "+" button (bottom-right, above the tab bar).
2. `AddMealSheet` opens from the bottom with a search input pre-focused. Live results appear as the user types (existing `/products/search` endpoint).
3. User taps a result → sheet morphs to step 2: shows the selected product's name + a single grams input + Add button. Back arrow returns to search.
4. User enters grams, taps Add → `POST /meals/{userId}` → sheet closes → meal list refetches → new card appears.
5. If the search returns no matches, a "Create new product" link sits at the bottom of the empty state. Tapping it opens `AddProductSheet` (a new sheet stacked on top, NOT replacing) with the existing product fields (name, type, kcal/P/C/F per 100g). Submit returns to `AddMealSheet` step 1 with the new product pre-selected.

Cancel / dismiss = close on backdrop tap or down-swipe (mobile) / Esc (desktop).

### Editing / deleting a meal

1. Tap any meal card in the list.
2. Card expands inline below to show: the product name, a grams input pre-filled with current value, a Save button, and a Delete button.
3. Save → `PUT /meals/upgrade/quantity/.../meal/{mealId}` → card returns to collapsed state with new totals.
4. Delete → confirmation dialog (lightweight in-page, not a browser `confirm()`) → `DELETE /meals/delete/meal/{mealId}` → card animates out.

Only one card can be expanded at a time. Tapping a different card collapses the current one.

### Macros display

Single `MacroRings` component with two render modes:
- **Concentric** (default): four nested rings (calories outer → fat inner), no inline labels, just the rings; a tiny "tap to expand" hint below.
- **Expanded**: four equal-size rings in a 2×2 grid, each with the value+goal inside.

State (`isExpanded`) is persisted to `localStorage` as `caloriescalc:macros-expanded`. Animated transition between states via CSS `transform` (~250ms ease-out). One `<svg>` per ring; the colors come from CSS variables so they re-skin themselves under light/dark.

Over-goal coloring rules (preserved from current code, applied per metric independently):
- `< 100%` → metric color (the metric's normal palette color)
- `100% – 105%` → "near limit" — green text/ring
- `> 105%` → "over limit" — red text/ring

### Day navigation on Today

Header on `/today`: `‹  Mon, May 30  ›`. Buttons:
- Left arrow: load previous day.
- Right arrow: load next day, disabled if next-day is in the future.
- Center text: tap → opens a native `<input type="date">` picker. Desktop / mobile gracefully use the OS picker.
- A small "Today" pill appears next to the date when not on today; tap to jump back.

Date format sent to backend: `dd/MM/yyyy` (matches `UserMealsController` formatter), built in JS without going through `toLocaleDateString` (which is the current bug — locale-dependent).

### Profile tabs

`/profile` always lands on the **Profile** tab. Tab state is local, not in the URL. The bottom-nav Profile icon always returns to the Profile tab when re-tapped from another tab.

**Profile tab** (the "do something" tab):
- User identity card at top (avatar placeholder, name, current status, current activity).
- "Update weight" — number input + Save. Reminder dot if last weight is ≥ 24h old.
- "Set goals" — collapsible. Manual sliders / number inputs for kcal / protein / carbs / fat, plus an "Auto-set goal" button (calls existing `/autoSetGoal`).
- "Status" + "Activity" — two select dropdowns. Inline save on change. Note: the API still accepts integer codes (preserving current backend contract).
- "Add measurements" — collapsible form. Reminder dot if last measurement is ≥ 7 days old.
- "Change password" — collapsible. Two fields: new password, confirm new password. Submits to a NEW backend endpoint `PUT /update/password/{id}` (added as part of this work). JWT-trusted (no current-password check, per user decision).
- "Logout" — solid danger button at the bottom.

**Weight tab** (read-only history):
- Weekly average card (this week vs last week + delta, the current logic kept verbatim).
- Weight line chart (existing `WeightChart.jsx` restyled to use design tokens).
- Weight records table (sortable by date desc).
- Macro history table — date + kcal/P/C/F per day, derived from `/meals/{userId}/allMacros`. Collapsed by default behind a "Show macro history" expander.

**Body tab** (read-only history):
- Latest measurement body diagram (existing `<img src="/body-image.png">` with absolutely-positioned labels). Re-laid-out for mobile (labels stack into a list below the diagram on `< 480px` screens to avoid the off-screen label problem).
- Measurement line chart (existing `MeasurementChart.jsx`).
- Measurement records table.

### Auth forms

Single-column stacked layout. Order, labels, placeholders all match current — only the broken bits are fixed:

**RegisterPage**:
- Fields: name, age (number), gender (select: Male / Female), weight, height, username, password (with eye toggle).
- Each field has inline validation (red text below) and a top-of-form error banner for server errors.
- Gender input is bound to `formData.gender` (the current code's bug — bound to `formData.name` — is fixed).
- On success: store token + userId via existing `auth/storage.js`, then `navigate('/today')`. No success message, no manual login step.

**LoginPage**:
- Fields: username, password (with eye toggle).
- Same inline + banner validation.
- On success: navigate to `/today` (current behavior, kept).

## Design system (`src/styles/tokens.css`)

Two themes defined via CSS variables on `:root`. The dark theme is selected automatically by `@media (prefers-color-scheme: dark)`. No JS, no theme switcher UI, no manual override.

Token categories (representative, not exhaustive — final token list will be small but disciplined):

```css
:root {
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-2: #f0f0f0;
  --color-border: #e6e6e6;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --color-accent: #16a34a;
  --color-calories: #16a34a;
  --color-protein: #2563eb;
  --color-carbs: #d97706;
  --color-fat: #dc2626;
  --color-danger: #dc2626;
  --color-warn: #d97706;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
  --font-body: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f0f0f;
    --color-surface: #1a1a1a;
    --color-surface-2: #262626;
    --color-border: #2a2a2a;
    --color-text: #ededed;
    --color-text-muted: #888888;
    --color-calories: #4ade80;
    --color-protein: #60a5fa;
    --color-carbs: #fbbf24;
    --color-fat: #f87171;
  }
}
```

All component CSS Modules consume these tokens — no hard-coded colors / spacings inside any component file.

## Backend addition

One new endpoint:

```java
// UserController
@PutMapping("/update/password/{id}")
@PreAuthorize("@userAccessService.hasAccess(#id)")
public ResponseEntity<Void> updatePassword(
        @PathVariable Long id,
        @RequestBody UpdateUserPasswordRequestDTO body) {
    userService.updatePassword(id, body.newPassword());
    return ResponseEntity.ok().build();
}
```

`UpdateUserPasswordRequestDTO`: `record UpdateUserPasswordRequestDTO(@NotBlank @Size(min=6) String newPassword) {}`.

`UserServiceImpl.updatePassword(id, raw)`: looks up user, calls `passwordEncoder.encode(raw)`, saves. JWT not invalidated (per user decision — they accepted the tradeoff that compromised tokens can change password).

No DB schema change.

## Bug fixes (concrete)

These are all fixed by the redesign as a side effect, but listing them so nothing is missed:

| # | Bug | Fix |
|---|---|---|
| 1 | `RegistrationForm.js:96` — gender input `value={formData.name}` | Wired to `formData.gender` in the new RegisterPage |
| 2 | After register, no auto-login | `setToken` + `navigate('/today')` on success |
| 3 | `CaloriesCalculator.js:11` — `new Date().toLocaleDateString()` is locale-dependent | New DayPicker formats dates as `dd/MM/yyyy` explicitly |
| 4 | `handleInputChange` shows `alert` while typing | Replaced with inline validation that only fires on blur/submit |
| 5 | `UserProfile.js:142` — `records[0].date` crashes on empty | Empty-state guard + clear "no records yet" message |
| 6 | `UserProfile.js` fetches goals and discards the response | Goals state is wired up properly |
| 7 | Manual `Authorization: Bearer` headers re-added on top of axios interceptor | Removed; trust the interceptor |
| 8 | `RegistrationForm` adds class `'login-page'` to `document.body` | Page-specific styling moved into the page's own scoped CSS Module |
| 9 | `MealList` uses `key={meal.product.id}` — same product twice in a day collides | Use `key={meal.mealId}` |
| 10 | Bulgarian comments scattered in JSX | Translated to English or deleted |
| 11 | `App.css` uses an external image as background via absolute path that breaks | Background handled per-page via tokens |

## Error handling

- All API calls go through `api/*` wrappers. Each wrapper resolves with the response body or throws a normalized `ApiError { status, message, fieldErrors? }`.
- The new `GlobalExceptionHandler` on the backend (added in the previous backend round) returns `{ status, error, message, fieldErrors? }` — frontend wrappers parse this directly.
- Components show errors via `ErrorBanner` (top of form) for general errors and `Field`'s inline error slot for per-field errors.
- 401 → axios response interceptor calls `auth/storage.clear()` + `window.location = '/login'`. This is the single 401 handler — duplicated copies in components are removed.
- `alert()` is removed everywhere. The two confirmation dialogs (delete meal) become a small in-page confirmation overlay.

## Testing strategy

This project has no frontend tests today. We will not invent a heavy testing infrastructure here, but we will leave the codebase in a state where adding tests is easy:

- Pure helpers (`MacroRings`'s ring-math, `DayPicker`'s date formatting) live in plain JS modules and have unit tests with the existing CRA Jest setup.
- API wrappers in `api/*` get smoke tests with mocked axios.
- No component-level tests in this round; that's a follow-up.

Manual QA checklist (will be in the implementation plan):
- Register → land on `/today`. Macros = 0/goals. Add a meal → totals update. Refresh → meal persists.
- Edit a meal's grams → totals update. Delete → row gone, totals update.
- Profile tab → update weight → reminder dot disappears. Change password → log out → log in with new password.
- Switch device theme between light/dark → entire app updates without reload.
- All flows tested at viewport widths: 360px, 414px, 768px, 1280px.

## Implementation strategy & ordering

The redesign will be done in roughly this order so that each step is independently shippable / reviewable:

1. **Design system** (`tokens.css`, `base.css`, primitive components: `Button`, `Field`, `PasswordField`, `Sheet`, `Tabs`, `ErrorBanner`, `ReminderDot`).
2. **API layer** (`api/client.js`, `api/auth.js`, `api/meals.js`, `api/profile.js`) and the 401 interceptor consolidation.
3. **Auth pages** — `RegisterPage`, `LoginPage`. Easiest, most contained.
4. **AppShell + bottom tab bar + routes**. App is now navigable in the new shell.
5. **TodayPage skeleton** — header (DayPicker), MacroRings, MealList — using existing data calls.
6. **AddMealSheet + AddProductSheet** — full bottom-sheet flow.
7. **MealCard inline edit/delete**.
8. **ProfilePage shell + ProfileTab** (the "inputs only" tab) including Change Password.
9. **WeightTab** (charts + tables).
10. **BodyTab** (diagram + chart + table).
11. **Backend**: add `PUT /update/password/{id}` + DTO + service method.
12. **Cleanup**: delete old `.js`/`.css` files, update `App.js` → `App.jsx`, remove dead deps if any (`react-circular-progressbar` may now be unused — verify before removing).

Steps 1–4 unblock everything else; 5–10 can be reviewed independently; 11 is a 30-minute backend task that can land any time after step 8 starts (the frontend can be wired up against it once it exists).

## Open questions / risks

- **`react-scripts` 3 quirks**: CSS Modules work, but very-modern syntax (`:has()`, container queries) may not transpile cleanly. Stick to widely-supported CSS. We're not adding any modern syntax that risks this.
- **`MeasurementChart` and `WeightChart`**: I haven't read the internals. They use `chart.js` + `react-chartjs-2`; assumption is they accept props for data/colors. If they hard-code colors, I'll thread them through CSS variables.
- **Body diagram image** (`/body-image.png` with absolutely-positioned labels): on narrow viewports, the absolute layout is the broken thing. The plan above swaps to a stacked label list under the image at `< 480px`. If the image itself has a fixed pixel size that doesn't scale, we'll wrap it in a `max-width: 320px; margin: 0 auto;` container.
- **`prefers-color-scheme` in the test environment**: Jest/JSDOM doesn't fire this. The tokens layer is CSS only, no JS branching, so tests don't need to handle theme switching.

## Out of scope (recap)

- Vite migration.
- Removing `react-scripts`'s `--openssl-legacy-provider` flag.
- API contract changes beyond the password endpoint.
- New features (workouts/exercises, day summary — these are a separate effort).
- Any DB schema changes.
