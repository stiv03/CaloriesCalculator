package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

/** Water intake for a single day. */
public record WaterRecordDTO(LocalDate date, int amountMl) {
}
