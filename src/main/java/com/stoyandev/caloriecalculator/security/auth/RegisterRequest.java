package com.stoyandev.caloriecalculator.security.auth;

import com.stoyandev.caloriecalculator.entity.enums.GenderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    private String name;
    private int age;
    private GenderType gender;
    private double weight;
    private int height;
    private String username;
    private String password;
}
