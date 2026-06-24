package com.stoyandev.caloriecalculator.dto;

import java.util.List;

public record MealTemplateRequestDTO(
        String name,
        List<MealTemplateItemDTO> items
) {
    public record MealTemplateItemDTO(
            Long productId,
            String productName,
            Integer grams,
            Double caloriesPer100Grams
    ) {}
}
