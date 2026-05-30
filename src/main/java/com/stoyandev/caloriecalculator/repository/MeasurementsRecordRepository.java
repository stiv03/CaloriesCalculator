package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.dto.MeasurementsRecordDTO;
import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;


public interface MeasurementsRecordRepository extends JpaRepository<MeasurementsRecord, Long> {
    List<MeasurementsRecord> findByUserId(Long userId);

    MeasurementsRecordDTO findTopByUserIdOrderByDateDescIdDesc(Long userId);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
