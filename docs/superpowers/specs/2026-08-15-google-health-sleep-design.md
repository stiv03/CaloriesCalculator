# Google Health Sleep Import + Calendar Day View — Design

**Date:** 2026-08-15
**Status:** Approved-pending-review

## Goal

Import sleep data from the Google Health API and surface it in the calendar
day-detail drawer: total sleep duration, bed/wake times, and a sleep-stage
breakdown (REM / deep / light / awake) shown **two ways** — a compact CSS
stacked bar and a chart.js hypnogram-style timeline. Gate the import behind a
new per-user "Sleep" sync checkbox, mirroring the steps/weight/food selector
already shipped.

## What the Google Health API actually provides (verified)

From Google's own docs (`developers.google.com/health/data-types` and
`.../data-types/sleep`):

- **`sleep` IS a data type** with its own scope `googlehealth.sleep.readonly`.
- Sleep is a **session record** with this shape:
  - `name`, `startTime`, `endTime` (ISO 8601)
  - `sleepType` (e.g. `"STAGES"`)
  - `sleepStages[]` — non-overlapping segments partitioning the timeline, each
    `{ startTime, endTime, type }` where `type ∈ {LIGHT, DEEP, REM, AWAKE}`
  - `shortAwakenings[]` — brief wake transitions
  - Per-stage totals are **NOT pre-computed**; we derive them by summing
    `(endTime − startTime)` per stage type.
- **Sleep score / readiness / recovery do NOT exist** as Google Health data
  types (they are Fitbit-proprietary, behind the separate Fitbit Web API +
  Premium). Out of scope — we build sleep stages only.

The API is reached exactly like steps:
`GET https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints`
with a `filter` on the session interval, `pageSize`, and `pageToken`
pagination. Auth uses the existing refresh-token → access-token flow.

## Google Cloud Console

Add scope `https://www.googleapis.com/auth/googlehealth.sleep.readonly` to the
OAuth consent screen. No new API to enable (same Google Health API). Existing
users must reconnect to grant the new scope — the connect flow already sends
`prompt=consent`, so Disconnect → Connect re-grants. *(User has already added
the scope in the console.)*

## Storage — `SleepRecord` entity

