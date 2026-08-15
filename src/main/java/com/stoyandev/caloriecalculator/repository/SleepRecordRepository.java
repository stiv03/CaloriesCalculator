package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.SleepRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SleepRecordRepository extends JpaRepository<SleepRecord, Long> {

    Optional<SleepRecord> findByUserIdAndDate(Long userId, LocalDate date);

    List<SleepRecord> findByUserIdOrderByDateAsc(Long userId);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
