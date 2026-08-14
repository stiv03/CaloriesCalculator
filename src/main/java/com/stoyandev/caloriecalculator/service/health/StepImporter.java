package com.stoyandev.caloriecalculator.service.health;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.stoyandev.caloriecalculator.entity.StepRecord;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.repository.StepRecordRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Imports daily step totals from Google Health into StepRecord (one row/day).
 *
 * Google returns steps as minute-level intervals from potentially MULTIPLE
 * sources (Fitbit, phone). Summing all of them double-counts overlapping
 * sources and inflates totals. To match the Fitbit Air, we keep only
 * FITBIT-platform buckets and sum those per (local) day. Follows pagination.
 */
@Component
@AllArgsConstructor
public class StepImporter implements HealthImporter {

    private static final Logger log = LoggerFactory.getLogger(StepImporter.class);
    private static final int DEFAULT_LOOKBACK_DAYS = 30;
    private static final String PREFERRED_PLATFORM = "FITBIT";

    private final StepRecordRepository stepRepository;
    private final UserRepository userRepository;
    private final RestClient rest = RestClient.create();

    @Override
    public String dataType() {
        return "steps";
    }

    @Override
    public int importSince(Long userId, String accessToken, Instant since) {
        Users user = userRepository.findById(userId).orElse(null);
        if (user == null) return 0;

        // Always re-fetch whole days over the look-back (ignore narrow `since`)
        // so a same-day re-sync re-totals today completely, not partially.
        Instant from = LocalDate.now().minusDays(DEFAULT_LOOKBACK_DAYS)
                .atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = Instant.now();
        String filter = "steps.interval.start_time >= \"" + from + "\" AND "
                + "steps.interval.start_time < \"" + to + "\"";

        // Sum per day using the user's local offset (from the response), so days
        // line up with what the Fitbit/Google Health app shows.
        Map<LocalDate, Integer> byDay = new HashMap<>();
        boolean sawFitbit = false;
        String pageToken = null;
        int pages = 0;
        do {
            final String tok = pageToken;
            OffResponse resp = rest.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https").host("health.googleapis.com")
                            .path("/v4/users/me/dataTypes/steps/dataPoints")
                            .queryParam("filter", filter)
                            .queryParam("pageSize", 1000)
                            .queryParamIfPresent("pageToken", java.util.Optional.ofNullable(tok))
                            .build())
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(OffResponse.class);

            if (resp == null) break;
            if (resp.dataPoints() != null) {
                for (DataPoint dp : resp.dataPoints()) {
                    if (PREFERRED_PLATFORM.equalsIgnoreCase(dp.platform())) sawFitbit = true;
                }
                for (DataPoint dp : resp.dataPoints()) {
                    // If any Fitbit data exists, count ONLY Fitbit (avoid double-count).
                    // If none does, fall back to counting everything.
                    if (sawFitbit && !PREFERRED_PLATFORM.equalsIgnoreCase(dp.platform())) continue;
                    Integer count = dp.stepCount();
                    LocalDate date = dp.localDate();
                    if (count == null || date == null) continue;
                    byDay.merge(date, count, Integer::sum);
                }
            }
            pageToken = resp.nextPageToken();
            pages++;
        } while (pageToken != null && !pageToken.isBlank() && pages < 100);

        int daysWritten = 0;
        for (Map.Entry<LocalDate, Integer> e : byDay.entrySet()) {
            final LocalDate date = e.getKey();
            StepRecord rec = stepRepository.findByUserIdAndDate(userId, date)
                    .orElseGet(() -> { var s = new StepRecord(); s.setUser(user); s.setDate(date); return s; });
            rec.setSteps(e.getValue());
            stepRepository.save(rec);
            daysWritten++;
        }
        log.info("Steps import for user {}: {} day-records ({} pages, fitbitOnly={})",
                userId, daysWritten, pages, sawFitbit);
        return daysWritten;
    }

    // --- Google Health steps JSON (verified shape):
    //   dataPoints[].dataSource.platform      = "FITBIT" | ...
    //   dataPoints[].steps.count              = string, e.g. "3"
    //   dataPoints[].steps.interval.startTime + startUtcOffset (e.g. "10800s")
    @JsonIgnoreProperties(ignoreUnknown = true)
    record OffResponse(List<DataPoint> dataPoints, @JsonProperty("nextPageToken") String nextPageToken) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataPoint(Steps steps, DataSource dataSource) {
        String platform() { return dataSource != null ? dataSource.platform() : null; }
        Integer stepCount() {
            if (steps == null || steps.count() == null) return null;
            try { return (int) Math.round(Double.parseDouble(steps.count())); }
            catch (NumberFormatException e) { return null; }
        }
        /** Local calendar day, using the interval's UTC offset so day boundaries match the app. */
        LocalDate localDate() {
            if (steps == null || steps.interval() == null || steps.interval().startTime() == null) return null;
            long offsetSec = parseOffsetSeconds(steps.interval().startUtcOffset());
            return steps.interval().startTime().atZone(ZoneOffset.ofTotalSeconds((int) offsetSec)).toLocalDate();
        }
        private static long parseOffsetSeconds(String off) {
            if (off == null) return 0;
            try { return Long.parseLong(off.replace("s", "").trim()); }
            catch (NumberFormatException e) { return 0; }
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataSource(@JsonProperty("platform") String platform) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Steps(@JsonProperty("count") String count, Interval interval) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Interval(@JsonProperty("startTime") Instant startTime,
                    @JsonProperty("startUtcOffset") String startUtcOffset) {}
}
