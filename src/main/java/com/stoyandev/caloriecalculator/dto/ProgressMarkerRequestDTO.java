package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

public record ProgressMarkerRequestDTO(
        LocalDate date,
        String label
) {}
