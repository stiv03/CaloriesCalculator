package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.Product;
import com.stoyandev.caloriecalculator.entity.enums.MealType;

import java.time.LocalDateTime;

public record MealResponseDTO(Long mealId, Product product, double quantity, LocalDateTime consumedAt, MealType mealType) {

}
