package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WaterRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDate;
import java.util.Optional;

public interface WaterRecordRepository extends JpaRepository<WaterRecord, Long> {

    Optional<WaterRecord> findByUserIdAndDate(Long userId, LocalDate date);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
