package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.WorkoutActivityRecord;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDate;
import java.util.Optional;

public interface WorkoutActivityRecordRepository extends JpaRepository<WorkoutActivityRecord, Long> {

    Optional<WorkoutActivityRecord> findByUserIdAndDate(Long userId, LocalDate date);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}
