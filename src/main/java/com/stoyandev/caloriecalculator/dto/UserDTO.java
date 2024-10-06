package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.enums.UserType;

public record UserDTO(String name,
                      int age,
                      double weight,
                      int height,
                      String username,
                      String password,
                      UserType userType) {

}
