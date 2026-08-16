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
    private final StepRecordRepository stepRecordRepository;
    private final SleepRecordRepository sleepRecordRepository;
    private final MeasurementsRecordRepository measurementsRecordRepository;
    private final ProgressPhotoRepository progressPhotoRepository;
    private final UserRepository userRepository;

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

        // Split by schedule type: only PREWORKOUT supps are training-only (due on
        // workout days, and always "today" so the checklist still reminds). Every
        // other category — DAILY, SLEEP, or a null/legacy value — is due daily.
        var allSupps = supplementRepository.findByUserIdOrderBySortOrderAscIdAsc(userId);
        int totalSupplements = allSupps.size();
        int trainingCount = (int) allSupps.stream()
                .filter(s -> s.getCategory() == com.stoyandev.caloriecalculator.entity.enums.SupplementCategory.PREWORKOUT)
                .count();
        int dailyCount = totalSupplements - trainingCount;

        List<SupplementIntake> intakes = supplementIntakeRepository
                .findBySupplementUserIdAndDateBetween(userId, from, to);

        // Group by date
        Map<LocalDate, List<UserMeals>> mealsByDay = meals.stream()
                .collect(Collectors.groupingBy(m -> m.getConsumedAt().toLocalDate()));
        Map<LocalDate, Double> weightByDay = weights.stream()
                .collect(Collectors.toMap(WeightRecord::getDate, WeightRecord::getWeight, (a, b) -> a));
        Map<LocalDate, Integer> stepsByDay = stepRecordRepository.findByUserIdOrderByDateAsc(userId).stream()
                .filter(s -> !s.getDate().isBefore(from) && !s.getDate().isAfter(to))
                .collect(Collectors.toMap(s -> s.getDate(), s -> s.getSteps(), (a, b) -> a));
        Map<LocalDate, SleepRecord> sleepByDay = sleepRecordRepository.findByUserIdOrderByDateAsc(userId).stream()
                .filter(s -> !s.getDate().isBefore(from) && !s.getDate().isAfter(to))
                .collect(Collectors.toMap(SleepRecord::getDate, s -> s, (a, b) -> a));
        Set<LocalDate> noteDays = notes.stream().map(DailyNote::getDate).collect(Collectors.toSet());
        Map<LocalDate, Workout> workoutByDay = workouts.stream()
                .collect(Collectors.toMap(Workout::getDate, w -> w, (a, b) -> a));
        Map<LocalDate, Long> intakesByDay = intakes.stream()
                .filter(SupplementIntake::isTaken)
                .collect(Collectors.groupingBy(SupplementIntake::getDate, Collectors.counting()));
        // How many supplements were actually tracked on each past day (taken or not).
        // Using this as the per-day denominator keeps historical scores stable: adding
        // a new supplement today no longer retroactively lowers past days' scores.
        Map<LocalDate, Long> trackedByDay = intakes.stream()
                .collect(Collectors.groupingBy(SupplementIntake::getDate, Collectors.counting()));

        // Weekly check-in reminders (measurements + progress photos). The user's
        // checkInDay is an ISO weekday (1=Mon … 7=Sun); default to Sunday when unset.
        // "logged" = a record of that type exists on that exact day. "due" = the day
        // is the check-in weekday (past, today, or upcoming) and no record of that type
        // exists in that week's 7-day window (anchor day + prior 6) — so once you log
        // one that week the reminder auto-resolves. Future check-in days always show as
        // due, surfacing them as upcoming scheduled reminders.
        int checkInDay = userRepository.findById(userId)
                .map(Users::getCheckInDay).filter(d -> d >= 1 && d <= 7).orElse(7);
        Set<LocalDate> measurementDays = measurementsRecordRepository.findByUserId(userId).stream()
                .map(MeasurementsRecord::getDate).collect(Collectors.toSet());
        Set<LocalDate> photoDays = progressPhotoRepository.findByUserIdOrderByDateDescIdDesc(userId).stream()
                .map(ProgressPhoto::getDate).collect(Collectors.toSet());

        LocalDate today = LocalDate.now();

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
            SleepRecord sleep = sleepByDay.get(day);
            // Today is scored against the current supplement list; past days are scored
            // against what was tracked that day, so historical scores don't shift when
            // supplements are added or removed later. PREWORKOUT supps are only due on
            // non-rest days — on a rest day (incl. today) they are excluded from the
            // denominator. Past rest days already exclude them naturally, since a
            // pre-workout supp can never have an intake row on a rest day.
            int dayTotalSupps = day.isBefore(today)
                    ? trackedByDay.getOrDefault(day, 0L).intValue()
                    : (isRest ? dailyCount : dailyCount + trainingCount);

            // Check-in reminders: a record on this exact day marks it logged; the day
            // is "due" on the check-in weekday (including upcoming days) whenever nothing
            // was logged in that week's 7-day window (this day + prior 6).
            boolean measurementLogged = measurementDays.contains(day);
            boolean photoLogged = photoDays.contains(day);
            boolean isCheckInDay = day.getDayOfWeek().getValue() == checkInDay;
            boolean measurementDue = isCheckInDay && !loggedInWindow(measurementDays, day);
            boolean photoDue = isCheckInDay && !loggedInWindow(photoDays, day);

            result.add(new CalendarDayDTO(
                    day, calories, calorieGoal, protein, carbs, fat,
                    weightByDay.get(day),
                    noteDays.contains(day),
                    w != null,
                    isRest ? null : (w != null ? w.getExerciseType().name() : null),
                    isRest ? null : (w != null ? w.getLabel() : null),
                    dayTotalSupps,
                    intakesByDay.getOrDefault(day, 0L).intValue(),
                    totalSupplements > 0,
                    isRest,
                    stepsByDay.get(day),
                    sleep != null ? sleep.getTotalMinutes() : null,
                    sleep != null ? sleep.getRemMinutes() : null,
                    sleep != null ? sleep.getDeepMinutes() : null,
                    sleep != null ? sleep.getLightMinutes() : null,
                    sleep != null ? sleep.getAwakeMinutes() : null,
                    measurementDue,
                    measurementLogged,
                    photoDue,
                    photoLogged
            ));
            cur = cur.plusDays(1);
        }
        return ResponseEntity.ok(result);
    }

    /** True if any date in the 7-day window ending on {@code anchor} (anchor and the
     *  prior 6 days) is present in {@code dates} — i.e. the check-in was already met
     *  that week, so its reminder should not fire. */
    private static boolean loggedInWindow(Set<LocalDate> dates, LocalDate anchor) {
        for (int i = 0; i < 7; i++) {
            if (dates.contains(anchor.minusDays(i))) return true;
        }
        return false;
    }

    /** Daily step history for the Progress chart: [{date, steps}] ascending. */
    @GetMapping("/{userId}/steps")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<Map<String, Object>>> getSteps(@PathVariable Long userId) {
        List<Map<String, Object>> out = stepRecordRepository.findByUserIdOrderByDateAsc(userId).stream()
                .map(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("date", s.getDate().toString());
                    m.put("steps", s.getSteps());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(out);
    }

    /**
     * Sleep detail for one day (wake date): duration, bed/wake times, and the
     * raw stage segments for the hypnogram. 204 when no sleep that day. Kept off
     * the month payload so that response stays small.
     */
    @GetMapping("/{userId}/sleep/{date}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Map<String, Object>> getSleep(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var recOpt = sleepRecordRepository.findByUserIdAndDate(userId, date);
        if (recOpt.isEmpty()) return ResponseEntity.noContent().build();
        SleepRecord s = recOpt.get();
        Map<String, Object> out = new HashMap<>();
        out.put("date", s.getDate().toString());
        out.put("startTime", s.getStartTime() != null ? s.getStartTime().toString() : null);
        out.put("endTime", s.getEndTime() != null ? s.getEndTime().toString() : null);
        out.put("totalMinutes", s.getTotalMinutes());
        out.put("rem", s.getRemMinutes());
        out.put("deep", s.getDeepMinutes());
        out.put("light", s.getLightMinutes());
        out.put("awake", s.getAwakeMinutes());
        // Parse the stored JSON back to real JSON so the client gets an array,
        // not an escaped string. Empty on parse failure — totals still returned.
        Object segments = List.of();
        if (s.getSegments() != null && !s.getSegments().isBlank()) {
            try {
                segments = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(s.getSegments(), Object.class);
            } catch (Exception ignored) { /* keep empty */ }
        }
        out.put("segments", segments);
        return ResponseEntity.ok(out);
    }
}
