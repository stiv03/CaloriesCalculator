package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.Product;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserMealsDTO {
    private Product product;
    private double quantity;
    private LocalDateTime consumedAt;
}

//todo: make Requests named requests and response named responses