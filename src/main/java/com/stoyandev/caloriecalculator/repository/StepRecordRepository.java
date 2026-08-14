package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.StepRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StepRecordRepository extends JpaRepository<StepRecord, Long> {

    Optional<StepRecord> findByUserIdAndDate(Long userId, LocalDate date);

    List<StepRecord> findByUserIdOrderByDateAsc(Long userId);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
