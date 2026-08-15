# Google workout enrichment (on-demand, per history cell)

**Date:** 2026-08-15
**Status:** Approved for implementation

## Goal

In the Workout **History** tab, each logged session is shown as a dated column in
`SessionsTable`. The user starts their lifts in the Google Health app as a
**WEIGHTLIFTING** activity. They want to click a session's **date header** and see
that day's Google WEIGHTLIFTING session details pulled live: session type +
duration, heart rate (avg/min/max), and time in heart-rate zones.

Matching is purely **by date** (the app's session date ↔ the Google session's
local calendar day). Data is **read-only and NOT persisted** — it's fetched on
click, shown in a small panel, and discarded.

## Non-goals

- Not importing Google sessions as new workout-history rows.
- Not storing anything in the DB (no new entity, no migration).
- Not touching the daily scheduled sync or existing importers.
- Only WEIGHTLIFTING sessions are surfaced; other exercise types are ignored.

## Feasibility & the one real risk

The app already requests `googlehealth.activity_and_fitness.readonly` in
`GoogleHealthClient.SCOPE`. The Google Health API v4 exposes:
- `exercise` dataType — session with `interval` (start/end + UTC offset) and an
  `exerciseType` enum (includes `WEIGHTLIFTING`).
- `heartRate` dataType — per-sample `beatsPerMinute` + `sampleTime`.
- Time-in-HR-zone — a **rollup** value type, fetched from the aggregate/rollup
  endpoint, not the raw exercise session.

**Risk:** whether the connected account was actually granted this scope with a
usable refresh token, and whether the device wrote HR/zone data, is unknown until
tried against a real token. **Validation step 0 (below) verifies this against the
live API before building the UI.** If zones/HR are absent for the device, the
feature still works for type + duration; HR/zones degrade to "not available".

## Architecture

### Backend

1. **`HealthConnectionService.mintAccessToken(Long userId)`** — extract the
   refresh-token→access-token logic currently inline in `runImporters` into a
   reusable method. Returns a fresh access token or throws if not connected.

2. **`ActivityService`** (new, in `service/health/`) — given `userId` + `LocalDate`:
   - Fetch `exercise` dataPoints filtered to that local day
     (`exercise.interval.start_time within [date 00:00, date+1 00:00)` in the
     server's fixed zone, mirroring `StepImporter`'s zone approach).
   - Keep only points whose `exerciseType == "WEIGHTLIFTING"`.
   - If none → return `{ found: false }`.
   - For the matched session(s), compute:
     - `durationMin` from the interval(s).
     - `heartRate` samples within the session window → avg / min / max.
     - Time-in-zone from the rollup endpoint scoped to the window (best-effort;
       omit if unavailable).
   - Multiple WEIGHTLIFTING sessions on one day are merged (summed duration,
     pooled HR samples).

3. **Endpoint** on `HealthConnectionController`:
   `GET /api/v1/health/activity/{userId}?date=YYYY-MM-DD`
   `@PreAuthorize("@userAccessService.hasAccess(#userId)")` (mirrors siblings).
   Returns `ActivityDTO`. On not-connected / API error, returns a shaped body
   (`found:false` + optional `reason`) rather than a 500 — never log the user out.

4. **`ActivityDTO`** (new record in `dto/`):
   ```
   { boolean found, String exerciseType, Integer durationMin,
     Integer avgHr, Integer minHr, Integer maxHr,
     List<Zone> zones,   // Zone = { String name, Integer minutes }, may be empty
     String reason }     // e.g. "not_connected", null when found
   ```

### Frontend

5. **`src/api/health.js`** — add `getActivityForDate(userId, date)` →
   `GET /health/activity/{userId}?date=...`.

6. **`SessionsTable`** (in `WorkoutPage.jsx`) — make the date `<th>` a button.
   On click, call the API for that column's `w.date`, open a small panel
   (drawer/popover) rendering:
   - `WEIGHTLIFTING · 52 min`
   - `HR avg 128 · min 96 · max 171` (hidden if no HR)
   - Zone bars: `Fat burn 18m · Cardio 22m · Peak 6m` (hidden if empty)
   - Loading + "No Google workout found for this date." states.
   The panel owns its own fetch/loading/error state; nothing is stored on the
   session object. Only render the affordance when the user is health-connected
   (reuse existing status the page can read, or attempt-and-degrade).

## Data flow

click date header → `getActivityForDate(userId, w.date)`
→ `GET /health/activity/{id}?date` → `ActivityService`
→ `mintAccessToken` → Google `exercise` dataPoints (filter day, keep WEIGHTLIFTING)
→ HR samples + zone rollup for the window → `ActivityDTO` → panel renders.

## Error handling

- Not connected → `{ found:false, reason:"not_connected" }`; panel shows a
  "Connect Google Health in Profile" hint.
- Token refresh / API failure → `{ found:false, reason:"error" }`; panel shows a
  generic "Couldn't load Google data" message. No 5xx to the browser.
- No WEIGHTLIFTING session that day → `{ found:false }`; panel shows "No Google
  workout found for this date."
- HR/zone missing but session found → `found:true` with those fields null/empty;
  panel omits those rows.

## Testing

- Backend: unit-test `ActivityService`'s day-filter + WEIGHTLIFTING selection +
  HR aggregation against a canned Google JSON payload (no live call).
- Frontend: the panel's found / not-found / not-connected / loading states.
- Manual: **step 0** — hit the live endpoint for a date with a known Google lift
  to confirm the scope/token works and to capture the real JSON shape (the
  `exercise`, `heartRate`, and zone-rollup response bodies) BEFORE finalizing the
  parsing records — same "verify the shape" approach used for steps.

## Implementation order

0. Validation spike: mint a token for the connected user, call the `exercise`
   endpoint for a known lift date, log the raw JSON. Confirm scope + shape.
1. Backend: `mintAccessToken` extract + `ActivityDTO` + `ActivityService` +
   endpoint. Unit test with canned payload.
2. Frontend: API client + clickable header + panel + states.
3. Manual end-to-end against the real account.
