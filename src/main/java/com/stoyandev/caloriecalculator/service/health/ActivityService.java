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
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

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
