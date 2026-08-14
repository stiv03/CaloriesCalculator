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
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Imports daily step totals from Google Health into StepRecord (one row/day).
 *
 * Uses Google's DAILY ROLLUP query, not the raw interval dataPoints: the rollup
 * is reconciled/deduplicated across all sources (Fitbit, phone, etc.) and keyed
 * by civil (local) date — so it matches the number shown in the Google Health
 * app. Summing raw per-source buckets double-counted overlapping sources and
 * inflated totals.
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

        // Always re-roll whole days over the look-back (ignore narrow `since`) so
        // a same-day re-sync re-totals today completely rather than partially.
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(DEFAULT_LOOKBACK_DAYS);

        Map<String, Object> body = Map.of(
                "range", Map.of(
                        "startDate", civil(start),
                        "endDate", civil(today.plusDays(1))),  // endDate exclusive-ish; +1 to include today
                "pageSize", 100,
                "windowSizeDays", 1);

        int daysWritten = 0;
        String pageToken = null;
        int pages = 0;
        do {
            Map<String, Object> req = new java.util.HashMap<>(body);
            if (pageToken != null) req.put("pageToken", pageToken);

            String raw = rest.post()
                    .uri("https://health.googleapis.com/v4/users/me/dataTypes/steps/dailyRollupDataPoints:query")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(String.class);
            if (pages == 0) {
                log.info("[steps-rollup] raw response user {}: {}", userId,
                        raw == null ? "null" : raw.substring(0, Math.min(raw.length(), 1200)));
            }
            RollupResponse resp;
            try {
                resp = new com.fasterxml.jackson.databind.ObjectMapper().readValue(raw, RollupResponse.class);
            } catch (Exception e) {
                resp = null;
            }

            if (resp == null) break;
            if (resp.rollupDataPoints() != null) {
                for (RollupPoint p : resp.rollupDataPoints()) {
                    LocalDate date = p.localDate();
                    Integer count = p.stepCount();
                    if (date == null || count == null) continue;
                    final LocalDate d = date;
                    StepRecord rec = stepRepository.findByUserIdAndDate(userId, d)
                            .orElseGet(() -> { var s = new StepRecord(); s.setUser(user); s.setDate(d); return s; });
                    rec.setSteps(count);
                    stepRepository.save(rec);
                    daysWritten++;
                }
            }
            pageToken = resp.nextPageToken();
            pages++;
        } while (pageToken != null && !pageToken.isBlank() && pages < 50);

        log.info("Steps rollup import for user {}: {} day-records over {} page(s)", userId, daysWritten, pages);
        return daysWritten;
    }

    /** Google CivilDate {year, month, day}. */
    private static Map<String, Object> civil(LocalDate d) {
        return Map.of("year", d.getYear(), "month", d.getMonthValue(), "day", d.getDayOfMonth());
    }

    // --- Daily rollup response (verified shape):
    //   rollupDataPoints[].date = {year,month,day}
    //   rollupDataPoints[].stepsRollupValue.countSum = "8432" (string)
    @JsonIgnoreProperties(ignoreUnknown = true)
    record RollupResponse(List<RollupPoint> rollupDataPoints,
                          @JsonProperty("nextPageToken") String nextPageToken) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RollupPoint(CivilDate date,
                       @JsonProperty("stepsRollupValue") StepsRollup stepsRollupValue) {
        LocalDate localDate() {
            return date != null ? date.toLocalDate() : null;
        }
        Integer stepCount() {
            if (stepsRollupValue == null || stepsRollupValue.countSum() == null) return null;
            try { return (int) Math.round(Double.parseDouble(stepsRollupValue.countSum())); }
            catch (NumberFormatException e) { return null; }
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record CivilDate(Integer year, Integer month, Integer day) {
        LocalDate toLocalDate() {
            return (year != null && month != null && day != null) ? LocalDate.of(year, month, day) : null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record StepsRollup(@JsonProperty("countSum") String countSum) {}
}
