package com.stoyandev.caloriecalculator.dto;

/**
 * How many consecutive days the user has logged each habit, ending today
 * (or yesterday if today's slot is still empty — see {@code StreakService}).
 */
public record StreaksDTO(int meals, int weight, int supplements) {
}
