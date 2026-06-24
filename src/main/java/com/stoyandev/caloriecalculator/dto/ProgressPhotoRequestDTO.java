package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

public record ProgressPhotoRequestDTO(
        String driveFileId,
        LocalDate date,
        Double weight,
        String notes
) {}
