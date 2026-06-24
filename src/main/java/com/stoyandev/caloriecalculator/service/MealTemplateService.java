package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.MealTemplateRequestDTO;
import com.stoyandev.caloriecalculator.dto.MealTemplateResponseDTO;

import java.util.List;

public interface MealTemplateService {
    List<MealTemplateResponseDTO> getTemplatesForUser(Long userId);
    MealTemplateResponseDTO createTemplate(Long userId, MealTemplateRequestDTO request);
    void deleteTemplate(Long userId, Long templateId);
    MealTemplateResponseDTO addItemToTemplate(Long userId, Long templateId, MealTemplateRequestDTO.MealTemplateItemDTO item);
    MealTemplateResponseDTO updateItemGrams(Long userId, Long templateId, Long itemId, Integer grams);
    MealTemplateResponseDTO removeItemFromTemplate(Long userId, Long templateId, Long itemId);
}
