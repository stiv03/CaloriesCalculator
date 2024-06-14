package com.example.demo2.Mapper;

import com.example.demo2.DTO.UserDTO;
import com.example.demo2.Entity.Users;

public class UserMapper {

    public static UserDTO mapToUserDTO(Users user){
        return new UserDTO(
                user.getId(),
                user.getName(),
                user.getAge(),
                user.getWeight(),
                user.getHeight()
        );
    }
    public static Users mapToUser(UserDTO userDTO){
        return new Users(
                userDTO.getId(),
                userDTO.getName(),
                userDTO.getAge(),
                userDTO.getWeight(),
                userDTO.getHeight()
        );
    }
}
