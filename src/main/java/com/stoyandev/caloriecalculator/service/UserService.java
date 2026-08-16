package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.MeasurementsRecordDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserMeasurementsRequestDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;
import com.stoyandev.caloriecalculator.entity.enums.Activity;
import com.stoyandev.caloriecalculator.entity.enums.Status;

import java.util.List;

public interface UserService {

    UserDTO updateAge(long id, int newAge);

    UserDTO updateWeight(long id, double newWeight, java.time.LocalTime measureTime);

    UserDTO updateHeight(long id, int newHeight);

    /** Set (or clear, when null) the user's target/goal weight. */
    UserDTO updateGoalWeight(long id, Double goalWeight);

    /** Set (or clear, when null) the user's starting weight. */
    UserDTO updateStartWeight(long id, Double startWeight);

    /** Set (or clear, when null) the user's daily water goal in ml. */
    UserDTO updateWaterGoal(long id, Integer waterGoalMl);

    /** Set (or clear, when null) the user's weekly check-in day (ISO 1=Mon … 7=Sun). */
    UserDTO updateCheckInDay(long id, Integer checkInDay);

    UserDTO updateStatus (final Long userId, Status status);
    UserDTO updateActivity (final Long userId, Activity activity);

    void deleteByUserID(long id);

    UserDTO getUserById(Long id);

    List<WeightRecordDTO> getWeightRecords(Long userId);

    MeasurementsRecordDTO addMeasurement(Long userId, UpdateUserMeasurementsRequestDTO dto);

    List<MeasurementsRecordDTO> getMeasurementsByUser(Long userId);

    MeasurementsRecordDTO getLatestMeasurement(Long userId);

    void updatePassword(Long userId, String newPassword);
}
