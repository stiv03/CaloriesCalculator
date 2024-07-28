package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;

import java.util.List;

public interface UserService {
    UserDTO createUser(UserDTO userDTO);

    UserDTO updateAge(long id, int newAge);

    UserDTO updateWeight(long id, double newWeight);

    UserDTO updateHeight(long id, int newHeight);

    void deleteByUserID(long id);
    public UserDTO getUserById(Long id);

    public List<WeightRecordDTO> getWeightRecords(Long userId);
}
