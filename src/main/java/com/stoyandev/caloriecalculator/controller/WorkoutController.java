package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.*;
import com.stoyandev.caloriecalculator.service.WorkoutService;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/workouts")
@AllArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    // ── Template management ──────────────────────────────────────────────────

    @GetMapping("/{userId}/templates")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<WorkoutTemplateDTO>> getTemplates(@PathVariable Long userId) {
        return ResponseEntity.ok(workoutService.getTemplates(userId));
    }

    @PostMapping("/{userId}/templates")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutTemplateDTO> createTemplate(
            @PathVariable Long userId, @RequestBody WorkoutTemplateRequestDTO req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workoutService.createTemplate(userId, req));
    }

    @PutMapping("/{userId}/templates/{templateId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutTemplateDTO> updateTemplate(
            @PathVariable Long userId, @PathVariable Long templateId,
            @RequestBody WorkoutTemplateRequestDTO req) {
        return ResponseEntity.ok(workoutService.updateTemplate(userId, templateId, req));
    }

    @DeleteMapping("/{userId}/templates/{templateId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable Long userId, @PathVariable Long templateId) {
        workoutService.deleteTemplate(userId, templateId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/templates/{templateId}/exercises")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutTemplateDTO> addExercise(
            @PathVariable Long userId, @PathVariable Long templateId,
            @RequestBody WorkoutTemplateExerciseRequestDTO req) {
        return ResponseEntity.ok(workoutService.addExerciseToTemplate(userId, templateId, req));
    }

    @PutMapping("/{userId}/templates/{templateId}/exercises/{exerciseId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutTemplateDTO> updateExercise(
            @PathVariable Long userId, @PathVariable Long templateId,
            @PathVariable Long exerciseId, @RequestBody WorkoutTemplateExerciseRequestDTO req) {
        return ResponseEntity.ok(workoutService.updateTemplateExercise(userId, templateId, exerciseId, req));
    }

    @DeleteMapping("/{userId}/templates/{templateId}/exercises/{exerciseId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutTemplateDTO> removeExercise(
            @PathVariable Long userId, @PathVariable Long templateId,
            @PathVariable Long exerciseId) {
        return ResponseEntity.ok(workoutService.removeExerciseFromTemplate(userId, templateId, exerciseId));
    }

    @PutMapping("/{userId}/templates/{templateId}/reorder")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutTemplateDTO> reorderExercises(
            @PathVariable Long userId, @PathVariable Long templateId,
            @RequestBody List<Long> orderedIds) {
        return ResponseEntity.ok(workoutService.reorderTemplateExercises(userId, templateId, orderedIds));
    }

    // ── Workout logging ──────────────────────────────────────────────────────

    @PostMapping("/{userId}/log")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutLogResponseDTO> logWorkout(
            @PathVariable Long userId, @RequestBody WorkoutLogRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workoutService.logWorkout(userId, request));
    }

    @GetMapping("/{userId}/log")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<WorkoutLogResponseDTO>> getHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(workoutService.getWorkoutHistory(userId));
    }

    @GetMapping("/{userId}/log/{workoutId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WorkoutLogResponseDTO> getWorkout(
            @PathVariable Long userId, @PathVariable Long workoutId) {
        return ResponseEntity.ok(workoutService.getWorkout(userId, workoutId));
    }

    @DeleteMapping("/{userId}/log/{workoutId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> deleteWorkout(
            @PathVariable Long userId, @PathVariable Long workoutId) {
        workoutService.deleteWorkout(userId, workoutId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/volume")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<WorkoutVolumeDTO>> getVolume(
            @PathVariable Long userId,
            @RequestParam(required = false) String dayName) {
        return ResponseEntity.ok(workoutService.getVolumeProgress(userId, dayName));
    }

    // ── Rest day ─────────────────────────────────────────────────────────────

    @PutMapping("/{userId}/rest-day")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> setRestDay(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Map<String, Boolean> body) {
        boolean rest = Boolean.TRUE.equals(body.get("rest"));
        workoutService.setRestDay(userId, date, rest);
        return ResponseEntity.noContent().build();
    }
}
