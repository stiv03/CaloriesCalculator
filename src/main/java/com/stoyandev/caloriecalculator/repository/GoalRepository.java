package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    Optional<Goal> findByUserId(Long userId);
}
