package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

public record ProgressPhotoDTO(
        Long id,
        String driveFileId,
        LocalDate date,
        Double weight,
        String notes
) {}
