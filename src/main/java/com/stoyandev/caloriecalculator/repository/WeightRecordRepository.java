package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WeightRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeightRecordRepository extends JpaRepository<WeightRecord, Long> {

    List<WeightRecord> findByUserId(Long userId);

    WeightRecord findTopByUserIdOrderByDateDesc(Long userId);

    Optional<WeightRecord> findByUserIdAndDate(Long userId, LocalDate date);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
