package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record WeightRecordDTO(double weight, LocalDate date, LocalTime measureTime) {
}
