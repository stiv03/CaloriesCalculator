package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.entity.Goal;

public class GoalMapper {

    public static Goal mapToGoal (GoalDTO goalDTO){
        var goal = new Goal();
        goal.setCalories(goalDTO.calories());
        goal.setProtein(goalDTO.protein());
        goal.setCarbs(goalDTO.carbs());
        goal.setFat(goalDTO.fat());

        return goal;
    }

    public static GoalDTO mapToDTo (Goal goal){
        return new GoalDTO(
                goal.getCalories(),
                goal.getProtein(),
                goal.getCarbs(),
                goal.getFat()
        );
    }
}
