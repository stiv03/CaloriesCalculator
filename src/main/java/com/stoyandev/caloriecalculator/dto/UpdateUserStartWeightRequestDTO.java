package com.stoyandev.caloriecalculator.dto;

/** Request body for setting/clearing a user's starting weight. Nullable to allow clearing. */
public record UpdateUserStartWeightRequestDTO(Double startWeight) {
}
