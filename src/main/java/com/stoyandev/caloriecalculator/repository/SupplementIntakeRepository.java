package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.SupplementIntake;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SupplementIntakeRepository extends JpaRepository<SupplementIntake, Long> {

    /** All intakes for a user across the given date range (inclusive on both ends). */
    List<SupplementIntake> findBySupplementUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);

    /** Single row for a given supplement on a given date — used for upsert. */
    Optional<SupplementIntake> findBySupplementIdAndDate(Long supplementId, LocalDate date);

    /**
     * Distinct calendar days on which the user marked at least one supplement
     * as taken, sorted descending. Used for streak calculations.
     */
    @Query("SELECT DISTINCT i.date FROM SupplementIntake i " +
            "WHERE i.supplement.user.id = :userId AND i.taken = true " +
            "ORDER BY i.date DESC")
    List<LocalDate> findDistinctTakenDatesDesc(@Param("userId") Long userId);

    /** Wipe all intakes for a supplement (used when deleting the supplement). */
    @Modifying
    @Transactional
    void deleteBySupplementId(Long supplementId);
}
