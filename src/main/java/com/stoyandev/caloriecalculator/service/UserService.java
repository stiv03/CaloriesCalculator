package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.UserDTO;

public interface UserService {
    UserDTO createUser(UserDTO userDTO);
    UserDTO updateAge(long id, int newAge);
    UserDTO updateWeight(long id, double newWeight);
    UserDTO updateHeight(long id, int newHeight);

    void deleteByUserID(long id);
}
