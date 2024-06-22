package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.enums.UserType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {

    private String name;
    private int age;
    private double weight;
    private int height;
    private String username;
    private String password;
    private UserType userType;
}
