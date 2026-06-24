package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Supplement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplementRepository extends JpaRepository<Supplement, Long> {
    List<Supplement> findByUserIdOrderBySortOrderAscIdAsc(Long userId);
    List<Supplement> findByUserId(Long userId);
}
