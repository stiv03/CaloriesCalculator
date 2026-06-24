package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;
import java.util.List;

public record WorkoutLogResponseDTO(
        Long id,
        LocalDate date,
        Long templateId,
        String exerciseType,
        String label,
        String notes,
        List<WorkoutExerciseDTO> exercises
) {
    public record WorkoutExerciseDTO(
            Long id,
            String exerciseName,
            int position,
            String notes,
            List<WorkoutSetDTO> sets
    ) {}

    public record WorkoutSetDTO(
            Long id,
            int setIndex,
            double weight,
            int reps
    ) {}
}
