# Desktop Layout Redesign

**Date:** 2026-06-11
**Branch:** frontend-redesign
**Status:** Spec — awaiting user review

## Problem

The frontend works on phone but isn't optimized for desktop browsers. On
wide screens, the current `AppShell` shows a thin top bar with two pill-like
links ("Today" and "Profile") and the page content remains a 720px-wide
column centered in a sea of empty pixels. The two bottom-tab buttons
("Today", "Profile") work for mobile but feel out of place on a desktop
browser.

## Goals

- On desktop (`≥ 768px`): replace the bottom/top tab pair with a persistent
  left sidebar; lay out the Today and Profile pages so they use the
  available width sensibly.
- On mobile (`< 768px`): keep the current behavior — bottom tab bar, single
  720px-capped column. No regressions.
- One responsive shell. CSS-driven media queries; no JS-based viewport
  detection that would risk first-paint flicker.
- Match the existing design-token / CSS-modules idiom. No new dependencies.

## Non-goals

- No backend API changes.
- No changes to dark mode handling — existing tokens already cover both
  themes.
- No new pages or features. This redesign moves and reshapes existing
  surfaces only.
- No changes to authentication semantics; we just cache `username` in
  `localStorage` alongside `userId`.

## Architecture (Approach A — single responsive shell)

Single `AppShell` component renders the nav and an `<Outlet />`. CSS media
queries flip the nav between bottom-tab-bar (mobile) and left-sidebar
(desktop). The same DOM is rendered on both viewports.

```
┌──────────┬────────────────────────────────┐
│ Sidebar  │ Page content                   │
│ 🍽 Today │   (Today or Profile)           │
│ 👤 Profile│                                │
│          │                                │
│  ────    │                                │
│  [Avatar]│                                │
│  username│                                │
└──────────┴────────────────────────────────┘
                    desktop (≥ 768px)

┌─────────────────────────────────┐
│ Page content (capped 720px)     │
│                                 │
│                                 │
├─────────────────────────────────┤
│ 🍽 Today      │  👤 Profile     │
└─────────────────────────────────┘
                    mobile (< 768px)
```

The chosen breakpoint, **`768px`**, matches the breakpoint already in use
in `AppShell.module.css`, `Sheet.module.css`, and `TodayPage.module.css`.
We do not introduce additional breakpoints.

## Design tokens

Three new entries in `frontend/src/styles/tokens.css`, applied to `:root`:

```css
--sidebar-width: 240px;
--sub-nav-width: 200px;
--content-max: 1200px;
```

`--content-max` caps the outer content column on extra-wide screens so
content stays readable; existing per-page `max-width: 720px` remains on
mobile and inside the desktop content area where appropriate.

## Component changes

### `components/AppShell.jsx` + `AppShell.module.css`

Replace the current two-`NavLink` shell with the structure shown below.
Same DOM on both viewports; CSS handles orientation.

```jsx
<div className={styles.shell}>
  <nav className={styles.primaryNav} aria-label="Primary">
    <ul className={styles.navList}>
      <li><NavLink to="/today">🍽 Today</NavLink></li>
      <li><NavLink to="/profile">👤 Profile</NavLink></li>
    </ul>
    <div className={styles.userBlock}>
      <NavLink to="/profile" className={styles.userLink}>
        <span className={styles.avatar}>{initial}</span>
        <span className={styles.userName}>{username}</span>
      </NavLink>
    </div>
  </nav>
  <main className={styles.main}>
    <Outlet />
  </main>
</div>
```

CSS shape:

- Mobile (default): `.shell` is `flex-direction: column`. `.primaryNav` is
  `position: fixed; bottom: 0` with the existing tab-bar styling. The
  `.userBlock` is hidden on mobile (it's redundant with the existing
  Profile entry).
- Desktop (`@media (min-width: 768px)`): `.shell` is `flex-direction: row`.
  `.primaryNav` is `position: sticky; top: 0; height: 100vh;
  width: var(--sidebar-width)`, with a right border instead of a top
  border. `.navList` items become full-width row links with icon + label.
  `.userBlock` is shown at the bottom of the sidebar (`margin-top: auto`)
  with avatar + username, both inside a single `NavLink` to `/profile`.

The `.userBlock` link wraps both the avatar and the name so the entire row
is one click target — keeps keyboard/screen-reader semantics simple.

### `auth/storage.js`

Add username caching:

```js
const USERNAME_KEY = 'username';
export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const setUsername = (u) => localStorage.setItem(USERNAME_KEY, String(u));
// clearAuth() additionally removes USERNAME_KEY
```

### `features/auth/LoginPage.jsx` and `RegisterPage.jsx`

Both already have `form.username` in scope when the auth call returns
successfully. After `setUserId(userId)`, also call
`setUsername(form.username)`. No backend changes required.

### Fallback for users authed before this change

If `getUsername()` returns `null`, the sidebar shows a `?` initial and
hides the username text. The user becomes "named" again on their next
login.

### `features/today/TodayPage.jsx` + `TodayPage.module.css`

Mobile keeps the current single-column layout (header → MacroRings →
meal list → FAB). Desktop becomes a two-column dashboard inside the page:

```
┌──────────────────────┬──────────────────────────────┐
│ Day header + macros  │ + Add meal                  │
│ (sticky on desktop)  │ Breakfast …                  │
│                      │ Lunch …                      │
│                      │ Dinner …                     │
└──────────────────────┴──────────────────────────────┘
```

CSS:

- `.page` becomes `max-width: var(--content-max)`; existing 720px cap
  applies only on mobile.
