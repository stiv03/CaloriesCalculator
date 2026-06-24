package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.ProgressPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgressPhotoRepository extends JpaRepository<ProgressPhoto, Long> {
    List<ProgressPhoto> findByUserIdOrderByDateDescIdDesc(Long userId);
    Optional<ProgressPhoto> findByIdAndUserId(Long id, Long userId);
}
