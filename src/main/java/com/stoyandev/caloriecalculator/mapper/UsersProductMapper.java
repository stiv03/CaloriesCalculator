package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.UsersProduct;

public class UsersProductMapper {

    private UsersProductMapper(){}

    public static UserMealsDTO mapToUserProductDTO(UsersProduct usersProduct) {
        return new UserMealsDTO(
                usersProduct.getUser(),
                usersProduct.getProduct(),
                usersProduct.getQuantity(),
                usersProduct.getConsumedAt()
        );
    }

}

