package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.MealTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealTemplateRepository extends JpaRepository<MealTemplate, Long> {
    List<MealTemplate> findAllByUserId(Long userId);
}
