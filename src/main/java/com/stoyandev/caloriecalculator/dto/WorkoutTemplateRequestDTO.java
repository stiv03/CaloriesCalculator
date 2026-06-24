package com.stoyandev.caloriecalculator.dto;

public record WorkoutTemplateRequestDTO(
        String exerciseType,
        String label,
        int sortOrder
) {}
