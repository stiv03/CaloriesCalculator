package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.dto.MeasurementsRecordDTO;

import com.stoyandev.caloriecalculator.entity.Goal;
import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


public interface MeasurementsRecordRepository extends JpaRepository<MeasurementsRecord, Long> {
    List<MeasurementsRecord> findByUserId(Long userId);

    MeasurementsRecordDTO findTopByUserIdOrderByDateDescIdDesc(Long userId);

}
