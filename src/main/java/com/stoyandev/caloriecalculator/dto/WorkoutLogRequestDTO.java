package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;
import java.util.List;

public record WorkoutLogRequestDTO(
        LocalDate date,
        Long templateId,
        String exerciseType,
        String label,
        String notes,
        List<WorkoutExerciseDTO> exercises
) {
    public record WorkoutExerciseDTO(
            String exerciseName,
            int position,
            String notes,
            List<WorkoutSetDTO> sets
    ) {}

    public record WorkoutSetDTO(
            int setIndex,
            double weight,
            int reps
    ) {}
}
