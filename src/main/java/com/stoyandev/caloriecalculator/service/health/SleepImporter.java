package com.stoyandev.caloriecalculator.service.health;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stoyandev.caloriecalculator.entity.SleepRecord;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.repository.SleepRecordRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Imports sleep sessions from Google Health into SleepRecord (one row per wake
 * day). Google returns each night as a session with non-overlapping stage
 * segments ({@code LIGHT/DEEP/REM/AWAKE}); we sum each stage's duration, attribute
 * the night to the local date its {@code endTime} falls on (wake-up day), and keep
 * the raw segments so the calendar can draw a hypnogram.
 *
 * Day boundaries use a FIXED zone ({@link ZoneId#systemDefault()}), matching the
 * steps importer, so a night is filed consistently regardless of the interval's
 * reported UTC offset.
 */
@Component
@AllArgsConstructor
public class SleepImporter implements HealthImporter {

    private static final Logger log = LoggerFactory.getLogger(SleepImporter.class);
    private static final int DEFAULT_LOOKBACK_DAYS = 30;
    // findAndRegisterModules() picks up jackson-datatype-jsr310 (on the classpath
    // via spring-boot-starter-web) so the Instant fields in Seg serialize. Without
    // it a plain ObjectMapper throws on java.time.Instant and writeSegments()
    // silently returns null — the totals still save but the hypnogram gets no data.
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();

    private final SleepRecordRepository sleepRepository;
    private final UserRepository userRepository;
    private final RestClient rest = RestClient.create();

    @Override
    public String dataType() {
        return "sleep";
    }

    @Override
    public int importSince(Long userId, String accessToken, Instant since) {
        Users user = userRepository.findById(userId).orElse(null);
        if (user == null) return 0;

        ZoneId zone = ZoneId.systemDefault();

        // Always re-fetch whole days over the look-back so a same-day re-sync
        // re-totals cleanly. Sleep carries a SessionTimeInterval, which the
        // dataPoints.list filter grammar only exposes by END time (snake_case,
        // nested) — filtering by sleep.interval.start_time is rejected with
        // INVALID_DATA_POINT_FILTER_DATA_TYPE_MEMBER. This aligns with how we
        // attribute a night to its wake (endTime) day anyway.
        Instant from = LocalDate.now(zone).minusDays(DEFAULT_LOOKBACK_DAYS)
                .atStartOfDay(zone).toInstant();
        Instant to = Instant.now().plus(Duration.ofDays(1));
        String filter = "sleep.interval.end_time >= \"" + from + "\" AND "
                + "sleep.interval.end_time < \"" + to + "\"";

        List<Session> all = new ArrayList<>();
        String pageToken = null;
        int pages = 0;
        do {
            final String tok = pageToken;
            SleepResponse resp = rest.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https").host("health.googleapis.com")
                            .path("/v4/users/me/dataTypes/sleep/dataPoints")
                            .queryParam("filter", filter)
                            .queryParam("pageSize", 1000)
                            .queryParamIfPresent("pageToken", java.util.Optional.ofNullable(tok))
                            .build())
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(SleepResponse.class);

            if (resp == null) break;
            if (resp.dataPoints() != null) {
                for (DataPoint dp : resp.dataPoints()) {
                    if (dp.sleep() != null) all.add(dp.sleep());
                }
            }
            pageToken = resp.nextPageToken();
            pages++;
        } while (pageToken != null && !pageToken.isBlank() && pages < 100);

        Map<LocalDate, Night> byDay = new HashMap<>();
        for (Session s : all) {
            Instant end = s.interval() != null ? s.interval().endTime() : null;
            if (end == null) continue;
            LocalDate day = end.atZone(zone).toLocalDate();
            byDay.computeIfAbsent(day, d -> new Night()).add(s);
        }

        int daysWritten = 0;
        for (Map.Entry<LocalDate, Night> e : byDay.entrySet()) {
            final LocalDate day = e.getKey();
            final Night night = e.getValue();
            SleepRecord rec = sleepRepository.findByUserIdAndDate(userId, day)
                    .orElseGet(() -> { var s = new SleepRecord(); s.setUser(user); s.setDate(day); return s; });
            rec.setRemMinutes(night.rem);
            rec.setDeepMinutes(night.deep);
            rec.setLightMinutes(night.light);
            rec.setAwakeMinutes(night.awake);
            rec.setTotalMinutes(night.rem + night.deep + night.light);
            rec.setStartTime(night.start);
            rec.setEndTime(night.end);
            rec.setSegments(writeSegments(night.segments));
            sleepRepository.save(rec);
            daysWritten++;
        }
        log.info("Sleep import for user {}: {} nights ({} pages, {} sessions, zone={})",
                userId, daysWritten, pages, all.size(), zone);
        return daysWritten;
    }

    private static String writeSegments(List<Seg> segs) {
        if (segs == null || segs.isEmpty()) return null;
        try {
            return JSON.writeValueAsString(segs);
        } catch (JsonProcessingException ex) {
            return null; // segments are a nice-to-have for the chart; totals still saved
        }
    }

    /** Accumulates one wake-day's sessions: per-stage minutes, bounds, segments. */
    private static final class Night {
        int rem, deep, light, awake;
        Instant start, end;
        final List<Seg> segments = new ArrayList<>();

        void add(Session s) {
            Instant sStart = s.interval() != null ? s.interval().startTime() : null;
            Instant sEnd = s.interval() != null ? s.interval().endTime() : null;
            if (sStart != null && (start == null || sStart.isBefore(start))) start = sStart;
            if (sEnd != null && (end == null || sEnd.isAfter(end))) end = sEnd;
            if (s.stages() == null) return;
            for (Stage st : s.stages()) {
                if (st.startTime() == null || st.endTime() == null || st.type() == null) continue;
                int mins = (int) Math.max(0, Duration.between(st.startTime(), st.endTime()).toMinutes());
                switch (st.type().toUpperCase()) {
                    case "REM" -> rem += mins;
                    case "DEEP" -> deep += mins;
                    // LIGHT and generic ASLEEP (unstaged sleep) both count as light.
                    case "LIGHT", "ASLEEP" -> light += mins;
                    // AWAKE and RESTLESS are time in bed but not asleep.
                    case "AWAKE", "RESTLESS" -> awake += mins;
                    default -> { /* unknown stage type — ignore for totals */ }
                }
                segments.add(new Seg(st.startTime(), st.endTime(), st.type().toUpperCase()));
            }
        }
    }

    /** Serialised segment for the hypnogram (JSON stored on SleepRecord). */
    public record Seg(Instant start, Instant end, String type) {}

    // --- Google Health sleep JSON (per the dataPoints reference, #sleep):
    //   dataPoints[].sleep.interval.{startTime,endTime}   (ISO 8601, under interval)
    //   dataPoints[].sleep.stages[] = { startTime, endTime, type }
    //   type ∈ AWAKE | LIGHT | DEEP | REM | ASLEEP | RESTLESS
    @JsonIgnoreProperties(ignoreUnknown = true)
    record SleepResponse(List<DataPoint> dataPoints, @JsonProperty("nextPageToken") String nextPageToken) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataPoint(Session sleep) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Session(@JsonProperty("interval") Interval interval,
                   @JsonProperty("stages") List<Stage> stages) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Interval(@JsonProperty("startTime") Instant startTime,
                    @JsonProperty("endTime") Instant endTime) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Stage(@JsonProperty("startTime") Instant startTime,
                 @JsonProperty("endTime") Instant endTime,
                 @JsonProperty("type") String type) {}
}
