package com.stoyandev.caloriecalculator.dto;

import java.util.List;

/**
 * A day's Google Health workout, enriched with everything Google actually
 * exposes: duration, average/min/max HR, per-zone minutes, active zone
 * minutes, and an HR-over-time trace for the graph. Fitbit-proprietary
 * numbers (Cardio Load, overall effort/RPE) are NOT in Google's API, so they
 * are intentionally absent.
 */
public record ActivityDTO(boolean found, String exerciseType, Integer durationMin,
                          Integer avgHr, Integer minHr, Integer maxHr,
                          Integer activeZoneMinutes,
                          List<Zone> zones,
                          List<HrSample> hrSeries,
                          String reason) {

    /** Minutes spent in one HR zone (LIGHT / MODERATE / VIGOROUS / PEAK). */
    public record Zone(String name, Integer minutes) {}

    /** One heart-rate reading for the trace: epoch millis + bpm. */
    public record HrSample(long t, int bpm) {}

    public static ActivityDTO notFound(String reason) {
        return new ActivityDTO(false, null, null, null, null, null, null,
                List.of(), List.of(), reason);
    }
}
