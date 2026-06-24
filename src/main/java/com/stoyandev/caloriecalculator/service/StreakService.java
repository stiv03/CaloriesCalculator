package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.StreaksDTO;

public interface StreakService {

    /**
     * Compute the user's current consecutive-day streaks for meals, weight
     * records, and supplement intakes. A streak counts back from today; if
     * today has no entry yet, the streak counts back from yesterday so the
     * user doesn't see "streak: 0" for the rest of the day before logging.
     */
    StreaksDTO getStreaks(Long userId);
}
