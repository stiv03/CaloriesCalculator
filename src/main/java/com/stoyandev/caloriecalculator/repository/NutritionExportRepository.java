package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.NutritionExport;
import com.stoyandev.caloriecalculator.entity.enums.MealType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NutritionExportRepository extends JpaRepository<NutritionExport, Long> {
    Optional<NutritionExport> findByUserIdAndDateAndMealType(Long userId, LocalDate date, MealType mealType);

    /** All exported slots for a day — used to detect slots that no longer have meals. */
    List<NutritionExport> findAllByUserIdAndDate(Long userId, LocalDate date);

    void deleteByUserId(Long userId);
}