One row per `(user, wakeDate)`. **Wake-up-day attribution:** a session is filed
under the local calendar date of its `endTime` (how sleep apps show "last
night"), computed in `ZoneId.systemDefault()` to match the steps importer.

Columns:
- `id`, `user` (ManyToOne), `date` (LocalDate, wake day) — unique `(user_id, record_date)`
- `total_minutes`, `rem_minutes`, `deep_minutes`, `light_minutes`, `awake_minutes` (int)
- `start_time`, `end_time` (Instant) — earliest start / latest end across merged sessions
- `segments` (`@Column(columnDefinition = "text")`, JSON string) — the raw
  ordered stage segments `[{start,end,type}]` needed to draw the hypnogram.
  Stored as JSON (Jackson serialize) rather than a child table: `ddl-auto`
  creates it with no join/cascade complexity, and segments are only ever read
  back whole for one day.

Naps / multiple sessions on one wake-date: merge by summing per-stage minutes,
`start_time` = min, `end_time` = max, and concatenating segments in time order.

`SleepRecordRepository` mirrors `StepRecordRepository`:
`findByUserIdAndDate`, `findByUserIdOrderByDateAsc`, `deleteAllByUserId`.

## Importer — `SleepImporter implements HealthImporter`

- `dataType()` → `"sleep"`. Auto-discovered into the existing
  `List<HealthImporter>`, so it runs through `runImporters` and is gated by
  `HealthConnectionService.isEnabled(conn, "sleep")` for free.
- 30-day look-back like steps; always re-fetch whole days so a same-day re-sync
  re-totals cleanly. Paginate identically (pageSize 1000, follow nextPageToken,
  page cap).
- For each session: bucket by `endTime` local date; sum each `sleepStages[]`
  segment's duration into the matching stage total; `total = rem+deep+light`
  (awake excluded from "asleep" total but stored for the chart); keep the raw
  segments. Upsert per date. Returns number of day-records written.
- Counts toward the sync result as its own bucket
  (`result.addSleepImported(n)`); `HealthSyncResultDTO` gains a
  `sleepImported` field + adder, and `runImporters` routes `"sleep"` to it
  (currently it's an `if steps … else weight` split — generalize to a switch).

## Sync preference — `syncSleep`

Extends the shipped pattern:
- `GoogleHealthConnection`: add `syncSleep` boolean, `@Builder.Default = true`,
  `columnDefinition = "boolean default true"`.
- `isEnabled`: add `case "sleep" -> conn.isSyncSleep();`.
- `status()`: add `syncSleep` (default true when `conn == null`).
- `updatePreferences(...)`: add a `syncSleep` param and setter.
- Controller `SyncPreferences` record: add `Boolean syncSleep` + `sleep()`
  default-true helper; pass to `updatePreferences`.
- Frontend `updateHealthPreferences` + `ProfilePage`: fourth "Sleep" checkbox,
  loaded from status (`s.syncSleep !== false`), optimistic toggle + rollback.

## Calendar surface

**Backend — `CalendarController.getMonth`:**
- Build a `sleepByDay` map from `sleepRecordRepository` filtered to the range
  (same shape as `stepsByDay`).
- `CalendarDayDTO`: append sleep fields at the **end** (positional record —
  appending keeps existing arg positions stable): `Integer sleepTotalMinutes,
  Integer sleepRem, Integer sleepDeep, Integer sleepLight, Integer sleepAwake`.
  These are enough for the calendar dot + the stacked bar + the legend.
- New endpoint `GET /api/v1/calendar/{userId}/sleep/{date}` returning the raw
  segments for that day (the hypnogram needs them; keeping them off the month
  payload keeps that response small). `@PreAuthorize` like the others. Returns
  `{ date, startTime, endTime, totalMinutes, segments:[{start,end,type}] }` or
  404/empty when no sleep that day.

**Frontend — day drawer (`CalendarPage.jsx` `selected` sheet):**
- New "Sleep" `summarySection`, shown when `sleepTotalMinutes` is present:
  - Header line: `7h 12m` + `11:20pm – 7:05am` (derive times from the segment
    fetch or start/end).
  - **CSS stacked bar:** one flex row, four segments sized by stage minutes,
    distinct colors (deep = darkest, light, rem, awake = lightest/greyed), with
    a legend `Deep 1h05 · Light 3h40 · REM 1h50 · Awake 0h37`.
  - **chart.js hypnogram:** on opening the day, fetch the segment timeline and
    draw a stepped timeline (x = clock time, y = stage lane). Uses the existing
    chart.js/react-chartjs-2 dependency. Lazy — only fetched when a day with
    sleep is opened.
- Calendar cell **dot** for days with sleep (add `dotSleep`), plus a legend
  entry, matching the existing dot pattern.

## Data flow

```
Google Health  ──sleep/dataPoints──▶  SleepImporter  ──upsert──▶  SleepRecord
                                          (gated by syncSleep)         │
                                                                       ├─ month rollup ▶ CalendarDayDTO.sleep* ▶ dot + stacked bar
                                                                       └─ /calendar/{u}/sleep/{date} ▶ segments ▶ hypnogram
```

## Error handling

- Importer is already isolated per `runImporters`: a sleep failure records an
  error in the breakdown and never aborts steps/weight/food.
- Missing/short/`sleepType != STAGES` sessions: if no `sleepStages`, store total
  from `endTime − startTime` with zeroed stage minutes and empty segments (bar
  degrades to a single block; hypnogram shows a flat "asleep" band).
- Segment JSON parse failure on read → treat as no-segments (still show totals).
- Day with no sleep → no section, no dot; drawer's existing "No other data"
  fallback still applies when nothing else is logged.

## Testing

- Unit test `SleepImporter` stage-summing and wake-day bucketing against a
  canned JSON session (pure function over parsed data points, no live call) —
  mirrors how we tested steps logic.
- Extend `HealthConnectionServiceTest`: `isEnabled(conn, "sleep")` respects the
  flag and unknown-type default still holds.
- Manual: connect, Sync now, open a day with sleep → verify bar + hypnogram +
  times; toggle Sleep off → confirm subsequent sync skips it.

## Out of scope

- Sleep score, readiness, recovery (not exposed by Google Health API).
- Editing/manual sleep entry. Import-only.
- Historical backfill beyond the 30-day look-back.
