package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WeightRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface WeightRecordRepository extends JpaRepository<WeightRecord, Long> {

    List<WeightRecord> findByUserId(Long userId);

    WeightRecord findTopByUserIdOrderByDateDesc(Long userId);

    Optional<WeightRecord> findByUserIdAndDate(Long userId, LocalDate date);
}

