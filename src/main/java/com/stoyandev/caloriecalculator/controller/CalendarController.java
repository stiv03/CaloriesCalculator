package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.CalendarDayDTO;
import com.stoyandev.caloriecalculator.entity.*;
import com.stoyandev.caloriecalculator.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/calendar")
@AllArgsConstructor
public class CalendarController {

    private final MealsRepository mealsRepository;
    private final GoalRepository goalRepository;
    private final WeightRecordRepository weightRecordRepository;
    private final DailyNoteRepository dailyNoteRepository;
    private final WorkoutRepository workoutRepository;
    private final SupplementRepository supplementRepository;
    private final SupplementIntakeRepository supplementIntakeRepository;

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<CalendarDayDTO>> getMonth(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        // Fetch all data for the range at once
        List<UserMeals> meals = mealsRepository.findAllByUserIdAndConsumedAtRange(
                userId, from.atStartOfDay(), to.plusDays(1).atStartOfDay());

        var goal = goalRepository.findByUserId(userId);
        int calorieGoal = goal.map(g -> g.getCalories()).orElse(0);

        List<WeightRecord> weights = weightRecordRepository
                .findByUserId(userId).stream()
                .filter(w -> !w.getDate().isBefore(from) && !w.getDate().isAfter(to))
                .toList();

        List<DailyNote> notes = dailyNoteRepository.findAllByUserIdOrderByDateDesc(userId).stream()
                .filter(n -> !n.getDate().isBefore(from) && !n.getDate().isAfter(to))
                .toList();

        List<Workout> workouts = workoutRepository.findByUserIdOrderByDateDescIdDesc(userId).stream()
                .filter(w -> !w.getDate().isBefore(from) && !w.getDate().isAfter(to))
                .toList();

        int totalSupplements = supplementRepository.findByUserIdOrderBySortOrderAscIdAsc(userId).size();

        List<SupplementIntake> intakes = supplementIntakeRepository
                .findBySupplementUserIdAndDateBetween(userId, from, to);

        // Group by date
        Map<LocalDate, List<UserMeals>> mealsByDay = meals.stream()
                .collect(Collectors.groupingBy(m -> m.getConsumedAt().toLocalDate()));
        Map<LocalDate, Double> weightByDay = weights.stream()
                .collect(Collectors.toMap(WeightRecord::getDate, WeightRecord::getWeight, (a, b) -> a));
        Set<LocalDate> noteDays = notes.stream().map(DailyNote::getDate).collect(Collectors.toSet());
        Map<LocalDate, Workout> workoutByDay = workouts.stream()
                .collect(Collectors.toMap(Workout::getDate, w -> w, (a, b) -> a));
        Map<LocalDate, Long> intakesByDay = intakes.stream()
                .filter(SupplementIntake::isTaken)
                .collect(Collectors.groupingBy(SupplementIntake::getDate, Collectors.counting()));

        List<CalendarDayDTO> result = new ArrayList<>();
        LocalDate cur = from;
        while (!cur.isAfter(to)) {
            final LocalDate day = cur;
            List<UserMeals> dayMeals = mealsByDay.getOrDefault(day, List.of());

            int calories = 0;
            double protein = 0, carbs = 0, fat = 0;
            for (UserMeals m : dayMeals) {
                if (m.getProduct() != null) {
                    double q = m.getQuantity() / 100.0;
                    calories += (int)(m.getProduct().getCaloriesPer100Grams() * q);
                    protein  += m.getProduct().getProteinPer100Grams() * q;
                    carbs    += m.getProduct().getCarbsPer100Grams() * q;
                    fat      += m.getProduct().getFatPer100Grams() * q;
                }
            }

            Workout w = workoutByDay.get(day);
            boolean isRest = w != null && w.isRestDay();
            result.add(new CalendarDayDTO(
                    day, calories, calorieGoal, protein, carbs, fat,
                    weightByDay.get(day),
                    noteDays.contains(day),
                    w != null,
                    isRest ? null : (w != null ? w.getExerciseType().name() : null),
                    isRest ? null : (w != null ? w.getLabel() : null),
                    totalSupplements,
                    intakesByDay.getOrDefault(day, 0L).intValue(),
                    isRest
            ));
            cur = cur.plusDays(1);
        }
        return ResponseEntity.ok(result);
    }
}
