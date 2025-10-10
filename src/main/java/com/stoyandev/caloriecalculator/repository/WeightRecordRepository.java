package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import com.stoyandev.caloriecalculator.entity.WeightRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeightRecordRepository extends JpaRepository<WeightRecord, Long> {

    List<WeightRecord> findByUserId(Long userId);
}

