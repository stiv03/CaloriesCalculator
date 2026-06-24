package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.StreaksDTO;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.SupplementIntakeRepository;
import com.stoyandev.caloriecalculator.repository.WeightRecordRepository;
import com.stoyandev.caloriecalculator.service.StreakService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StreakServiceImpl implements StreakService {

    private final MealsRepository mealsRepository;
    private final WeightRecordRepository weightRecordRepository;
    private final SupplementIntakeRepository supplementIntakeRepository;

    @Override
    public StreaksDTO getStreaks(final Long userId) {
        final LocalDate today = LocalDate.now();
        return new StreaksDTO(
                streakFromDates(mealsRepository.findDistinctMealDatesDesc(userId), today),
                streakFromDates(weightRecordRepository.findDistinctWeightDatesDesc(userId), today),
                streakFromDates(supplementIntakeRepository.findDistinctTakenDatesDesc(userId), today)
        );
    }

    /**
     * Count consecutive days back from {@code today}. If {@code today} is not
     * in the set, allow the streak to start at {@code today - 1} so that a
     * user who logged yesterday but not yet today still sees their streak.
     * Anything older than that is a broken streak (returns 0).
     */
    static int streakFromDates(final List<LocalDate> dates, final LocalDate today) {
        if (dates == null || dates.isEmpty()) return 0;
        final Set<LocalDate> set = new HashSet<>(dates);

        LocalDate cursor = today;
        if (!set.contains(cursor)) {
            cursor = cursor.minusDays(1);
            if (!set.contains(cursor)) return 0;
        }

        int streak = 0;
        while (set.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
