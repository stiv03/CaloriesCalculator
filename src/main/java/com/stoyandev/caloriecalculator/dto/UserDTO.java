package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.enums.Activity;
import com.stoyandev.caloriecalculator.entity.enums.Status;
import com.stoyandev.caloriecalculator.entity.enums.UserType;

public record UserDTO(String name,
                      int age,
                      double weight,
                      int height,
                      Double goalWeight,
                      Double startWeight,
                      Integer waterGoalMl,
                      Integer checkInDay,
                      String username,
                      String password,
                      Status status,
                      Activity activity,
                      UserType userType) {

}
