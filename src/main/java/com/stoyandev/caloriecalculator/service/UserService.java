package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.MeasurementsRecordDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;
import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import com.stoyandev.caloriecalculator.entity.Users;

import java.util.List;

public interface UserService {
    UserDTO createUser(UserDTO userDTO);

    UserDTO updateAge(long id, int newAge);

    UserDTO updateWeight(long id, double newWeight);

    UserDTO updateHeight(long id, int newHeight);

    void deleteByUserID(long id);
    public UserDTO getUserById(Long id);

    public List<WeightRecordDTO> getWeightRecords(Long userId);



    MeasurementsRecord addMeasurement(Long userId, double shoulder, double chest, double biceps, double waist, double hips, double thigh, double calf);

    List<MeasurementsRecordDTO> getMeasurementsByUser(Long userId);

    MeasurementsRecordDTO getLatestMeasurement(Long userId);
}
