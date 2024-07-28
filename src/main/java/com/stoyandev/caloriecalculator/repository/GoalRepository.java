package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    Goal findByUserId(Long userId);
}
