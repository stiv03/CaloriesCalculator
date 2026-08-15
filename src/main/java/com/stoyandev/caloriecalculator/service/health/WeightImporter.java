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
 * Imports body weight from Google Health into WeightRecord. Fills empty days
 * only — a day that already has a record (manual entry or a prior sync) is left
 * untouched, so the sync never overwrites a weight you've already recorded. The
 * Users.weight snapshot still tracks Google's most-recent reading. Weight
 * arrives as p.weight.weightGrams (÷1000 = kg).
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

        // Fill empty days only: a day that already has a WeightRecord (manually
        // entered, or written by a previous sync) is never overwritten. Google
        // only fills in days we have nothing for — first value for a day wins.
        int written = 0;
        for (DataPoint dp : resp.dataPoints()) {
            if (dp.weight() == null || dp.weight().weightGrams() == null
                    || dp.weight().sampleTime() == null || dp.weight().sampleTime().physicalTime() == null) {
                continue;
            }
            double kg = Math.round((dp.weight().weightGrams() / 1000.0) * 10) / 10.0;
            LocalDate date = dp.weight().sampleTime().physicalTime().atZone(ZoneOffset.UTC).toLocalDate();

            if (weightRepository.findByUserIdAndDate(userId, date).isPresent()) {
                continue; // day already has a weight — leave it untouched
            }
            WeightRecord record = new WeightRecord();
            record.setUser(user);
            record.setDate(date);
            record.setWeight(kg);
            weightRepository.save(record);
            written++;
        }
        // Snapshot the user's current weight to the single most-recent record,
        // whatever its source (manual or Google). Reading "latest record" rather
        // than "latest Google reading" keeps current weight consistent — a newer
        // manual entry won't be dragged back to an older synced value.
        WeightRecord latest = weightRepository.findTopByUserIdOrderByDateDesc(userId);
        if (latest != null) {
            user.setWeight(latest.getWeight());
            userRepository.save(user);
        }

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
