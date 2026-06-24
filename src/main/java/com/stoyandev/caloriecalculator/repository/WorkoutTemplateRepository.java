package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WorkoutTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkoutTemplateRepository extends JpaRepository<WorkoutTemplate, Long> {
    List<WorkoutTemplate> findByUserIdOrderBySortOrderAsc(Long userId);
    Optional<WorkoutTemplate> findByIdAndUserId(Long id, Long userId);
}
