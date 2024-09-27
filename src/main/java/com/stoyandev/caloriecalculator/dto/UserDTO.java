package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.enums.UserType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public record UserDTO (String name,
                       int age,
                       double weight,
                       int height,
                       String username,
                       String password,
                       UserType userType){

}
