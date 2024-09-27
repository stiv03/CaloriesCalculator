package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.entity.Goal;
import com.stoyandev.caloriecalculator.entity.Users;

public final class UserMapper {
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
        user.setName(userDTO.name());
        user.setAge(userDTO.age());
        user.setHeight(userDTO.height());
        user.setWeight(userDTO.weight());
        user.setUsername(userDTO.username());
        user.setPassword(userDTO.password());
        user.setUserType(userDTO.userType());
        return user;
    }

    public static GoalDTO mapGoalToDTO(final Goal goal) {
        return new GoalDTO(goal.getCalories(), goal.getProtein(), goal.getCarbs(), goal.getFat());
    }
}
