package com.stoyandev.caloriecalculator.dto;

import java.util.List;

public record MealTemplateResponseDTO(
        Long id,
        String name,
        List<MealTemplateItemDTO> items
) {
    public record MealTemplateItemDTO(
            Long id,
            Long productId,
            String productName,
            Integer grams,
            Double caloriesPer100Grams
    ) {}
}
