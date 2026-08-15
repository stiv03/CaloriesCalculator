package com.stoyandev.caloriecalculator.dto;

/** Request body for setting/clearing a user's weekly check-in day
 *  (ISO day-of-week: 1=Mon … 7=Sun). Nullable to allow clearing. */
public record UpdateUserCheckInDayRequestDTO(Integer checkInDay) {
}
