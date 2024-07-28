package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WeightRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeightRecordRepository extends JpaRepository<WeightRecord, Long> {
}

