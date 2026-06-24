# Rest Day Logging — Design

## Problem

The calendar score gives 25 points for `hasWorkout` (`frontend/src/features/calendar/CalendarPage.jsx:25`). A legitimate rest day looks identical to a skipped day, so users lose 25 points for resting on purpose. We need a way to flag a date as a deliberate rest day so it counts toward the workout slice of the daily score.

## Goals

- One‑click "mark this day as rest" from the calendar day info panel.
- Rest days count toward the existing 25‑pt `hasWorkout` score slice (no scoring formula change).
- Rest days are visually distinct from workout days on the month grid (a "Rest" badge / glyph, not the same workout dot).
- A user opening the workout page on a date already flagged as rest sees a read‑only "Rest day — tap to clear" banner instead of an empty workout editor.
- Logging a real workout on a day implicitly clears the rest flag (a workout always wins).
- The rest toggle is only offered when there is no workout already logged for that day. If a workout exists, the toggle is hidden.

## Non‑goals

- No new score weight; rest day reuses the existing `hasWorkout` 25 pts.
- No bulk "mark this week as rest" or recurring rest schedule.
- No rest‑day analytics beyond the calendar visual (no rest‑day count on the workout page volume charts, etc.).
- No notes/labels on a rest day in v1.

## Data model

A rest day is stored as a `Workout` row, reusing the existing `(user_id, date)` identity. This means:

- The existing `CalendarController` `workoutByDay` map and `hasWorkout` boolean already cover rest days for free.
- The frontend `dayScore()` function does not change.

Changes to `entity/Workout.java`:

- Add `private boolean restDay;` (column `rest_day`, default `false`). With Hibernate `ddl-auto=update`, the column is added with `false` for existing rows.
- `exerciseType` stays `nullable = false`. To avoid nullability churn, we add a new `REST` value to `entity/enums/ExerciseType.java`. Rest‑day rows are stored as `exerciseType = REST, restDay = true, exercises = []`.

Changes to `dto/CalendarDayDTO.java`:

- Add `boolean isRestDay` at the end of the record.
- `CalendarController` populates it as `w != null && w.isRestDay()`.

Filters that read `w.getExerciseType().name()` for volume/history (`WorkoutServiceImpl` lines 169, 174, 229, 236) keep working — they just see a new enum value. The volume‑progress endpoint filters by `dayName`, which is the user‑selected workout type; `REST` will never be passed there in normal use, so rest rows are naturally excluded from volume aggregation.

## Backend API

One new endpoint on the existing workout controller:

```
PUT /api/v1/workouts/{userId}/rest-day?date=YYYY-MM-DD
Body: { "rest": true | false }
```

- `@PreAuthorize("@userAccessService.hasAccess(#userId)")` like every other workout endpoint.
- `rest: true` upserts a `Workout` row for `(userId, date)` with `exerciseType=REST, restDay=true, exercises=[], label=null, templateId=null`.
- `rest: false` deletes the rest‑day `Workout` row for that date if and only if `restDay = true`. Non‑rest workouts are never touched by this endpoint.
- If a non‑rest workout already exists for that date and `rest: true` is requested → `409 Conflict` with body `{ "error": "WORKOUT_EXISTS" }`. The frontend won't call it in that case (toggle is hidden), but the server enforces this too.
- Response: `204 No Content` on success.

`WorkoutServiceImpl.logWorkout` is updated so that if a rest‑day row exists for the same date, it is replaced (rest flag cleared) before inserting the new workout — "a real workout always wins."

`WorkoutRepository` gets one new finder:

```java
Optional<Workout> findByUserIdAndDate(Long userId, LocalDate date);
```

## Frontend

### Calendar day info drawer (`CalendarPage.jsx`)

State of the selected day determines what's rendered in the drawer:

| `hasWorkout` | `isRestDay` | Drawer shows                                                     |
| ------------ | ----------- | ---------------------------------------------------------------- |
| `false`      | `false`     | Button: **"Mark as rest day"**                                   |
| `true`       | `true`      | Rest pill + button: **"Unmark rest day"**                        |
| `true`       | `false`     | Existing workout summary, no rest toggle                         |

