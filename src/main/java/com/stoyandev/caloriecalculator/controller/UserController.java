package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.*;
import com.stoyandev.caloriecalculator.entity.enums.Activity;
import com.stoyandev.caloriecalculator.entity.enums.Status;
import com.stoyandev.caloriecalculator.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@AllArgsConstructor
public class UserController {

    private UserService userService;

    @GetMapping("/user/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        var user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/update/age/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<UserDTO> updateAge(@PathVariable Long id, @RequestBody UpdateUserAgeRequestDTO userAgeRequestDTO) {
        var updatedUser = userService.updateAge(id, userAgeRequestDTO.newAge());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/weight/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<UserDTO> updateWeight(@PathVariable Long id, @RequestBody UpdateUserWeightRequestDTO userWeightRequestDTO) {
        var updatedUser = userService.updateWeight(id, userWeightRequestDTO.newWeight());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/height/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<UserDTO> updateHeight(@PathVariable Long id, @RequestBody UpdateUserHeightRequestDTO userHeightRequestDTO) {
        var updatedUser = userService.updateHeight(id, userHeightRequestDTO.newHeight());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/status/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<UserDTO> updateStatus(@PathVariable Long id, @RequestBody int statusCode) {
        Status status = Status.fromCode(statusCode);
        var updatedUser = userService.updateStatus(id, status);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/activity/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<UserDTO> updateActivity(@PathVariable Long id, @RequestBody int activityCode) {
        Activity activity = Activity.fromCode(activityCode);
        var updatedUser = userService.updateActivity(id, activity);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/delete/user/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#id)")
    public ResponseEntity<Void> deleteByUserID(@PathVariable Long id) {
        userService.deleteByUserID(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/weightRecords")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<WeightRecordDTO>> getWeightRecords(@PathVariable Long userId) {
        List<WeightRecordDTO> weightRecords = userService.getWeightRecords(userId);
        return ResponseEntity.ok(weightRecords);
    }

    @PostMapping("/add/{userId}/measurements")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<MeasurementsRecordDTO> addMeasurementRecord(
            @PathVariable Long userId,
            @RequestBody UpdateUserMeasurementsRequestDTO measurements) {

        var measurementsRecord = userService.addMeasurement(userId, measurements);

        return ResponseEntity.ok(measurementsRecord);
    }

    @GetMapping("/user/measurements/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<MeasurementsRecordDTO>> getAllMeasurements(@PathVariable Long userId) {
        List<MeasurementsRecordDTO> records = userService.getMeasurementsByUser(userId);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/user/latestMeasurement/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<MeasurementsRecordDTO> getLatestMeasurement(@PathVariable Long userId) {
        var measurementsRecord = userService.getLatestMeasurement(userId);
        return ResponseEntity.ok(measurementsRecord);
    }
}