- New `.layout` wrapper that, on desktop, is
  `display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: var(--space-5);`. On mobile it's a flex column.
- `.macroSection` becomes `position: sticky; top: var(--space-4)` on
  desktop so the rings remain visible while scrolling the meal list.
- `.fab` is hidden on desktop (`display: none`). A new inline button —
  reusing the existing `Button` primitive (`variant="primary"`) — sits at
  the top of the meal-list column on desktop. On mobile this inline button
  is hidden and the FAB stays.

The two are mutually exclusive at any viewport; both render in the DOM,
CSS picks one. The existing FAB classname is kept; we add a new
`.addMealInline` class that's `display: none` by default and `display:
block` on desktop.

### `features/profile/ProfilePage.jsx` + `ProfilePage.module.css`

Mobile keeps the current header + horizontal `Tabs` (Profile / Weight /
Body). Desktop shows the same three tab keys as a vertical sub-nav column
beside the active tab content.

```
┌──────────────┬──────────────────────────────┐
│ Profile      │  …active tab content…        │
│ Weight       │                              │
│ Body         │                              │
└──────────────┴──────────────────────────────┘
```

Implementation:

- Keep the existing `Tabs` component and active-tab state. `Tabs` already
  renders horizontally — wrap it in a class that renders horizontally on
  mobile and as a vertical list of buttons on desktop. We do this by
  swapping the `Tabs` markup with a small inline render — list of
  `<button>`s where the active one has the active style. Tabs's existing
  CSS module is not modified.
- `.layout` mirrors the Today layout: flex column on mobile, grid
  (`var(--sub-nav-width) 1fr`) on desktop.
- Remove the centered avatar/`summary` block on desktop (it's redundant
  with the sidebar's user block); keep it on mobile.

### Sheets (`components/Sheet.jsx`)

**No changes.** The existing `Sheet.module.css` already contains a
`@media (min-width: 768px)` block that reshapes the slide-up sheet into a
centered modal (max-width 460px, scaled-fade-in animation). The desktop
modal behavior is already implemented; we just verify it on the redesign.

## File-by-file change summary

| File | Change |
|---|---|
| `frontend/src/styles/tokens.css` | Add `--sidebar-width`, `--sub-nav-width`, `--content-max` |
| `frontend/src/components/AppShell.jsx` | Add user block; restructure nav DOM |
| `frontend/src/components/AppShell.module.css` | Rewrite responsive nav (bottom tab bar → left sidebar) |
| `frontend/src/auth/storage.js` | Add `getUsername`/`setUsername`; clear in `clearAuth` |
| `frontend/src/features/auth/LoginPage.jsx` | Call `setUsername` on login |
| `frontend/src/features/auth/RegisterPage.jsx` | Call `setUsername` on register |
| `frontend/src/features/today/TodayPage.jsx` | Wrap content in `.layout`; render inline add-meal button alongside FAB |
| `frontend/src/features/today/TodayPage.module.css` | Two-column grid on desktop; sticky macros; hide FAB on desktop |
| `frontend/src/features/profile/ProfilePage.jsx` | Render sub-nav as vertical buttons on desktop, horizontal `Tabs` on mobile |
| `frontend/src/features/profile/ProfilePage.module.css` | Layout grid + hide mobile summary on desktop |

No new files. No new components. No new dependencies. No backend changes.

## Testing

There is one Spring backend test and no frontend test suite to lean on.
Verification is manual:

1. **Mobile viewport (≤ 767px, e.g., DevTools 390×844):**
   - `/today` shows the current single-column layout with bottom tab bar
     and FAB.
   - `/profile` shows centered avatar + horizontal Profile/Weight/Body
     tabs.
   - AddMealSheet slides up from the bottom.
2. **Desktop viewport (≥ 768px, e.g., DevTools 1280×800):**
   - Sidebar visible on the left with `🍽 Today`, `👤 Profile`, and the
     user block at the bottom showing the logged-in username.
   - `/today` shows two columns: macros + day picker on the left
     (sticky), meal list with inline `+ Add meal` button on the right. No
     FAB.
   - `/profile` shows vertical sub-nav (Profile/Weight/Body) on the left
     and active-tab content on the right. No centered avatar/summary
     block at the top.
   - AddMealSheet renders as a centered modal (existing behavior).
3. **Cross-viewport:**
   - Resize the browser across the 768px breakpoint with both pages open;
     no flicker or layout shift beyond the breakpoint flip itself.
   - Logout from Profile clears `username` along with token/userId.
   - A logged-in user with no cached `username` (simulate by deleting the
     `username` localStorage entry) sees a `?` initial and no name; rest
     of the app works.

## Risks / open questions

- **`username` privacy in `localStorage`.** Username is already
  effectively public (it's the JWT subject). Caching the literal string
  doesn't widen the attack surface, but it does mean a stale username
  could persist if the user changes it server-side without re-logging in.
  Acceptable for now — username changes aren't a feature. If they become
  one, refresh `username` after that flow too.
- **Sticky macros and tall meal lists.** On viewports between 768px and
  ~900px tall with many meals, the sticky macros block could occupy too
  much vertical space. Mitigation: keep the rings element compact; if it
  feels cramped at QA time, drop the sticky behavior — it's a one-line
  change.
- **Z-index against existing sheet/modal layers.** The sidebar lives at
  no explicit z-index (default `auto`). Sheets use `--z-sheet-backdrop:
  100` / `--z-sheet: 110`, both above the sidebar. Confirmed safe.
