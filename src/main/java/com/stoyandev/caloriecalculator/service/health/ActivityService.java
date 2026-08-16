package com.stoyandev.caloriecalculator.service.health;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stoyandev.caloriecalculator.dto.ActivityDTO;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.WorkoutActivityRecord;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.WorkoutActivityRecordRepository;
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
 * On-demand lookup of a day's Google Health WEIGHTLIFTING session, with a
 * read-through DB cache. Parsing ({@link #parse}) is pure and unit-tested with
 * canned JSON; the live fetch ({@link #forDate}) checks the DB first, then
 * mints a token via {@link HealthConnectionService#mintAccessToken}, calls
 * Google v4, and — when the user has workout sync enabled — persists the found
 * session so later views load from the DB without re-fetching.
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);
    private static final String WEIGHTLIFTING = "WEIGHTLIFTING";
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    private final HealthConnectionService connections;
    private final WorkoutActivityRecordRepository activityRepo;
    private final UserRepository userRepository;
    private final RestClient rest = RestClient.create();

    /**
     * Look up one local day's WEIGHTLIFTING session. Reads a persisted record
     * first; on a miss, fetches live and (if workout sync is on) saves the
     * result. Never throws to the caller for API/connection issues.
     */
    public ActivityDTO forDate(Long userId, LocalDate date) {
        WorkoutActivityRecord cached = activityRepo.findByUserIdAndDate(userId, date).orElse(null);
        if (cached != null) {
            return toDto(cached);
        }

        final String token;
        try {
            token = connections.mintAccessToken(userId);
        } catch (IllegalStateException e) {
            return ActivityDTO.notFound("not_connected".equals(e.getMessage()) ? "not_connected" : "error");
        }
        ZoneId zone = ZoneId.systemDefault();
        // Google v4 "exercise" is a SESSION type: filter by civil_start_time with a
        // civil (local, no-Z) date literal. Heart rate is a SAMPLE type, filtered on
        // sample_time.physical_time (RFC-3339, with Z) — it has no "interval" field.
        // NOTE the id/field asymmetry Google enforces: the URL path uses the kebab-case
        // data type id ("heart-rate") while the filter uses the snake_case union field
        // name ("heart_rate"). Getting the path id wrong is a hard 400.
        LocalDate to = date.plusDays(1);
        Instant hrFrom = date.atStartOfDay(zone).toInstant();
        Instant hrTo = to.atStartOfDay(zone).toInstant();
        try {
            String exercise = getDataPoints(token, "exercise",
                    "exercise.interval.civil_start_time >= \"" + date + "\" AND exercise.interval.civil_start_time < \"" + to + "\"");
            // Heart rate is enrichment, never the payload: a HR fetch failure must not
            // sink the workout lookup, so it gets its own catch and degrades to no-HR.
            String hr = "{}";
            try {
                hr = getDataPoints(token, "heart-rate",
                        "heart_rate.sample_time.physical_time >= \"" + hrFrom + "\" AND heart_rate.sample_time.physical_time < \"" + hrTo + "\"");
            } catch (Exception hrEx) {
                log.warn("Heart-rate lookup failed for user {} on {} (workout still returned): {}",
                        userId, date, hrEx.getMessage());
            }
            ActivityDTO dto = parse(exercise, hr, zone, date);
            if (dto.found() && connections.isWorkoutSyncEnabled(userId)) {
                save(userId, date, dto);
            }
            return dto;
        } catch (org.springframework.web.client.RestClientResponseException e) {
            // Google rejected the request (4xx/5xx). Surface the status + body so a
            // failing filter/scope is diagnosable from the client, not just server logs.
            log.warn("Activity lookup HTTP error for user {} on {}: {} {}", userId, date,
                    e.getStatusCode(), e.getResponseBodyAsString());
            String body = e.getResponseBodyAsString();
            if (body != null && body.length() > 300) body = body.substring(0, 300);
            return ActivityDTO.notFound("http_" + e.getStatusCode().value() + "; " + body);
        } catch (Exception e) {
            log.warn("Activity lookup failed for user {} on {}: {}", userId, date, e.getMessage());
            return ActivityDTO.notFound("error: " + e.getClass().getSimpleName() + "; " + e.getMessage());
        }
    }

    /** Upsert the day's session for this user. Best-effort: a save failure never breaks the read. */
    void save(Long userId, LocalDate date, ActivityDTO dto) {
        try {
            Users user = userRepository.findById(userId).orElse(null);
            if (user == null) return;
            WorkoutActivityRecord rec = activityRepo.findByUserIdAndDate(userId, date)
                    .orElseGet(() -> { var r = new WorkoutActivityRecord(); r.setUser(user); r.setDate(date); return r; });
            rec.setExerciseType(dto.exerciseType());
            rec.setDurationMin(dto.durationMin());
            rec.setAvgHr(dto.avgHr());
            rec.setMinHr(dto.minHr());
            rec.setMaxHr(dto.maxHr());
            rec.setZonesJson(writeZones(dto.zones()));
            rec.setSavedAt(Instant.now());
            activityRepo.save(rec);
        } catch (Exception e) {
            log.warn("Failed to persist workout activity for user {} on {}: {}", userId, date, e.getMessage());
        }
    }

    private static ActivityDTO toDto(WorkoutActivityRecord r) {
        return new ActivityDTO(true, r.getExerciseType(), r.getDurationMin(),
                r.getAvgHr(), r.getMinHr(), r.getMaxHr(), readZones(r.getZonesJson()), null);
    }

    private static String writeZones(List<ActivityDTO.Zone> zones) {
        if (zones == null || zones.isEmpty()) return null;
        try { return MAPPER.writeValueAsString(zones); } catch (Exception e) { return null; }
    }

    private static List<ActivityDTO.Zone> readZones(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return MAPPER.readValue(json, MAPPER.getTypeFactory()
                    .constructCollectionType(List.class, ActivityDTO.Zone.class));
        } catch (Exception e) {
            return List.of();
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
        List<String> seenTypesOnDate = new ArrayList<>();
        if (ex != null && ex.dataPoints() != null) {
            for (ExPoint p : ex.dataPoints()) {
                if (p.exercise() == null) continue;
                LocalDate d = p.exercise().startLocalDate(zone);
                if (d == null || !d.equals(date)) continue;
                seenTypesOnDate.add(p.exercise().exerciseType());
                if (!WEIGHTLIFTING.equalsIgnoreCase(p.exercise().exerciseType())) continue;
                lifts.add(p);
            }
        }
        if (lifts.isEmpty()) {
            // Surface WHY nothing matched so a failed lookup carries evidence to the
            // client (visible in the network response), not just an empty result.
            String reason = seenTypesOnDate.isEmpty()
                    ? "no_exercise_points"
                    : "no_weightlifting; saw=" + seenTypesOnDate;
            return ActivityDTO.notFound(reason);
        }

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
    record HeartRate(@JsonProperty("beatsPerMinute") Integer beatsPerMinute,
                     @JsonProperty("sampleTime") SampleTime sampleTime) {
        // Heart rate is a sample type: its timestamp lives in sampleTime.physicalTime
        // (RFC-3339), NOT in an interval. beatsPerMinute is a string-encoded int64 in
        // Google's JSON; Jackson coerces the numeric string to Integer.
        Instant sampleInstant() { return sampleTime != null ? sampleTime.physicalTime() : null; }
    }
    @JsonIgnoreProperties(ignoreUnknown = true)
    record SampleTime(@JsonProperty("physicalTime") Instant physicalTime) {}
}
