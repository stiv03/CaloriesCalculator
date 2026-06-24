package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.*;
import com.stoyandev.caloriecalculator.entity.enums.MealType;
import com.stoyandev.caloriecalculator.service.UserMealsService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@AllArgsConstructor
public class UserMealsController {
    private UserMealsService userMealsService;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PostMapping("/meals/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> addMeal(@PathVariable Long userId, @RequestBody MealRequestDTO mealRequest) {
        MealType mealType = null;
        if (mealRequest.mealType() != null && !mealRequest.mealType().isBlank()) {
            try {
                mealType = MealType.valueOf(mealRequest.mealType().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        userMealsService.addMealForUser(userId, mealRequest.productId(), mealRequest.grams(), mealType);
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @GetMapping("/meals/date/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<MealResponseDTO>> displayProductsForUserForDay(@PathVariable Long userId, @RequestParam String date) {
        var products = userMealsService.findAllUserMealsRelForSpecificDay(userId, LocalDate.parse(date, FORMATTER));
        return new ResponseEntity<>(products, HttpStatus.OK);
    }


    @GetMapping("/meals/{userId}/totalMacros")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<DailyMacrosDTO> fetchMacrosForDate(@PathVariable Long userId, @RequestParam String date) {
        final var dailyMacros = userMealsService.calculateDailyMacros(userId, LocalDate.parse(date, FORMATTER));
        return ResponseEntity.ok(dailyMacros);
    }

    @PutMapping("/meals/upgrade/quantity/{userId}/meal/{mealId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId) and @userAccessService.hasAccessToMeal(#mealId)")
    public ResponseEntity<MealResponseDTO> updateMealQuantity(@PathVariable Long mealId, @PathVariable Long userId, @RequestBody UpdateMealQuantityDTO newQuantity) {
        var updatedUserMeal = userMealsService.updateMealQuantity(mealId, newQuantity.newQuantity());
        return ResponseEntity.ok(updatedUserMeal);
    }

    @DeleteMapping("/meals/delete/meal/{mealId}")
    @PreAuthorize("@userAccessService.hasAccessToMeal(#mealId)")
    public ResponseEntity<Void> deleteByUserMealID(@PathVariable Long mealId) {
        userMealsService.deleteByUserMealID(mealId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/meals/{userId}/allMacros")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<DailyMacrosDTO>> fetchAllMacros(@PathVariable Long userId) {
        List<DailyMacrosDTO> allMacros = userMealsService.fetchAllMacros(userId);
        return ResponseEntity.ok(allMacros);
    }


}
