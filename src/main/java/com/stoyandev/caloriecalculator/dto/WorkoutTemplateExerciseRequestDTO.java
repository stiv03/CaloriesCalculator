package com.stoyandev.caloriecalculator.dto;

public record WorkoutTemplateExerciseRequestDTO(
        String exerciseName,
        String targetSetsReps,
        int position
) {}
