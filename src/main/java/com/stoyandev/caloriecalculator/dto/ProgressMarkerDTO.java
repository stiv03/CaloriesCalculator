package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

public record ProgressMarkerDTO(
        Long id,
        LocalDate date,
        String label,
        String color
) {}
