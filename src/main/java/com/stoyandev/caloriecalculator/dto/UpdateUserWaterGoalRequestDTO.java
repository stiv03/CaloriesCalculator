package com.stoyandev.caloriecalculator.dto;

/** Request body for setting/clearing a user's daily water goal (ml). Nullable to allow clearing. */
public record UpdateUserWaterGoalRequestDTO(Integer waterGoalMl) {
}
