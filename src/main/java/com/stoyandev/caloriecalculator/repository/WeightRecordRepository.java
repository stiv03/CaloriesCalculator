package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WeightRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeightRecordRepository extends JpaRepository<WeightRecord, Long> {

    List<WeightRecord> findByUserId(Long userId);

    WeightRecord findTopByUserIdOrderByDateDesc(Long userId);

    Optional<WeightRecord> findByUserIdAndDate(Long userId, LocalDate date);

    /**
     * Distinct calendar days on which the user has a weight record,
     * sorted descending. Used for streak calculations.
     */
    @Query("SELECT DISTINCT w.date FROM WeightRecord w " +
            "WHERE w.user.id = :userId ORDER BY w.date DESC")
    List<LocalDate> findDistinctWeightDatesDesc(@Param("userId") Long userId);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
