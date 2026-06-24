package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, Long> {
    List<Workout> findByUserIdOrderByDateDescIdDesc(Long userId);
    List<Workout> findByUserIdAndDateBetweenOrderByDateDescIdDesc(Long userId, LocalDate from, LocalDate to);

    boolean existsByUserIdAndDateAndTemplateId(Long userId, LocalDate date, Long templateId);

    Optional<Workout> findByUserIdAndDate(Long userId, LocalDate date);

    @Query("SELECT w FROM Workout w WHERE w.user.id = :userId AND w.date >= :from ORDER BY w.date DESC, w.id DESC")
    List<Workout> findByUserIdSince(@Param("userId") Long userId, @Param("from") LocalDate from);
}
