package com.stoyandev.caloriecalculator.dto;

import java.time.LocalTime;

public record UpdateUserWeightRequestDTO(double newWeight, LocalTime measureTime) {
}
