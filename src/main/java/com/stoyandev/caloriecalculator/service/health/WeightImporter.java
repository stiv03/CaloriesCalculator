package com.stoyandev.caloriecalculator.service.health;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.WeightRecord;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.WeightRecordRepository;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Imports body weight from Google Health into WeightRecord. Upserts by
 * (user, date) — re-imports overwrite that day's row, so running repeatedly is
 * safe. Weight arrives as p.weight.weightGrams (÷1000 = kg).
 */
@Component
@AllArgsConstructor
public class WeightImporter implements HealthImporter {

    private static final Logger log = LoggerFactory.getLogger(WeightImporter.class);
    private static final int DEFAULT_LOOKBACK_DAYS = 30;

    private final WeightRecordRepository weightRepository;
    private final UserRepository userRepository;
    private final RestClient rest = RestClient.create();

    @Override
    public String dataType() {
        return "weight";
    }

    @Override
    public int importSince(Long userId, String accessToken, Instant since) {
        Users user = userRepository.findById(userId).orElse(null);
        if (user == null) return 0;

        Instant from = since != null ? since : Instant.now().minusSeconds(DEFAULT_LOOKBACK_DAYS * 86400L);
        Instant to = Instant.now();
        String filter = "weight.sample_time.physical_time >= \"" + from + "\" AND "
                + "weight.sample_time.physical_time < \"" + to + "\"";

        OffResponse resp = rest.get()
                .uri(GoogleHealthClient.HEALTH_BASE + "/users/me/dataTypes/weight/dataPoints?filter={f}", filter)
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(OffResponse.class);

        if (resp == null || resp.dataPoints() == null) return 0;

        // Keep the last reading per calendar day (WeightRecord is one-per-day).
        int written = 0;
        for (DataPoint dp : resp.dataPoints()) {
            if (dp.weight() == null || dp.weight().weightGrams() == null
                    || dp.weight().sampleTime() == null || dp.weight().sampleTime().physicalTime() == null) {
                continue;
            }
            double kg = Math.round((dp.weight().weightGrams() / 1000.0) * 10) / 10.0;
            LocalDate date = dp.weight().sampleTime().physicalTime().atZone(ZoneOffset.UTC).toLocalDate();

            WeightRecord record = weightRepository.findByUserIdAndDate(userId, date)
                    .orElseGet(() -> { var w = new WeightRecord(); w.setUser(user); w.setDate(date); return w; });
            record.setWeight(kg);
            weightRepository.save(record);
            // Also keep the user's snapshot weight in step with the newest reading.
            written++;
        }
        // Sync the Users snapshot to the most-recent reading, if any.
        resp.dataPoints().stream()
                .filter(d -> d.weight() != null && d.weight().weightGrams() != null && d.weight().sampleTime() != null)
                .max((a, b) -> a.weight().sampleTime().physicalTime().compareTo(b.weight().sampleTime().physicalTime()))
                .ifPresent(latest -> {
                    user.setWeight(Math.round((latest.weight().weightGrams() / 1000.0) * 10) / 10.0);
                    userRepository.save(user);
                });

        log.info("Weight import for user {}: {} day-records upserted", userId, written);
        return written;
    }

    // --- Google Health weight JSON (only fields we need) ---
    @JsonIgnoreProperties(ignoreUnknown = true)
    record OffResponse(List<DataPoint> dataPoints) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataPoint(Weight weight) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Weight(@JsonProperty("weightGrams") Double weightGrams, SampleTime sampleTime) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SampleTime(@JsonProperty("physicalTime") Instant physicalTime) {}
}
