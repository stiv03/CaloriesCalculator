package com.stoyandev.caloriecalculator.dto;

/** Request body for setting/clearing a user's target (goal) weight. Nullable to allow clearing. */
public record UpdateUserGoalWeightRequestDTO(Double goalWeight) {
}
