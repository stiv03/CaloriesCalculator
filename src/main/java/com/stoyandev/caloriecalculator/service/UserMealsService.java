package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.DailyMacrosDTO;
import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.dto.MealResponseDTO;
import com.stoyandev.caloriecalculator.entity.enums.MealType;

import java.time.LocalDate;
import java.util.List;

public interface UserMealsService {
    List<MealResponseDTO> findAllUserMealsRelForSpecificDay(Long userId, LocalDate date);

    DailyMacrosDTO calculateDailyMacros(Long id, LocalDate date);

    void addMealForUser(Long userId, Long productId, Integer grams, MealType mealType);

    MealResponseDTO updateMealQuantity(long id, double newQuantity);

    void deleteByUserMealID(long id);

    List<DailyMacrosDTO> fetchAllMacros(Long userId);

}


