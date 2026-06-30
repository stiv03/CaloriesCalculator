package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.ProgressMarker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgressMarkerRepository extends JpaRepository<ProgressMarker, Long> {
    List<ProgressMarker> findByUserIdOrderByDateAsc(Long userId);
    Optional<ProgressMarker> findByIdAndUserId(Long id, Long userId);
}
