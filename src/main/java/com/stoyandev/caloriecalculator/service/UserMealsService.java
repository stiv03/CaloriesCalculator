package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.DailyMacrosDTO;
import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.Goal;

import java.time.LocalDate;
import java.util.List;

public interface UserMealsService {
    List<UserMealsDTO> findAllUserMealsRelForSpecificDay(Long userId, LocalDate date);

    DailyMacrosDTO calculateDailyMacros(Long id, LocalDate date);

    void addMealForUser(Long userId, Long productId, Integer grams);

    UserMealsDTO updateMealQuantity(long id, double newQuantity);

    void deleteByUserMealID(long id);

    List<DailyMacrosDTO> fetchAllMacros(Long userId);

    GoalDTO setUserGoal(Long userId, GoalDTO goal);

    GoalDTO getUserGoal(Long userId);
}


