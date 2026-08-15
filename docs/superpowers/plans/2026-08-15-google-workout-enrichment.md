# Google Workout Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user click a session's date in the Workout History table and see that day's Google Health WEIGHTLIFTING session (type + duration, avg/min/max HR, time-in-HR-zones), fetched live and never persisted.

**Architecture:** A new read-only endpoint `GET /api/v1/health/activity/{userId}?date=YYYY-MM-DD` mints a fresh access token from the stored refresh token (logic extracted from `HealthConnectionService.runImporters` into `mintAccessToken`), queries Google Health v4 `exercise` dataPoints for that local day, keeps only `WEIGHTLIFTING`, then queries `heartRate` dataPoints within the session window for HR stats. Results are shaped into `ActivityDTO` and returned; nothing is written to the DB. The frontend makes each history date header a button that opens a panel showing the metrics.

**Tech Stack:** Spring Boot 3.3 / Java 17, Spring `RestClient`, Jackson records with `@JsonIgnoreProperties(ignoreUnknown=true)`, JUnit 5 + AssertJ. Frontend: React (CRA 3), axios via `frontend/src/api/client.js`, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-15-google-workout-enrichment-design.md`

## Global Constraints

- Google Health API base: `https://health.googleapis.com/v4` (Health-Connect v4, NOT the legacy Fitness API). Reuse `GoogleHealthClient.HEALTH_BASE`.
- Day bucketing uses ONE fixed zone `ZoneId.systemDefault()` — mirror `StepImporter`, never trust per-interval UTC offsets.
- All Jackson response records: `@JsonIgnoreProperties(ignoreUnknown = true)`.
- The endpoint MUST NOT return 5xx/401 for a not-connected user or a Google API failure — it returns a shaped `ActivityDTO` with `found=false` and a `reason`. (Matches `syncNow`'s never-log-out behavior.)
- Endpoint authz: `@PreAuthorize("@userAccessService.hasAccess(#userId)")` — mirror every sibling route in `HealthConnectionController`.
- CRA build/tests require `NODE_OPTIONS=--openssl-legacy-provider`. `CI=true` fails on lint warnings (pre-existing warnings exist — do NOT run frontend build with `CI=true`).
- Backend commits are unsigned in this environment: use `git commit --no-gpg-sign`.
- Nothing is persisted: no new entity, no repository, no migration.
- Only WEIGHTLIFTING sessions are surfaced. Multiple WEIGHTLIFTING sessions on one day are MERGED: summed duration, pooled HR samples.

---

## Task 0: Validation spike — confirm scope, token, and JSON shape (throwaway)

**Why first:** The `exercise`/`heartRate` JSON shapes and whether the connected account actually granted `activity_and_fitness.readonly` with HR/zone data are unknown until hit against a real token. The steps importer needed several passes to parse correctly (see git log `99f23df`, `bb4849c`). We verify the shape cheaply before writing parsing records. **This task writes throwaway diagnostic code that Task 3 deletes.**

**Files:**
- Modify (temporarily): `src/main/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionService.java`

**Interfaces:**
- Consumes: existing `client.refresh(...)`, `cipher.decrypt(...)`, `connectionRepo.findByUserId(...)`.
- Produces: nothing permanent — a log line with raw JSON. No signature other code depends on.

- [ ] **Step 1: Add a temporary diagnostic method to `HealthConnectionService`**

Add this method (temporary — deleted in Task 3 Step 8). It reuses the same refresh flow as `runImporters`:

```java
/** TEMP spike (remove after Task 0): log the raw exercise + heartRate JSON for one day. */
public String debugExerciseJson(Long userId, java.time.LocalDate date) {
    var conn = connectionRepo.findByUserId(userId).orElse(null);
    if (conn == null) return "not_connected";
    var refreshed = client.refresh(cipher.decrypt(conn.getRefreshTokenEnc()));
    String token = refreshed.accessToken();
    java.time.ZoneId zone = java.time.ZoneId.systemDefault();
    java.time.Instant from = date.atStartOfDay(zone).toInstant();
    java.time.Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();
    var rest = org.springframework.web.client.RestClient.create();
    String filter = "exercise.interval.start_time >= \"" + from + "\" AND "
            + "exercise.interval.start_time < \"" + to + "\"";
    String body = rest.get().uri(b -> b.scheme("https").host("health.googleapis.com")
            .path("/v4/users/me/dataTypes/exercise/dataPoints")
            .queryParam("filter", filter).queryParam("pageSize", 100).build())
            .header("Authorization", "Bearer " + token)
            .retrieve().body(String.class);
    log.info("SPIKE exercise[{}] raw = {}", date, body);
    return body;
}
```

- [ ] **Step 2: Expose it on the controller temporarily**

Add to `HealthConnectionController` (temporary — deleted in Task 3 Step 8):

```java
@GetMapping("/debug/exercise/{userId}")
@PreAuthorize("@userAccessService.hasAccess(#userId)")
public ResponseEntity<String> debugExercise(@PathVariable Long userId,
        @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
    return ResponseEntity.ok(service.debugExerciseJson(userId, date));
}
```

- [ ] **Step 3: Build and run the backend**

Run: `./mvnw -q -DskipTests package && ./mvnw spring-boot:run`
Expected: app starts on :8080.

- [ ] **Step 4: Hit the spike endpoint for a known lift date**

**REQUIRES USER INPUT:** a date the user logged a WEIGHTLIFTING session in Google Health, plus a valid JWT + userId. Ask the user to run (in the REPL with `!`) or provide the values:

```bash
# Replace <TOKEN>, <USERID>, <DATE=YYYY-MM-DD>
curl -s "http://localhost:8080/api/v1/health/debug/exercise/<USERID>?date=<DATE>" \
  -H "Authorization: Bearer <TOKEN>" | tee /tmp/exercise.json
```

Then check the server log for `SPIKE exercise[...] raw = ...`.

- [ ] **Step 5: Record the observed shape**

Read `/tmp/exercise.json`. Confirm and note down the ACTUAL field names for:
- session start/end time (expected under `dataPoints[].exercise.interval.startTime` / `endTime`)
- exercise type field + how `WEIGHTLIFTING` appears (string value under `exercise.exerciseType`?)
- whether HR / zone data is present inline or absent (informs whether the separate `heartRate` query is needed).

Write the confirmed shape as a comment block into the spike method temporarily, or paste into chat. **Task 2's records MUST match this observed shape** — if it differs from the spec's assumption, update Task 2's field mappings before implementing.

- [ ] **Step 6: Also capture the heartRate shape for the session window**

Using the session start/end observed in Step 5, run a second curl against `heartRate` (adjust filter field name if Step 5 shows a different convention):

```bash
curl -s "http://localhost:8080/api/v1/health/debug/exercise/<USERID>?date=<DATE>"  # already have exercise
# For heartRate, temporarily change the path in debugExerciseJson to:
#   /v4/users/me/dataTypes/heartRate/dataPoints
#   filter: heartRate.interval.start_time >= "<sessionStart>" AND heartRate.interval.start_time < "<sessionEnd>"
```

Note the HR sample shape (expected `dataPoints[].heartRate` with a beats-per-minute number + a sample time). If HR is absent for this device, record that — Task 2/3 must degrade gracefully (session still `found:true`, HR fields null).

- [ ] **Step 7: Stop the app**

Stop the running `spring-boot:run` (Ctrl-C in that terminal). Do NOT commit the spike code — it is deleted/superseded in Task 3. Leave the temporary methods in place until Task 3 Step 8 removes them (so the app still compiles between tasks); do not commit them.

---

## Task 1: Extract `mintAccessToken` on `HealthConnectionService`

**Files:**
- Modify: `src/main/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionService.java`
- Test: `src/test/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionServiceTest.java`

**Interfaces:**
- Produces: `public String mintAccessToken(Long userId)` — returns a fresh Google access token for the connected user; throws `IllegalStateException("not_connected")` if no connection, `IllegalStateException("token_refresh_failed")` if refresh yields no token. `ActivityService` (Task 3) consumes this.

- [ ] **Step 1: Write the failing test**

The refresh path calls Google, so unit-test only the no-connection branch (no live HTTP). Add to `HealthConnectionServiceTest`. This needs a `HealthConnectionService` instance; construct it with a repo stub that returns empty. Add this test + a minimal hand-rolled stub:

```java
    @Test
    void mintAccessTokenThrowsWhenNotConnected() {
        var repo = new com.stoyandev.caloriecalculator.repository.GoogleHealthConnectionRepository() {
            public java.util.Optional<GoogleHealthConnection> findByUserId(Long userId) { return java.util.Optional.empty(); }
            // remaining JpaRepository methods unused in this test:
            public <S extends GoogleHealthConnection> S save(S e) { return e; }
            public java.util.Optional<GoogleHealthConnection> findById(Long id) { return java.util.Optional.empty(); }
            public boolean existsById(Long id) { return false; }
            public java.util.List<GoogleHealthConnection> findAll() { return java.util.List.of(); }
            public java.util.List<GoogleHealthConnection> findAllById(Iterable<Long> ids) { return java.util.List.of(); }
            public long count() { return 0; }
            public void deleteById(Long id) {}
            public void delete(GoogleHealthConnection e) {}
            public void deleteAllById(Iterable<? extends Long> ids) {}
            public void deleteAll(Iterable<? extends GoogleHealthConnection> e) {}
            public void deleteAll() {}
            public void deleteByUserId(Long userId) {}
            public <S extends GoogleHealthConnection> java.util.List<S> saveAll(Iterable<S> e) { return java.util.List.of(); }
            public void flush() {}
            public <S extends GoogleHealthConnection> S saveAndFlush(S e) { return e; }
            public <S extends GoogleHealthConnection> java.util.List<S> saveAllAndFlush(Iterable<S> e) { return java.util.List.of(); }
            public void deleteAllInBatch(Iterable<GoogleHealthConnection> e) {}
            public void deleteAllByIdInBatch(Iterable<Long> ids) {}
            public void deleteAllInBatch() {}
            public GoogleHealthConnection getOne(Long id) { return null; }
            public GoogleHealthConnection getById(Long id) { return null; }
            public GoogleHealthConnection getReferenceById(Long id) { return null; }
            public <S extends GoogleHealthConnection> java.util.Optional<S> findOne(org.springframework.data.domain.Example<S> ex) { return java.util.Optional.empty(); }
            public <S extends GoogleHealthConnection> java.util.List<S> findAll(org.springframework.data.domain.Example<S> ex) { return java.util.List.of(); }
            public <S extends GoogleHealthConnection> java.util.List<S> findAll(org.springframework.data.domain.Example<S> ex, org.springframework.data.domain.Sort sort) { return java.util.List.of(); }
            public <S extends GoogleHealthConnection> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> ex, org.springframework.data.domain.Pageable p) { return org.springframework.data.domain.Page.empty(); }
            public <S extends GoogleHealthConnection> long count(org.springframework.data.domain.Example<S> ex) { return 0; }
            public <S extends GoogleHealthConnection> boolean exists(org.springframework.data.domain.Example<S> ex) { return false; }
            public java.util.List<GoogleHealthConnection> findAll(org.springframework.data.domain.Sort sort) { return java.util.List.of(); }
            public org.springframework.data.domain.Page<GoogleHealthConnection> findAll(org.springframework.data.domain.Pageable p) { return org.springframework.data.domain.Page.empty(); }
            public <S extends GoogleHealthConnection, R> R findBy(org.springframework.data.domain.Example<S> ex, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> q) { return null; }
        };
        var svc = new HealthConnectionService(null, repo, null, java.util.List.of(), null, null, null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> svc.mintAccessToken(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not_connected");
    }
```

Note: the anonymous stub is verbose because `JpaRepository` has many methods. If `GoogleHealthConnectionRepository` declares extra custom methods beyond `findByUserId`/`deleteByUserId`, add stubs for those too (check the interface first).

- [ ] **Step 2: Run test to verify it fails**

Run: `./mvnw -Dtest=HealthConnectionServiceTest#mintAccessTokenThrowsWhenNotConnected test`
Expected: FAIL — `mintAccessToken` does not exist (compile error).

- [ ] **Step 3: Implement `mintAccessToken` and refactor `runImporters` to use it**

Add the public method, and change `runImporters` to call it instead of inlining the refresh:

```java
/**
 * Mint a fresh Google access token for the connected user from the stored
 * refresh token. Throws IllegalStateException (never returns null) so callers
 * can map to a shaped "not connected"/"error" response.
 */
public String mintAccessToken(Long userId) {
    var conn = connectionRepo.findByUserId(userId).orElse(null);
    if (conn == null) throw new IllegalStateException("not_connected");
    GoogleHealthClient.TokenResponse refreshed = client.refresh(cipher.decrypt(conn.getRefreshTokenEnc()));
    if (refreshed == null || refreshed.accessToken() == null) {
        throw new IllegalStateException("token_refresh_failed");
    }
    return refreshed.accessToken();
}
```

Then in `runImporters`, replace the inline refresh (the `String refreshToken = ...; GoogleHealthClient.TokenResponse refreshed = client.refresh(...); if (refreshed == null ...) throw ...` block) with:

```java
String accessToken = mintAccessToken(conn.getUserId());
```

and update the two later uses of `refreshed.accessToken()` to `accessToken`.

- [ ] **Step 4: Run test to verify it passes**

Run: `./mvnw -Dtest=HealthConnectionServiceTest test`
Expected: PASS (all tests in the class, including the pre-existing `isEnabled` ones).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionService.java \
        src/test/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionServiceTest.java
git commit --no-gpg-sign -m "refactor(health): extract mintAccessToken for reuse by on-demand reads"
```

---

## Task 2: `ActivityDTO` + `ActivityService` parse logic (pure, unit-tested with canned JSON)

**Files:**
- Create: `src/main/java/com/stoyandev/caloriecalculator/dto/ActivityDTO.java`
- Create: `src/main/java/com/stoyandev/caloriecalculator/service/health/ActivityService.java`
- Test: `src/test/java/com/stoyandev/caloriecalculator/service/health/ActivityServiceTest.java`

**Interfaces:**
- Produces `ActivityDTO` (record):
  ```java
  public record ActivityDTO(boolean found, String exerciseType, Integer durationMin,
                            Integer avgHr, Integer minHr, Integer maxHr,
                            java.util.List<Zone> zones, String reason) {
      public record Zone(String name, Integer minutes) {}
      public static ActivityDTO notFound(String reason) {
          return new ActivityDTO(false, null, null, null, null, null, java.util.List.of(), reason);
      }
  }
  ```
- Produces on `ActivityService` (pure, no HTTP — tested this task):
  - `static ActivityDTO parse(String exerciseJson, String heartRateJson, ZoneId zone, LocalDate date)` — parses raw Google JSON into a DTO. Keeps only WEIGHTLIFTING points on `date`, merges multiples, computes duration + HR stats. Returns `notFound(null)` when no WEIGHTLIFTING session that day.
- Task 3 consumes `parse(...)` after fetching the two JSON bodies live.

**Field mapping note:** Use the field names CONFIRMED in Task 0 Step 5/6. The mappings below are the spec's expected shape; if Task 0 showed different names, adjust the `@JsonProperty` values here before writing tests.

- [ ] **Step 1: Create `ActivityDTO`**

Write `src/main/java/com/stoyandev/caloriecalculator/dto/ActivityDTO.java` with the record shown in Interfaces above, package `com.stoyandev.caloriecalculator.dto`.

- [ ] **Step 2: Write the failing test with canned JSON**

Create `ActivityServiceTest.java`. Canned payloads reflect the Task-0 shape (adjust if needed):

```java
package com.stoyandev.caloriecalculator.service.health;

import com.stoyandev.caloriecalculator.dto.ActivityDTO;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class ActivityServiceTest {

    private static final ZoneId ZONE = ZoneId.of("UTC");
    private static final LocalDate DAY = LocalDate.of(2026, 8, 14);

    @Test
    void parsesWeightliftingDurationAndHr() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:52:00Z"}}}
            ]}""";
        String hr = """
            {"dataPoints":[
              {"heartRate":{"beatsPerMinute":96,"interval":{"startTime":"2026-08-14T18:05:00Z"}}},
              {"heartRate":{"beatsPerMinute":128,"interval":{"startTime":"2026-08-14T18:20:00Z"}}},
              {"heartRate":{"beatsPerMinute":171,"interval":{"startTime":"2026-08-14T18:40:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, hr, ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.exerciseType()).isEqualTo("WEIGHTLIFTING");
        assertThat(dto.durationMin()).isEqualTo(52);
        assertThat(dto.avgHr()).isEqualTo(132); // round((96+128+171)/3)
        assertThat(dto.minHr()).isEqualTo(96);
        assertThat(dto.maxHr()).isEqualTo(171);
    }

    @Test
    void ignoresNonWeightliftingSessions() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"RUNNING",
                "interval":{"startTime":"2026-08-14T07:00:00Z","endTime":"2026-08-14T07:30:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isFalse();
        assertThat(dto.reason()).isNull();
    }

    @Test
    void mergesMultipleWeightliftingSessionsSameDay() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T09:00:00Z","endTime":"2026-08-14T09:30:00Z"}}},
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:20:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.durationMin()).isEqualTo(50); // 30 + 20
    }

    @Test
    void foundButNoHrLeavesHrNull() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:40:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.avgHr()).isNull();
        assertThat(dto.minHr()).isNull();
        assertThat(dto.maxHr()).isNull();
    }

    @Test
    void emptyExerciseJsonIsNotFound() {
        ActivityDTO dto = ActivityService.parse("{}", "{}", ZONE, DAY);
        assertThat(dto.found()).isFalse();
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `./mvnw -Dtest=ActivityServiceTest test`
Expected: FAIL — `ActivityService.parse` does not exist (compile error).

- [ ] **Step 4: Implement `ActivityService` with the pure `parse` + Jackson records**

Create `src/main/java/com/stoyandev/caloriecalculator/service/health/ActivityService.java`:

```java
package com.stoyandev.caloriecalculator.service.health;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stoyandev.caloriecalculator.dto.ActivityDTO;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * On-demand, read-only lookup of a day's Google Health WEIGHTLIFTING session.
 * Nothing is persisted. Parsing ({@link #parse}) is pure and unit-tested with
 * canned JSON; the live fetch ({@link #forDate}) mints a token via
 * {@link HealthConnectionService#mintAccessToken} and calls Google v4.
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);
    private static final String WEIGHTLIFTING = "WEIGHTLIFTING";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final HealthConnectionService connections;
    private final RestClient rest = RestClient.create();

    /** Live fetch for one local day. Never throws to the caller for API/connection issues. */
    public ActivityDTO forDate(Long userId, LocalDate date) {
        final String token;
        try {
            token = connections.mintAccessToken(userId);
        } catch (IllegalStateException e) {
            return ActivityDTO.notFound("not_connected".equals(e.getMessage()) ? "not_connected" : "error");
        }
        ZoneId zone = ZoneId.systemDefault();
        Instant from = date.atStartOfDay(zone).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();
        try {
            String exercise = getDataPoints(token, "exercise",
                    "exercise.interval.start_time >= \"" + from + "\" AND exercise.interval.start_time < \"" + to + "\"");
            // HR scoped to the same day window; parse() further scopes by session bounds.
            String hr = getDataPoints(token, "heartRate",
                    "heartRate.interval.start_time >= \"" + from + "\" AND heartRate.interval.start_time < \"" + to + "\"");
            return parse(exercise, hr, zone, date);
        } catch (Exception e) {
            log.warn("Activity lookup failed for user {} on {}: {}", userId, date, e.getMessage());
            return ActivityDTO.notFound("error");
        }
    }

    private String getDataPoints(String token, String type, String filter) {
        return rest.get().uri(b -> b.scheme("https").host("health.googleapis.com")
                        .path("/v4/users/me/dataTypes/" + type + "/dataPoints")
                        .queryParam("filter", filter).queryParam("pageSize", 1000).build())
                .header("Authorization", "Bearer " + token)
                .retrieve().body(String.class);
    }

    /** Pure parse: keep WEIGHTLIFTING points on `date`, merge duration, compute HR stats. */
    static ActivityDTO parse(String exerciseJson, String heartRateJson, ZoneId zone, LocalDate date) {
        ExResp ex = readExercise(exerciseJson);
        List<ExPoint> lifts = new ArrayList<>();
        if (ex != null && ex.dataPoints() != null) {
            for (ExPoint p : ex.dataPoints()) {
                if (p.exercise() == null) continue;
                if (!WEIGHTLIFTING.equalsIgnoreCase(p.exercise().exerciseType())) continue;
                LocalDate d = p.exercise().startLocalDate(zone);
                if (d == null || !d.equals(date)) continue;
                lifts.add(p);
            }
        }
        if (lifts.isEmpty()) return ActivityDTO.notFound(null);

        long totalMin = 0;
        Instant windowStart = null, windowEnd = null;
        for (ExPoint p : lifts) {
            Instant s = p.exercise().startInstant();
            Instant e = p.exercise().endInstant();
            if (s != null && e != null) {
                totalMin += Math.max(0, Duration.between(s, e).toMinutes());
                if (windowStart == null || s.isBefore(windowStart)) windowStart = s;
                if (windowEnd == null || e.isAfter(windowEnd)) windowEnd = e;
            }
        }

        Integer avg = null, min = null, max = null;
        List<Integer> bpms = heartRatesInWindow(heartRateJson, windowStart, windowEnd);
        if (!bpms.isEmpty()) {
            int sum = 0; int mn = Integer.MAX_VALUE, mx = Integer.MIN_VALUE;
            for (int b : bpms) { sum += b; mn = Math.min(mn, b); mx = Math.max(mx, b); }
            avg = Math.round((float) sum / bpms.size());
            min = mn; max = mx;
        }
        return new ActivityDTO(true, WEIGHTLIFTING, (int) totalMin, avg, min, max, List.of(), null);
    }

    private static List<Integer> heartRatesInWindow(String json, Instant start, Instant end) {
        List<Integer> out = new ArrayList<>();
        HrResp hr = readHeartRate(json);
        if (hr == null || hr.dataPoints() == null) return out;
        for (HrPoint p : hr.dataPoints()) {
            if (p.heartRate() == null || p.heartRate().beatsPerMinute() == null) continue;
            Instant t = p.heartRate().sampleInstant();
            if (t == null) { out.add(p.heartRate().beatsPerMinute()); continue; }
            if ((start == null || !t.isBefore(start)) && (end == null || t.isBefore(end))) {
                out.add(p.heartRate().beatsPerMinute());
            }
        }
        return out;
    }

    private static ExResp readExercise(String json) {
        try { return MAPPER.readValue(json, ExResp.class); } catch (Exception e) { return null; }
    }
    private static HrResp readHeartRate(String json) {
        try { return MAPPER.readValue(json, HrResp.class); } catch (Exception e) { return null; }
    }

    // --- Google Health v4 JSON (shape confirmed in Task 0) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    record ExResp(List<ExPoint> dataPoints) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    record ExPoint(Exercise exercise) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    record Exercise(@JsonProperty("exerciseType") String exerciseType, Interval interval) {
        Instant startInstant() { return interval != null ? interval.startTime() : null; }
        Instant endInstant() { return interval != null ? interval.endTime() : null; }
        LocalDate startLocalDate(ZoneId zone) {
            Instant s = startInstant(); return s != null ? s.atZone(zone).toLocalDate() : null;
        }
    }
    @JsonIgnoreProperties(ignoreUnknown = true)
    record Interval(@JsonProperty("startTime") Instant startTime, @JsonProperty("endTime") Instant endTime) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record HrResp(List<HrPoint> dataPoints) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    record HrPoint(HeartRate heartRate) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    record HeartRate(@JsonProperty("beatsPerMinute") Integer beatsPerMinute, Interval interval) {
        Instant sampleInstant() { return interval != null ? interval.startTime() : null; }
    }
}
```

Note: `ObjectMapper` must parse ISO-8601 `Instant`s. Spring Boot's default mapper registers `JavaTimeModule`, but a bare `new ObjectMapper()` does not. Register it: change `MAPPER` to
`new ObjectMapper().registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())`.
(The project already depends on jackson-datatype-jsr310 — commit `4e8d855` registered `JavaTimeModule` for sleep.)

- [ ] **Step 5: Run test to verify it passes**

Run: `./mvnw -Dtest=ActivityServiceTest test`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/stoyandev/caloriecalculator/dto/ActivityDTO.java \
        src/main/java/com/stoyandev/caloriecalculator/service/health/ActivityService.java \
        src/test/java/com/stoyandev/caloriecalculator/service/health/ActivityServiceTest.java
git commit --no-gpg-sign -m "feat(health): ActivityService parse for on-demand WEIGHTLIFTING lookup"
```

---

## Task 3: Wire the endpoint + remove the spike

**Files:**
- Modify: `src/main/java/com/stoyandev/caloriecalculator/controller/HealthConnectionController.java`
- Modify: `src/main/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionService.java` (remove spike method)

**Interfaces:**
- Consumes: `ActivityService.forDate(Long, LocalDate)` (Task 2), `@userAccessService.hasAccess`.
- Produces: `GET /api/v1/health/activity/{userId}?date=YYYY-MM-DD` → `ActivityDTO` JSON. The frontend (Task 4) consumes this.

- [ ] **Step 1: Add `ActivityService` dependency to the controller**

The controller uses `@AllArgsConstructor` with a single `HealthConnectionService service` field. Add a second field so Lombok injects both:

```java
private final HealthConnectionService service;
private final com.stoyandev.caloriecalculator.service.health.ActivityService activityService;
```

- [ ] **Step 2: Add the endpoint**

```java
/** On-demand read of a day's Google WEIGHTLIFTING session. Never persists. */
@GetMapping("/activity/{userId}")
@PreAuthorize("@userAccessService.hasAccess(#userId)")
public ResponseEntity<com.stoyandev.caloriecalculator.dto.ActivityDTO> activity(
        @PathVariable Long userId,
        @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
    return ResponseEntity.ok(activityService.forDate(userId, date));
}
```

- [ ] **Step 3: Remove the Task-0 spike endpoint**

Delete the `@GetMapping("/debug/exercise/{userId}")` method added in Task 0 Step 2 from the controller.

- [ ] **Step 4: Remove the Task-0 spike method from the service**

Delete `debugExerciseJson(...)` added in Task 0 Step 1 from `HealthConnectionService`.

- [ ] **Step 5: Build to confirm it compiles and all tests pass**

Run: `./mvnw test`
Expected: PASS — the single `contextLoads` plus the health/service tests. No compile errors from the new endpoint.

- [ ] **Step 6: Manual smoke test the real endpoint**

Start the app (`./mvnw spring-boot:run`) and hit the real route with a valid token + a known lift date:

```bash
curl -s "http://localhost:8080/api/v1/health/activity/<USERID>?date=<DATE>" \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool
```

Expected: `{"found": true, "exerciseType": "WEIGHTLIFTING", "durationMin": ..., "avgHr": ..., ...}` for a lift day, and `{"found": false, ...}` for a rest day. Stop the app after.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/stoyandev/caloriecalculator/controller/HealthConnectionController.java \
        src/main/java/com/stoyandev/caloriecalculator/service/health/HealthConnectionService.java
git commit --no-gpg-sign -m "feat(health): GET /health/activity/{userId} endpoint; drop spike"
```

---

## Task 4: Frontend — API wrapper + clickable date header + metrics panel

**Files:**
- Modify: `frontend/src/api/health.js`
- Modify: `frontend/src/features/workout/WorkoutPage.jsx` (`SessionsTable`, ~lines 187-259)
- Modify: `frontend/src/features/workout/WorkoutPage.module.css` (styles for the clickable header + panel)

**Interfaces:**
- Consumes: `GET /health/activity/{userId}?date=...` (Task 3) → `{ found, exerciseType, durationMin, avgHr, minHr, maxHr, zones, reason }`.
- Produces: `getActivityForDate(userId, date)` in `health.js`.

- [ ] **Step 1: Add the API wrapper**

Append to `frontend/src/api/health.js`:

```javascript
/**
 * On-demand Google WEIGHTLIFTING session for a date (read-only, not stored).
 * Returns { found, exerciseType, durationMin, avgHr, minHr, maxHr, zones, reason }.
 */
export async function getActivityForDate(userId, date) {
  const { data } = await client.get(`/health/activity/${userId}?date=${date}`);
  return data;
}
```

- [ ] **Step 2: Add panel state + click handler to `SessionsTable`**

`SessionsTable` currently takes `{ sessions, exercises, highlightId, colorCells, autoScroll, styles }`. The userId is needed — read it from auth storage (the app stores it; import the same helper other features use). Check how another feature reads the current userId (grep `getUserId`/`userId` in `frontend/src/auth/`), and use that.

Add near the top of `SessionsTable`:

```javascript
  const [activity, setActivity] = React.useState(null); // { date, loading, data, error }
  const userId = getCurrentUserId(); // from auth storage — match existing usage

  const openActivity = async (date) => {
    setActivity({ date, loading: true, data: null, error: null });
    try {
      const data = await getActivityForDate(userId, date);
      setActivity({ date, loading: false, data, error: null });
    } catch (e) {
      setActivity({ date, loading: false, data: null, error: e.message || 'Failed to load' });
    }
  };
```

Add the imports at the top of `WorkoutPage.jsx`:

```javascript
import { getActivityForDate } from '../../api/health';
// plus the userId helper, matching however the codebase exposes it
```

- [ ] **Step 3: Make the date header a button**

Replace the header cell (lines 212-216) so the date is clickable:

```javascript
              {sessions.map(w => (
                <th key={w.id} className={[styles.prevSessionCol, w.id === highlightId ? styles.prevNewest : ''].join(' ')}>
                  <button type="button" className={styles.dateBtn} onClick={() => openActivity(w.date)}>
                    {w.date}
                  </button>
                </th>
              ))}
```

- [ ] **Step 4: Render the panel**

Add, just before the closing `</div>` of the `.prevTable` wrapper (after `</div>` of `.prevScroll`, before the component's final `</div>`):

```javascript
      {activity && (
        <div className={styles.activityPanel}>
          <button type="button" className={styles.activityClose} onClick={() => setActivity(null)}>×</button>
          <div className={styles.activityTitle}>Google Health · {activity.date}</div>
          {activity.loading && <div className={styles.activityMuted}>Loading…</div>}
          {activity.error && <div className={styles.activityMuted}>Couldn’t load Google data.</div>}
          {activity.data && !activity.data.found && (
            <div className={styles.activityMuted}>
              {activity.data.reason === 'not_connected'
                ? 'Connect Google Health in Profile to see session data.'
                : 'No Google workout found for this date.'}
            </div>
          )}
          {activity.data && activity.data.found && (
            <div className={styles.activityBody}>
              <div className={styles.activityRow}>
                <strong>{activity.data.exerciseType}</strong>
                {activity.data.durationMin != null && <span> · {activity.data.durationMin} min</span>}
              </div>
              {activity.data.avgHr != null && (
                <div className={styles.activityRow}>
                  HR avg {activity.data.avgHr} · min {activity.data.minHr} · max {activity.data.maxHr}
                </div>
              )}
              {activity.data.zones && activity.data.zones.length > 0 && (
                <div className={styles.activityRow}>
                  {activity.data.zones.map((z) => `${z.name} ${z.minutes}m`).join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 5: Add styles**

Append to `frontend/src/features/workout/WorkoutPage.module.css`:

```css
/* Clickable session date → Google Health panel */
.dateBtn {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--color-accent, #3b82f6);
  cursor: pointer;
  text-decoration: underline dotted;
}
.activityPanel {
  position: relative;
  margin-top: var(--space-3, 12px);
  padding: var(--space-3, 12px);
  background: var(--color-surface-2, #1a2233);
  border: 1px solid var(--color-border, #243049);
  border-radius: var(--radius-md, 12px);
}
.activityClose {
  position: absolute;
  top: 6px;
  right: 10px;
  background: none;
  border: 0;
  font-size: 20px;
  line-height: 1;
  color: var(--color-text-muted, #94a3b8);
  cursor: pointer;
}
.activityTitle { font-size: 13px; color: var(--color-text-muted, #94a3b8); margin-bottom: 6px; }
.activityBody { display: flex; flex-direction: column; gap: 4px; }
.activityRow { font-size: 14px; color: var(--color-text, #e2e8f0); }
.activityMuted { font-size: 14px; color: var(--color-text-muted, #94a3b8); }
```

- [ ] **Step 6: Build the frontend (without CI=true)**

Run: `cd frontend && NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: "Compiled" (warnings allowed — pre-existing lint warnings are unrelated). If it fails on an undefined `getCurrentUserId`, fix the import to match the actual auth helper name found in Step 2.

- [ ] **Step 7: Manual UI check**

Run the frontend (`NODE_OPTIONS=--openssl-legacy-provider npm start`), open Workout → History, click a session date. Confirm: a lift day shows the Google panel with type/duration (and HR if available); a non-lift day shows "No Google workout found for this date."; a disconnected account shows the connect hint. Close (×) dismisses.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api/health.js \
        frontend/src/features/workout/WorkoutPage.jsx \
        frontend/src/features/workout/WorkoutPage.module.css
git commit --no-gpg-sign -m "feat(workout): click history date to view Google WEIGHTLIFTING session"
```

- [ ] **Step 9: Push**

```bash
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** `mintAccessToken` extract → Task 1. `ActivityService` day-filter + WEIGHTLIFTING selection + HR aggregation + merge → Task 2. Endpoint `GET /health/activity/{userId}?date=` with `hasAccess` + shaped `found:false` on error/not-connected → Task 3. Frontend clickable header + panel + found/not-found/not-connected/loading states → Task 4. Validation spike (step 0) → Task 0. HR-zone rollup caveat: the DTO carries `zones` and the UI renders them, but the parse currently returns `List.of()` — zones are wired end-to-end and degrade to empty. **Flagged gap:** the spec mentions a separate HR-zone *rollup* call; Task 0 determines whether zone data is even available for the device. If it is, a follow-up task adds the rollup query populating `zones`; if not, empty is correct. This is deliberate: don't build the rollup call blind before Task 0 confirms the shape.
- **Placeholder scan:** no TBD/TODO; every code step has real code. The one intentional "match existing usage" is the frontend userId helper (Step 2/6) — resolved by grepping auth storage during implementation, with the build as the check.
- **Type consistency:** `ActivityDTO` fields (`found, exerciseType, durationMin, avgHr, minHr, maxHr, zones, reason`) are identical across Task 2 (definition), Task 3 (endpoint return), Task 4 (frontend render). `parse(String, String, ZoneId, LocalDate)` signature matches between Task 2 definition, its tests, and Task 3's `forDate` call site. `mintAccessToken(Long): String` matches between Task 1 and Task 3's `forDate`.
