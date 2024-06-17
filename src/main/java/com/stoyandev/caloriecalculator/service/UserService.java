package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.UpdateUserAgeRequestDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserHeightRequestDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserWeightRequestDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;

public interface UserService {

    UserDTO createUser(UserDTO userDTO);

    UserDTO updateAge(long id, UpdateUserAgeRequestDTO updateUserAgeRequestDTO);

    UserDTO updateWeight(long id, UpdateUserWeightRequestDTO updateUserWeightRequestDTO);

    UserDTO updateHeight(long id, UpdateUserHeightRequestDTO updateUserHeightRequestDTO);
}
