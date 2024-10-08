package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;
import com.stoyandev.caloriecalculator.entity.WeightRecord;

public final class WeightRecordMapper {

    private WeightRecordMapper() {
    }

    public static WeightRecordDTO toDTO(WeightRecord weightRecord) {
        return new WeightRecordDTO(weightRecord.getWeight(), weightRecord.getDate());
    }
}
