package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.MealTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MealTemplateItemRepository extends JpaRepository<MealTemplateItem, Long> {}
