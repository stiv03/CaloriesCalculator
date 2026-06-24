package com.stoyandev.caloriecalculator.dto;

import java.util.List;

public record WorkoutVolumeDTO(
        String exerciseName,
        double thisWeekVolume,   // sum of weight * reps
        double lastWeekVolume,
        double volumeDiff,
        List<SetSummaryDTO> thisWeekSets,
        List<SetSummaryDTO> lastWeekSets
) {
    public record SetSummaryDTO(double weight, int reps) {}
}
