package com.stoyandev.caloriecalculator.security.auth;

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
    private double weight;
    private int height;
    private String username;
    private String password;

}
