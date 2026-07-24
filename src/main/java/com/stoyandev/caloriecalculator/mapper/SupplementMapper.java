package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.SupplementDTO;
import com.stoyandev.caloriecalculator.dto.SupplementIntakeDTO;
import com.stoyandev.caloriecalculator.entity.Supplement;
import com.stoyandev.caloriecalculator.entity.SupplementIntake;

public final class SupplementMapper {

    private SupplementMapper() {
    }

    public static SupplementDTO toDto(Supplement s) {
        // Guard against pre-backfill rows that may still have a null category.
        String category = s.getCategory() == null ? "DAILY" : s.getCategory().name();
        return new SupplementDTO(s.getId(), s.getName(), s.getDosage(), category);
    }

    public static SupplementIntakeDTO toDto(SupplementIntake i) {
        return new SupplementIntakeDTO(i.getSupplement().getId(), i.getDate(), i.isTaken());
    }
}
