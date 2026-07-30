package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.enums.Pose;

import java.time.LocalDate;

public record ProgressPhotoDTO(
        Long id,
        String driveFileId,
        LocalDate date,
        Pose pose,
        Double weight,
        String notes
) {}
