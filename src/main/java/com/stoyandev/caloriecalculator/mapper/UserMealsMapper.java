package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.UserMeals;

public class UserMealsMapper {

    private UserMealsMapper() {
    }

    public static UserMealsDTO mapToUserProductDTO(UserMeals userMeals) {
        return new UserMealsDTO(
                userMeals.getId(),
                userMeals.getProduct(),
                userMeals.getQuantity(),
                userMeals.getConsumedAt()
        );
    }

}

