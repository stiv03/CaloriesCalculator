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
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Imports daily step totals from Google Health into StepRecord (one row/day).
 *
 * Google returns steps as minute-level intervals from potentially MULTIPLE
 * sources (Fitbit, phone). Summing all of them double-counts overlapping
 * sources and inflates totals. To match the Fitbit Air, we keep only
 * FITBIT-platform buckets and sum those per day. Follows pagination.
 *
 * Day boundaries: we bucket every interval in the server's fixed local zone
 * ({@link ZoneId#systemDefault()}), NOT each interval's reported UTC offset.
 * Google's per-interval {@code startUtcOffset} is inconsistent (sometimes 0/UTC,
 * sometimes absent), which used to shove late-night steps onto the adjacent day
 * — making totals drift a bit up on one day and down on the next. A single fixed
 * zone matches how the Fitbit/Google Health app draws the calendar day.
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

        // Bucket everything in ONE fixed zone so day boundaries match the app.
        ZoneId zone = ZoneId.systemDefault();

        // Always re-fetch whole days over the look-back (ignore narrow `since`)
        // so a same-day re-sync re-totals today completely, not partially.
        Instant from = LocalDate.now(zone).minusDays(DEFAULT_LOOKBACK_DAYS)
                .atStartOfDay(zone).toInstant();
        Instant to = Instant.now();
        String filter = "steps.interval.start_time >= \"" + from + "\" AND "
                + "steps.interval.start_time < \"" + to + "\"";

        // Collect ALL data points across pages first — the source-preference
        // decision (Fitbit-only vs everything) must be made over the whole
        // result set, not page-by-page, or an early all-phone page gets counted
        // before a later Fitbit page flips the rule (mixing sources per day).
        List<DataPoint> all = new ArrayList<>();
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
            if (resp.dataPoints() != null) all.addAll(resp.dataPoints());
            pageToken = resp.nextPageToken();
            pages++;
        } while (pageToken != null && !pageToken.isBlank() && pages < 100);

        // Prefer Fitbit if ANY Fitbit point exists anywhere; otherwise count all.
        boolean fitbitOnly = all.stream()
                .anyMatch(dp -> PREFERRED_PLATFORM.equalsIgnoreCase(dp.platform()));

        Map<LocalDate, Integer> byDay = new HashMap<>();
        for (DataPoint dp : all) {
            if (fitbitOnly && !PREFERRED_PLATFORM.equalsIgnoreCase(dp.platform())) continue;
            Integer count = dp.stepCount();
            LocalDate date = dp.localDate(zone);
            if (count == null || date == null) continue;
            byDay.merge(date, count, Integer::sum);
        }

        int daysWritten = 0;
        for (Map.Entry<LocalDate, Integer> e : byDay.entrySet()) {
            final LocalDate date = e.getKey();
            StepRecord rec = stepRepository.findByUserIdAndDate(userId, date)
                    .orElseGet(() -> { var s = new StepRecord(); s.setUser(user); s.setDate(date); return s; });
            rec.setSteps(e.getValue());
            stepRepository.save(rec);
            daysWritten++;
        }
        log.info("Steps import for user {}: {} day-records ({} pages, {} points, fitbitOnly={}, zone={})",
                userId, daysWritten, pages, all.size(), fitbitOnly, zone);
        // TEMP diagnostic: per-day totals to compare against the Fitbit/Google app.
        // Remove once step totals are confirmed to match.
        byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> log.info("  steps[{}] = {}", e.getKey(), e.getValue()));
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
        /**
         * Local calendar day in a FIXED zone (not the interval's own reported
         * offset, which Google fills inconsistently). Bucketing every interval
         * in the same zone matches how the Fitbit/Google Health app groups days.
         */
        LocalDate localDate(ZoneId zone) {
            if (steps == null || steps.interval() == null || steps.interval().startTime() == null) return null;
            return steps.interval().startTime().atZone(zone).toLocalDate();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataSource(@JsonProperty("platform") String platform) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Steps(@JsonProperty("count") String count, Interval interval) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Interval(@JsonProperty("startTime") Instant startTime) {}
}
