package com.stoyandev.caloriecalculator.service.implementations;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StreakServiceImplTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 6, 16);

    @Test
    void returnsZeroForNoDates() {
        assertThat(StreakServiceImpl.streakFromDates(List.of(), TODAY)).isZero();
    }

    @Test
    void returnsZeroWhenLastEntryIsTwoDaysAgo() {
        // gap of one full day between yesterday and last entry => streak broken
        List<LocalDate> dates = List.of(TODAY.minusDays(2), TODAY.minusDays(3));
        assertThat(StreakServiceImpl.streakFromDates(dates, TODAY)).isZero();
    }

    @Test
    void countsTodayPlusConsecutivePastDays() {
        List<LocalDate> dates = List.of(TODAY, TODAY.minusDays(1), TODAY.minusDays(2));
        assertThat(StreakServiceImpl.streakFromDates(dates, TODAY)).isEqualTo(3);
    }

    @Test
    void allowsMissingTodayWhenYesterdayLogged() {
        // user hasn't logged yet today but did yesterday — streak still alive
        List<LocalDate> dates = List.of(TODAY.minusDays(1), TODAY.minusDays(2), TODAY.minusDays(3));
        assertThat(StreakServiceImpl.streakFromDates(dates, TODAY)).isEqualTo(3);
    }

    @Test
    void stopsAtTheFirstGap() {
        List<LocalDate> dates = List.of(
                TODAY,
                TODAY.minusDays(1),
                // gap on day -2
                TODAY.minusDays(3),
                TODAY.minusDays(4)
        );
        assertThat(StreakServiceImpl.streakFromDates(dates, TODAY)).isEqualTo(2);
    }

    @Test
    void duplicateDatesAreNotDoubleCounted() {
        // The repository query uses DISTINCT, but the math should be safe regardless.
        List<LocalDate> dates = List.of(TODAY, TODAY, TODAY.minusDays(1));
        assertThat(StreakServiceImpl.streakFromDates(dates, TODAY)).isEqualTo(2);
    }
}
