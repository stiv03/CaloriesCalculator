package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.NutritionExport;
import com.stoyandev.caloriecalculator.entity.enums.MealType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface NutritionExportRepository extends JpaRepository<NutritionExport, Long> {
    Optional<NutritionExport> findByUserIdAndDateAndMealType(Long userId, LocalDate date, MealType mealType);

    void deleteByUserId(Long userId);
}
