package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.UserMeals;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MealsRepository extends JpaRepository<UserMeals, Long> {

    List<UserMeals> findAllByUserId(Long userId);

    /**
     * Returns meals consumed in {@code [start, end)} for the given user
     * (inclusive of start, exclusive of end). Callers pass
     * {@code date.atStartOfDay()} and {@code date.plusDays(1).atStartOfDay()}
     * to scope to a single day cleanly across the midnight boundary.
     */
    @Query("SELECT m FROM UserMeals m WHERE m.user.id = :userId " +
            "AND m.consumedAt >= :start AND m.consumedAt < :end")
    List<UserMeals> findAllByUserIdAndConsumedAtRange(
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserMeals u WHERE u.id = :id")
    void deleteByUserMealsID(@Param("id") Long id);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
