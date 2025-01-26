package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.entity.Goal;
import com.stoyandev.caloriecalculator.entity.enums.Activity;
import com.stoyandev.caloriecalculator.entity.enums.Status;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.GoalMapper;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.repository.GoalRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class GoalServiceImp {
    private final UserRepository userRepository;
    private final GoalRepository goalRepository;

    public GoalDTO setUserGoal(final Long userId, GoalDTO goal) {
        final var updatedGoal = goalRepository.findByUserId(userId);
        if (updatedGoal.isPresent()) {
            updatedGoal.get().setFat(goal.fat());
            updatedGoal.get().setProtein(goal.protein());
            updatedGoal.get().setCarbs(goal.carbs());
            updatedGoal.get().setCalories(goal.calories());
            var savedGoal = goalRepository.save(updatedGoal.get());
            return GoalMapper.mapToDTo(savedGoal);
        }

        final var newGoal = new Goal();
        final var user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        newGoal.setUser(user);
        newGoal.setFat(goal.fat());
        newGoal.setCarbs(goal.carbs());
        newGoal.setProtein(goal.protein());
        newGoal.setCalories(goal.calories());
        var savedGoal2 = goalRepository.save(newGoal);

        return GoalMapper.mapToDTo(savedGoal2);
    }

    public GoalDTO getUserGoal(final Long userId) {
        final var goal = goalRepository.findByUserId(userId).orElseThrow(() -> new ResourceNotFoundException("Goal not found"));
        return UserMapper.mapGoalToDTO(goal);
    }



    private double calculateBMR(final Long userId){
        final var user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return  10 * user.getWeight() + 6.25 * user.getHeight() - 5 * user.getAge() + 5;
    }

    private double activityBMR (final Long userId, Activity activity){

        double BMR = calculateBMR(userId);

        return switch (activity) {
            case MINIMAL -> BMR * 1.2;
            case LOW -> BMR * 1.375;
            case NORMAL -> BMR * 1.55;
            case HIGH -> BMR * 1.725;
            case VERY_HIGH -> BMR * 1.9;
        };
    }

    private double statusCalorie (Status status){

        return switch (status) {
            case MAINTAINING ->  0;
            case SLOW_BULK -> 275;
            case NORMAL_BULK -> 450;
            case FAST_BULK -> 700;
            case NORMAL_CUT -> -450;
            case SLOW_CUT -> -275;
            case FAST_CUT -> -700;
        };
    }

    public GoalDTO autoSetGoal(final Long userId){
        final var user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        double calories = activityBMR(userId, user.getActivity()) + statusCalorie(user.getStatus());
        double protein = 2.2 * user.getWeight();
        double fat =  (0.20 * calories) / 9;
        fat = Math.round(fat * 100.0) / 100.0;
        double carbs = (calories - ((protein * 4) + (fat * 9 )))/ 4;
        carbs = Math.round(carbs * 100.0) / 100.0;

        GoalDTO goalDTO = new GoalDTO((int)calories,protein,carbs,fat);

        return setUserGoal(userId,goalDTO);
    }

}

