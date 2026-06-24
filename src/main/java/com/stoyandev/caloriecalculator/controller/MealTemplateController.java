package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.MealTemplateRequestDTO;
import com.stoyandev.caloriecalculator.dto.MealTemplateResponseDTO;
import com.stoyandev.caloriecalculator.service.MealTemplateService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/templates")
@AllArgsConstructor
public class MealTemplateController {

    private final MealTemplateService templateService;

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<MealTemplateResponseDTO>> getTemplates(@PathVariable Long userId) {
        return ResponseEntity.ok(templateService.getTemplatesForUser(userId));
    }

    @PostMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<MealTemplateResponseDTO> createTemplate(
            @PathVariable Long userId,
            @RequestBody MealTemplateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.createTemplate(userId, request));
    }

    @DeleteMapping("/{userId}/{templateId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable Long userId,
            @PathVariable Long templateId) {
        templateService.deleteTemplate(userId, templateId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{userId}/{templateId}/items")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<MealTemplateResponseDTO> addItem(
            @PathVariable Long userId,
            @PathVariable Long templateId,
            @RequestBody MealTemplateRequestDTO.MealTemplateItemDTO item) {
        return ResponseEntity.ok(templateService.addItemToTemplate(userId, templateId, item));
    }

    @PutMapping("/{userId}/{templateId}/items/{itemId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<MealTemplateResponseDTO> updateItem(
            @PathVariable Long userId,
            @PathVariable Long templateId,
            @PathVariable Long itemId,
            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(templateService.updateItemGrams(userId, templateId, itemId, body.get("grams")));
    }

    @DeleteMapping("/{userId}/{templateId}/items/{itemId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<MealTemplateResponseDTO> removeItem(
            @PathVariable Long userId,
            @PathVariable Long templateId,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(templateService.removeItemFromTemplate(userId, templateId, itemId));
    }
}
