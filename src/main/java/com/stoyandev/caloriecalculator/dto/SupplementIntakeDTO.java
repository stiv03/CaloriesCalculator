package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

public record SupplementIntakeDTO(Long supplementId, LocalDate date, boolean taken) {
}
