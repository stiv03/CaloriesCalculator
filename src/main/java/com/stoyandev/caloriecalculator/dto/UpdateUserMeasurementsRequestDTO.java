package com.stoyandev.caloriecalculator.dto;

public record UpdateUserMeasurementsRequestDTO(double shoulder,
                                               double chest,
                                               double biceps,
                                               double waist,
                                               double hips,
                                               double thigh,
                                               double calf) {
}
