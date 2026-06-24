package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.*;

import java.util.List;

public interface WorkoutService {
    // Template management (user-scoped)
    List<WorkoutTemplateDTO> getTemplates(Long userId);
    WorkoutTemplateDTO createTemplate(Long userId, WorkoutTemplateRequestDTO request);
    WorkoutTemplateDTO updateTemplate(Long userId, Long templateId, WorkoutTemplateRequestDTO request);
    void deleteTemplate(Long userId, Long templateId);
    WorkoutTemplateDTO addExerciseToTemplate(Long userId, Long templateId, WorkoutTemplateExerciseRequestDTO request);
    WorkoutTemplateDTO updateTemplateExercise(Long userId, Long templateId, Long exerciseId, WorkoutTemplateExerciseRequestDTO request);
    WorkoutTemplateDTO removeExerciseFromTemplate(Long userId, Long templateId, Long exerciseId);
    WorkoutTemplateDTO reorderTemplateExercises(Long userId, Long templateId, List<Long> orderedIds);

    // Workout logging
    WorkoutLogResponseDTO logWorkout(Long userId, WorkoutLogRequestDTO request);
    List<WorkoutLogResponseDTO> getWorkoutHistory(Long userId);
    WorkoutLogResponseDTO getWorkout(Long userId, Long workoutId);
    void deleteWorkout(Long userId, Long workoutId);
    List<WorkoutVolumeDTO> getVolumeProgress(Long userId, String dayName);

    // Rest day
    void setRestDay(Long userId, java.time.LocalDate date, boolean rest);
}
