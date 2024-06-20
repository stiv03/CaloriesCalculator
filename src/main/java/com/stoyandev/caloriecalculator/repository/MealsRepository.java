package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.UserMeals;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealsRepository extends JpaRepository<UserMeals, Long> {

    List<UserMeals> findAllByUserId(Long userId);
}

