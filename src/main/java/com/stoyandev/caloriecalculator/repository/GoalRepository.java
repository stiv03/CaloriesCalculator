package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Goal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    Optional<Goal> findByUserId(Long userId);
}
