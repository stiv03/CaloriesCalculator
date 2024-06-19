package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.dto.UserMealsDTO;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface UsersProductService {


    List<UserMealsDTO> findAllUserMealsRelForSpecificDay(Long id, LocalDate date);
    double calculateTotalCaloriesForDay (Long id, LocalDate date);
    double calculateTotalProteinForDay (Long id, LocalDate date);
    double calculateTotalCarbsForDay (Long id, LocalDate date);
    double calculateTotalFatsForDay (Long id, LocalDate date);

    void addMealForUser(Long userId, Long productId, Integer grams);
}