Clicking calls the new endpoint, then refreshes the month range so the cell badge updates.

### Month grid badge

Each cell already shows a workout dot when `hasWorkout` is true. Add a second variant: when `isRestDay` is true, render a small "💤" glyph (or a `Z` badge using existing badge styles in `CalendarPage.module.css`) instead of the workout dot. Same 25 pts contribution, distinct visual.

### Workout page banner (`WorkoutPage.jsx`)

The workout page already loads the workout (if any) for the selected date. When the loaded workout has `restDay = true`:

- Hide the exercise editor / template picker entirely.
- Show a banner: **"💤 Rest day — tap to clear"**. Tapping it calls the `rest-day` endpoint with `rest: false` and reloads the page state, revealing the normal empty‑day editor.
- If the user picks a template / starts logging exercises (via the existing flow) it goes through `POST /log`, which now clears the rest flag server‑side per the `logWorkout` change above.

The workout list / history view filters out rest‑day rows so they don't appear as logged workouts.

### API client (`frontend/src/api/workouts.js` or wherever workout calls live)

Add `setRestDay(userId, date, rest)` that wraps the new endpoint. `CalendarPage` and `WorkoutPage` both call it.

## Scoring

No change. `dayScore()` already adds 25 when `hasWorkout` is true, and a rest day has `hasWorkout = true` because there's a `Workout` row for that date.

## Edge cases

- **User marks rest day then logs a workout** — `logWorkout` finds the existing `(userId, date)` rest row, deletes it, and inserts the new workout. `hasWorkout` stays true; `isRestDay` flips to false.
- **User deletes the workout that replaced a rest day** — the day reverts to `hasWorkout=false`. The user can re‑mark it as rest from the calendar.
- **Pre‑existing `Workout` rows** — `restDay` defaults to `false`, so nothing in the existing data is misinterpreted.
- **Volume / history endpoints** — already filter by user‑provided `dayName` (PUSH/PULL/LEGS/etc.). `REST` is never one of those values in the UI, so rest rows are excluded naturally. `getHistory` returns all workouts including rest rows; the frontend history view filters them client‑side (`workout.restDay === true` → skip). One‑line filter.
- **Multiple toggles same day** — endpoint is idempotent for the requested state.

## Files touched

Backend:
- `entity/Workout.java` — add `restDay` field.
- `entity/enums/ExerciseType.java` — add `REST`.
- `dto/CalendarDayDTO.java` — add `isRestDay`.
- `controller/WorkoutController.java` — add `PUT /rest-day` handler.
- `service/WorkoutService.java` + `service/implementations/WorkoutServiceImpl.java` — add `setRestDay`; update `logWorkout` to clear existing rest row.
- `repository/WorkoutRepository.java` — add `findByUserIdAndDate`.
- `controller/CalendarController.java` — populate `isRestDay` in the DTO.

Frontend:
- `frontend/src/api/workouts.js` (or equivalent) — add `setRestDay`.
- `frontend/src/features/calendar/CalendarPage.jsx` + `.module.css` — drawer toggle, month‑grid rest badge.
- `frontend/src/features/workout/WorkoutPage.jsx` + `.module.css` — rest‑day banner, hide editor when rest, filter rest rows from history list.

## Testing

There is essentially no backend test suite today (one `contextLoads` test). For this change we'll add a focused integration test on the service:

- `WorkoutServiceImplTest.setRestDay_creates_then_clears` — toggling rest on then off leaves no row.
- `WorkoutServiceImplTest.setRestDay_conflicts_with_existing_workout` — 409 when a non‑rest workout exists.
- `WorkoutServiceImplTest.logWorkout_clears_pre_existing_rest` — logging a real workout on a rest day replaces it.

Frontend: manual verification per the new drawer states and the workout‑page banner. No automated frontend tests exist for these pages.
