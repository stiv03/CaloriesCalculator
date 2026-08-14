package com.stoyandev.caloriecalculator.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarDayDTO(
        LocalDate date,
        Integer calories,
        Integer calorieGoal,
        Double protein,
        Double carbs,
        Double fat,
        Double weight,
        boolean hasNote,
        boolean hasWorkout,
        String workoutType,
        String workoutLabel,
        int supplementsTotal,
        int supplementsTaken,
        boolean hasSupplementRoutine,
        boolean isRestDay,
        Integer steps
) {}
