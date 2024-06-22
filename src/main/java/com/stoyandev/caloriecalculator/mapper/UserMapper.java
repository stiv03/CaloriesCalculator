package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.entity.Users;

public class UserMapper {
    private UserMapper() {
    }

    public static UserDTO mapToUserDTO(Users user) {
        return new UserDTO(
                user.getName(),
                user.getAge(),
                user.getWeight(),
                user.getHeight(),
                user.getUsername(),
                user.getPassword(),
                user.getUserType()
        );
    }

    public static Users mapToUser(UserDTO userDTO) {
        var user = new Users();
        user.setName(userDTO.getName());
        user.setAge(user.getAge());
        user.setHeight(userDTO.getHeight());
        user.setWeight(userDTO.getWeight());
        user.setUsername(userDTO.getUsername());
        user.setPassword(userDTO.getPassword());
        user.setUserType(userDTO.getUserType());
        return user;
    }
}
