package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.GoogleHealthConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoogleHealthConnectionRepository extends JpaRepository<GoogleHealthConnection, Long> {
    Optional<GoogleHealthConnection> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
