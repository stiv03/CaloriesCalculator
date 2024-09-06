package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;

public record MeasurementsRecordDTO(double shoulder,
                                    double chest,
                                    double biceps,
                                    double waist,
                                    double hips,
                                    double thigh,
                                    double calf,
                                    LocalDate date) {
}
