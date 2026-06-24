package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.*;
import com.stoyandev.caloriecalculator.entity.*;
import com.stoyandev.caloriecalculator.entity.enums.ExerciseType;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.*;
import com.stoyandev.caloriecalculator.service.WorkoutService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@Service
@AllArgsConstructor
@Transactional
public class WorkoutServiceImpl implements WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final WorkoutTemplateRepository templateRepository;
    private final WorkoutTemplateExerciseRepository templateExerciseRepository;
    private final UserRepository userRepository;

    // ─── Template management ────────────────────────────────────────────────

    @Override
    public List<WorkoutTemplateDTO> getTemplates(Long userId) {
        return templateRepository.findByUserIdOrderBySortOrderAsc(userId).stream()
                .map(this::toTemplateDTO).toList();
    }

    @Override
    public WorkoutTemplateDTO createTemplate(Long userId, WorkoutTemplateRequestDTO req) {
        Users user = getUser(userId);
        long count = templateRepository.findByUserIdOrderBySortOrderAsc(userId).size();
        WorkoutTemplate t = WorkoutTemplate.builder()
                .user(user)
                .exerciseType(ExerciseType.valueOf(req.exerciseType().toUpperCase()))
                .label(req.label())
                .sortOrder(req.sortOrder() >= 0 ? req.sortOrder() : (int) count)
                .build();
        return toTemplateDTO(templateRepository.save(t));
    }

    @Override
    public WorkoutTemplateDTO updateTemplate(Long userId, Long templateId, WorkoutTemplateRequestDTO req) {
        WorkoutTemplate t = ownedTemplate(userId, templateId);
        if (req.exerciseType() != null) t.setExerciseType(ExerciseType.valueOf(req.exerciseType().toUpperCase()));
        t.setLabel(req.label());
        t.setSortOrder(req.sortOrder());
        return toTemplateDTO(templateRepository.save(t));
    }

    @Override
    public void deleteTemplate(Long userId, Long templateId) {
        templateRepository.delete(ownedTemplate(userId, templateId));
    }

    @Override
    public WorkoutTemplateDTO addExerciseToTemplate(Long userId, Long templateId, WorkoutTemplateExerciseRequestDTO req) {
        WorkoutTemplate t = ownedTemplate(userId, templateId);
        int pos = req.position() >= 0 ? req.position() : t.getExercises().size();
        WorkoutTemplateExercise ex = WorkoutTemplateExercise.builder()
                .template(t)
                .exerciseName(req.exerciseName())
                .targetSetsReps(req.targetSetsReps())
                .position(pos)
                .build();
        t.getExercises().add(ex);
        return toTemplateDTO(templateRepository.save(t));
    }

    @Override
    public WorkoutTemplateDTO updateTemplateExercise(Long userId, Long templateId, Long exerciseId, WorkoutTemplateExerciseRequestDTO req) {
        ownedTemplate(userId, templateId);
        WorkoutTemplateExercise ex = templateExerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        if (req.exerciseName() != null) ex.setExerciseName(req.exerciseName());
        if (req.targetSetsReps() != null) ex.setTargetSetsReps(req.targetSetsReps());
        if (req.position() >= 0) ex.setPosition(req.position());
        templateExerciseRepository.save(ex);
        return toTemplateDTO(ownedTemplate(userId, templateId));
    }

    @Override
    public WorkoutTemplateDTO removeExerciseFromTemplate(Long userId, Long templateId, Long exerciseId) {
        WorkoutTemplate t = ownedTemplate(userId, templateId);
        t.getExercises().removeIf(e -> e.getId().equals(exerciseId));
        return toTemplateDTO(templateRepository.save(t));
    }

    @Override
    public WorkoutTemplateDTO reorderTemplateExercises(Long userId, Long templateId, List<Long> orderedIds) {
        WorkoutTemplate t = ownedTemplate(userId, templateId);
        for (int i = 0; i < orderedIds.size(); i++) {
            final int idx = i;
            t.getExercises().stream()
                    .filter(e -> e.getId().equals(orderedIds.get(idx)))
                    .findFirst()
                    .ifPresent(e -> e.setPosition(idx));
        }
        return toTemplateDTO(templateRepository.save(t));
    }

    // ─── Workout logging ────────────────────────────────────────────────────

    @Override
    public WorkoutLogResponseDTO logWorkout(Long userId, WorkoutLogRequestDTO req) {
        Users user = getUser(userId);
        // A real workout always replaces a rest-day flag for the same date.
        workoutRepository.findByUserIdAndDate(userId, req.date())
                .filter(Workout::isRestDay)
                .ifPresent(workoutRepository::delete);
        if (req.templateId() != null && workoutRepository.existsByUserIdAndDateAndTemplateId(userId, req.date(), req.templateId())) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "You already logged this workout today. Delete the existing one first if you want to re-log it.");
        }
        Workout workout = new Workout();
        workout.setUser(user);
        workout.setDate(req.date());
        workout.setTemplateId(req.templateId());
        workout.setExerciseType(ExerciseType.valueOf(req.exerciseType().toUpperCase()));
        workout.setLabel(req.label());
        workout.setNotes(req.notes());

        for (WorkoutLogRequestDTO.WorkoutExerciseDTO exDto : req.exercises()) {
            Exercise ex = new Exercise();
            ex.setWorkout(workout);
            ex.setExerciseName(exDto.exerciseName());
            ex.setPosition(exDto.position());
            ex.setNotes(exDto.notes());
            int si = 0;
            for (WorkoutLogRequestDTO.WorkoutSetDTO setDto : exDto.sets()) {
                ExerciseSet set = new ExerciseSet();
                set.setWorkoutExercise(ex);
                set.setSetIndex(si++);
                set.setWeight(setDto.weight());
                set.setReps(setDto.reps());
                ex.getSets().add(set);
            }
            workout.getExercises().add(ex);
        }
        return toLogDTO(workoutRepository.save(workout));
    }

    @Override
    public List<WorkoutLogResponseDTO> getWorkoutHistory(Long userId) {
        return workoutRepository.findByUserIdOrderByDateDescIdDesc(userId).stream()
                .filter(w -> !w.isRestDay())
                .map(this::toLogDTO).toList();
    }

    @Override
    public WorkoutLogResponseDTO getWorkout(Long userId, Long workoutId) {
        return toLogDTO(ownedWorkout(userId, workoutId));
    }

    @Override
    public void deleteWorkout(Long userId, Long workoutId) {
        workoutRepository.delete(ownedWorkout(userId, workoutId));
    }

    @Override
    public void setRestDay(Long userId, LocalDate date, boolean rest) {
        Optional<Workout> existing = workoutRepository.findByUserIdAndDate(userId, date);
        if (rest) {
            // Only today can be newly marked as rest. Unmarking past rest days stays allowed.
            if (!date.equals(LocalDate.now())) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                        "Rest day can only be set for today.");
            }
            if (existing.isPresent() && !existing.get().isRestDay()) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                        "A workout is already logged for this day.");
            }
            if (existing.isPresent()) return; // already a rest row, idempotent
            Users user = getUser(userId);
            Workout w = new Workout();
            w.setUser(user);
            w.setDate(date);
            // workout_type has a DB check constraint locked to the original enum values;
            // store a placeholder (PUSH) and rely on rest_day=true to identify rest rows.
            w.setExerciseType(ExerciseType.PUSH);
            w.setRestDay(true);
            workoutRepository.save(w);
        } else {
            existing.filter(Workout::isRestDay).ifPresent(workoutRepository::delete);
        }
    }

    @Override
    public List<WorkoutVolumeDTO> getVolumeProgress(Long userId, String dayName) {
        LocalDate today = LocalDate.now();
        LocalDate thisMon = today.minusDays(today.getDayOfWeek().getValue() - 1);
        LocalDate lastMon = thisMon.minusWeeks(1);

        List<Workout> recent = workoutRepository.findByUserIdSince(userId, lastMon).stream()
                .filter(w -> !w.isRestDay())
                .toList();

        List<Workout> thisWeek = recent.stream()
                .filter(w -> dayName == null || dayName.equalsIgnoreCase(w.getExerciseType().name()))
                .filter(w -> !w.getDate().isBefore(thisMon))
                .toList();

        List<Workout> lastWeek = recent.stream()
                .filter(w -> dayName == null || dayName.equalsIgnoreCase(w.getExerciseType().name()))
                .filter(w -> w.getDate().isBefore(thisMon) && !w.getDate().isBefore(lastMon))
                .toList();

        Map<String, List<ExerciseSet>> thisSets = collectSets(thisWeek);
        Map<String, List<ExerciseSet>> lastSets = collectSets(lastWeek);

        Set<String> allExercises = new LinkedHashSet<>();
        allExercises.addAll(thisSets.keySet());
        allExercises.addAll(lastSets.keySet());

        return allExercises.stream().map(name -> {
            List<ExerciseSet> tw = thisSets.getOrDefault(name, List.of());
            List<ExerciseSet> lw = lastSets.getOrDefault(name, List.of());
            double thisVol = volume(tw);
            double lastVol = volume(lw);
            return new WorkoutVolumeDTO(name, thisVol, lastVol, thisVol - lastVol,
                    tw.stream().map(s -> new WorkoutVolumeDTO.SetSummaryDTO(s.getWeight(), s.getReps())).toList(),
                    lw.stream().map(s -> new WorkoutVolumeDTO.SetSummaryDTO(s.getWeight(), s.getReps())).toList());
        }).toList();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private Users getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private WorkoutTemplate ownedTemplate(Long userId, Long templateId) {
        return templateRepository.findByIdAndUserId(templateId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
    }

    private Workout ownedWorkout(Long userId, Long workoutId) {
        Workout w = workoutRepository.findById(workoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout not found"));
        if (!w.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Workout not found");
        return w;
    }

    private Map<String, List<ExerciseSet>> collectSets(List<Workout> workouts) {
        Map<String, List<ExerciseSet>> map = new LinkedHashMap<>();
        for (Workout w : workouts)
            for (Exercise ex : w.getExercises())
                map.computeIfAbsent(ex.getExerciseName(), k -> new ArrayList<>()).addAll(ex.getSets());
        return map;
    }

    private double volume(List<ExerciseSet> sets) {
        return sets.stream().mapToDouble(s -> s.getWeight() * s.getReps()).sum();
    }

    private WorkoutTemplateDTO toTemplateDTO(WorkoutTemplate t) {
        return new WorkoutTemplateDTO(t.getId(), t.getExerciseType().name(), t.getLabel(), t.getSortOrder(),
                t.getExercises().stream().map(e -> new WorkoutTemplateDTO.WorkoutTemplateExerciseDTO(
                        e.getId(), e.getExerciseName(), e.getTargetSetsReps(), e.getPosition())).toList());
    }

    private WorkoutLogResponseDTO toLogDTO(Workout w) {
        return new WorkoutLogResponseDTO(w.getId(), w.getDate(), w.getTemplateId(),
                w.getExerciseType().name(), w.getLabel(), w.getNotes(),
                w.getExercises().stream().map(ex -> new WorkoutLogResponseDTO.WorkoutExerciseDTO(
                        ex.getId(), ex.getExerciseName(), ex.getPosition(), ex.getNotes(),
                        ex.getSets().stream().map(s -> new WorkoutLogResponseDTO.WorkoutSetDTO(
                                s.getId(), s.getSetIndex(), s.getWeight(), s.getReps())).toList())).toList());
    }
}
