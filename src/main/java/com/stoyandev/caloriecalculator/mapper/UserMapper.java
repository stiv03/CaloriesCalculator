package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.entity.Users;

public class UserMapper {
    private UserMapper(){}

    public static UserDTO mapToUserDTO(Users user) {
        return new UserDTO(
                user.getName(),
                user.getAge(),
                user.getWeight(),
                user.getHeight()
        );
    }

    public static Users mapToUser(UserDTO userDTO) {
        var user = new Users();
        user.setName(userDTO.getName());
        user.setAge(user.getAge());
        user.setHeight(userDTO.getHeight());
        user.setWeight(userDTO.getWeight());

        return user;
    }
}
