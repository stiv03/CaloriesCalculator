package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.SupplementDTO;
import com.stoyandev.caloriecalculator.dto.SupplementIntakeDTO;

import java.time.LocalDate;
import java.util.List;

public interface SupplementService {

    List<SupplementDTO> listSupplements(Long userId);

    SupplementDTO createSupplement(Long userId, String name, String dosage);

    SupplementDTO updateSupplement(Long userId, Long supplementId, String name, String dosage);

    void deleteSupplement(Long userId, Long supplementId);

    /** Intakes for the user across [from, to] inclusive. */
    List<SupplementIntakeDTO> listIntakes(Long userId, LocalDate from, LocalDate to);

    /**
     * Upsert taken/not-taken for a supplement on a date.
     * The service rejects dates other than today (server-side enforcement).
     */
    SupplementIntakeDTO setIntake(Long userId, Long supplementId, LocalDate date, boolean taken);

    void reorder(Long userId, List<Long> orderedIds);
}
