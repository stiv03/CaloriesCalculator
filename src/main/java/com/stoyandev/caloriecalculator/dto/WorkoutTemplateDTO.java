package com.stoyandev.caloriecalculator.dto;

import java.util.List;

public record WorkoutTemplateDTO(
        Long id,
        String exerciseType,
        String label,
        int sortOrder,
        List<WorkoutTemplateExerciseDTO> exercises
) {
    public record WorkoutTemplateExerciseDTO(
            Long id,
            String exerciseName,
            String targetSetsReps,
            int position
    ) {}
}
