package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.*;
import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@AllArgsConstructor
public class UserController {

    private UserService userService;

    @PreAuthorize("hasAnyAuthority('ADMIN')")
    @PostMapping("/new/user")
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO userDTO) {
        var savedUSer = userService.createUser(userDTO);
        return new ResponseEntity<>(savedUSer, HttpStatus.CREATED);

    }
    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/user/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/update/age/{id}")
    public ResponseEntity<UserDTO> updateAge(@PathVariable Long id, @RequestBody UpdateUserAgeRequestDTO userAgeRequestDTO) {
        var updatedUser = userService.updateAge(id, userAgeRequestDTO.newAge());
        return ResponseEntity.ok(updatedUser);
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @PutMapping("/update/weight/{id}")
    public ResponseEntity<UserDTO> updateWeight(@PathVariable Long id, @RequestBody UpdateUserWeightRequestDTO userWeightRequestDTO) {
        var updatedUser = userService.updateWeight(id, userWeightRequestDTO.newWeight());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/height/{id}")
    public ResponseEntity<UserDTO> updateHeight(@PathVariable Long id, @RequestBody UpdateUserHeightRequestDTO userHeightRequestDTO) {
        var updatedUser = userService.updateHeight(id, userHeightRequestDTO.newHeight());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/delete/user/{id}")
    public ResponseEntity<Void> deleteByUserID(@PathVariable Long id) {
        userService.deleteByUserID(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/weightRecords")
    public ResponseEntity<List<WeightRecordDTO>> getWeightRecords(@PathVariable Long userId) {
        List<WeightRecordDTO> weightRecords = userService.getWeightRecords(userId);
        return ResponseEntity.ok(weightRecords);
    }

    @PostMapping("/add/{userId}/measurements")
    public ResponseEntity<MeasurementsRecord> addMeasurementRecord(
            @PathVariable Long userId,
            @RequestBody UpdateUserMeasurementsRequestDTO measurements) {


        MeasurementsRecord record = userService.addMeasurement(userId, measurements.shoulder(),
                                measurements.chest(), measurements.biceps(), measurements.waist(),
                                measurements.hips(), measurements.thigh(), measurements.calf());

        return ResponseEntity.ok(record);
    }

    @GetMapping("/user/measurements/{userId}")
    public ResponseEntity<List<MeasurementsRecordDTO>> getAllMeasurements(@PathVariable Long userId) {
        List<MeasurementsRecordDTO> records = userService.getMeasurementsByUser(userId);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/user/latestMeasurement/{userId}")
    public ResponseEntity<MeasurementsRecordDTO> getLatestMeasurement(@PathVariable Long userId) {
        MeasurementsRecordDTO record = userService.getLatestMeasurement(userId);
        return ResponseEntity.ok(record);
    }
}
