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
 * Imports step counts from Google Health into StepRecord. Google returns steps
 * as intra-day intervals, so we SUM them per calendar day and upsert one row
 * per day. Same import mechanism as WeightImporter (Google → app).
 */
@Component
@AllArgsConstructor
public class StepImporter implements HealthImporter {

    private static final Logger log = LoggerFactory.getLogger(StepImporter.class);
    private static final int DEFAULT_LOOKBACK_DAYS = 30;

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

        // Steps are minute-level buckets we sum per day, and re-imports OVERWRITE
        // the day's total. So we must always re-fetch WHOLE days — never just
        // "since last sync", or a mid-day re-sync would replace today's full
        // total with a tiny partial slice. Always fetch from the start of the
        // look-back window (a fresh sync uses 30 days; a same-day re-sync still
        // re-totals today in full). `since` is intentionally ignored here.
        int lookbackDays = DEFAULT_LOOKBACK_DAYS;
        Instant from = LocalDate.now().minusDays(lookbackDays).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = Instant.now();
        String filter = "steps.interval.start_time >= \"" + from + "\" AND "
                + "steps.interval.start_time < \"" + to + "\"";

        // Steps arrive as many minute-level buckets; the API paginates. Follow
        // nextPageToken and sum ALL pages, or we'd only total the first page
        // (which produced wildly low daily totals).
        Map<LocalDate, Integer> byDay = new HashMap<>();
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
                            .queryParamIfPresent("pageToken",
                                    java.util.Optional.ofNullable(tok))
                            .build())
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(OffResponse.class);

            if (resp == null) break;
            if (resp.dataPoints() != null) {
                for (DataPoint dp : resp.dataPoints()) {
                    Integer count = dp.stepCount();
                    Instant when = dp.startTime();
                    if (count == null || when == null) continue;
                    LocalDate date = when.atZone(ZoneOffset.UTC).toLocalDate();
                    byDay.merge(date, count, Integer::sum);
                }
            }
            pageToken = resp.nextPageToken();
            pages++;
        } while (pageToken != null && !pageToken.isBlank() && pages < 100); // safety cap

        int daysWritten = 0;
        for (Map.Entry<LocalDate, Integer> e : byDay.entrySet()) {
            LocalDate date = e.getKey();
            StepRecord rec = stepRepository.findByUserIdAndDate(userId, date)
                    .orElseGet(() -> { var s = new StepRecord(); s.setUser(user); s.setDate(date); return s; });
            rec.setSteps(e.getValue());
            stepRepository.save(rec);
            daysWritten++;
        }
        log.info("Steps import for user {}: {} day-records over {} page(s)", userId, daysWritten, pages);
        return daysWritten;
    }

    // --- Google Health steps JSON (verified shape):
    //   dataPoints[].steps.count            = string count, e.g. "3"
    //   dataPoints[].steps.interval.startTime = RFC-3339
    @JsonIgnoreProperties(ignoreUnknown = true)
    record OffResponse(List<DataPoint> dataPoints, @JsonProperty("nextPageToken") String nextPageToken) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataPoint(Steps steps) {
        Integer stepCount() {
            if (steps == null || steps.count() == null) return null;
            try { return (int) Math.round(Double.parseDouble(steps.count())); }
            catch (NumberFormatException e) { return null; }
        }
        Instant startTime() {
            return steps != null && steps.interval() != null ? steps.interval().startTime() : null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Steps(@JsonProperty("count") String count, Interval interval) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Interval(@JsonProperty("startTime") Instant startTime) {}
}
