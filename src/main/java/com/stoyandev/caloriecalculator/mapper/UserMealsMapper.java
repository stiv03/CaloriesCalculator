package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.MealResponseDTO;
import com.stoyandev.caloriecalculator.entity.UserMeals;

public final class UserMealsMapper {

    private UserMealsMapper() {
    }

    public static MealResponseDTO mapToUserProductDTO(UserMeals userMeals) {
        return new MealResponseDTO(
                userMeals.getId(),
                userMeals.getProduct(),
                userMeals.getQuantity(),
                userMeals.getConsumedAt()
        );
    }

}

