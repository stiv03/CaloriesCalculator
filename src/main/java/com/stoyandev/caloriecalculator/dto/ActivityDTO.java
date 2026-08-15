package com.stoyandev.caloriecalculator.dto;

import java.util.List;

public record ActivityDTO(boolean found, String exerciseType, Integer durationMin,
                          Integer avgHr, Integer minHr, Integer maxHr,
                          List<Zone> zones, String reason) {

    public record Zone(String name, Integer minutes) {}

    public static ActivityDTO notFound(String reason) {
        return new ActivityDTO(false, null, null, null, null, null, List.of(), reason);
    }
}
