package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.*;
import com.stoyandev.caloriecalculator.entity.Goal;
import com.stoyandev.caloriecalculator.service.UserMealsService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
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

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/meals/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> addMeal(@PathVariable Long userId, @RequestBody MealRequest mealRequest) {
        userMealsService.addMealForUser(userId, mealRequest.productId(), mealRequest.grams());
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/date/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<UserMealsDTO>> displayProductsForUserForDay(@PathVariable Long userId, @RequestParam String date) {
        var products = userMealsService.findAllUserMealsRelForSpecificDay(userId, LocalDate.parse(date, FORMATTER));
        return new ResponseEntity<>(products, HttpStatus.OK);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/calories")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public double calculateTotalCaloriesForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalCaloriesForDay(userId, LocalDate.parse(date, FORMATTER));
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/protein")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public double calculateTotalProteinForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalProteinForDay(userId, LocalDate.parse(date, FORMATTER));
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/carbs")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public double calculateTotalCarbsForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalCarbsForDay(userId, LocalDate.parse(date, FORMATTER));
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/fats")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    //todo: save userId in the jwt claims/subject instead.
    public double calculateTotalFatsForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalFatsForDay(userId, LocalDate.parse(date, FORMATTER));
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/totalMacros")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<DailyMacrosDTO> fetchMacrosForDate(@PathVariable Long userId, @RequestParam String date) {
        final var dailyMacros = userMealsService.calculateDailyMacros(userId, LocalDate.parse(date, FORMATTER));
        return ResponseEntity.ok(dailyMacros);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PutMapping("/meals/upgrade/quantity/{id}")
    // todo: parse the user ID in the method, for verification
    public ResponseEntity<UserMealsDTO> updateMealQuantity(@PathVariable Long id, @RequestBody UpdateMealQuantityDTO newQuantity) {
        var updatedUserMeal = userMealsService.updateMealQuantity(id, newQuantity.newQuantity());
        return ResponseEntity.ok(updatedUserMeal);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @DeleteMapping("/meals/delete/meal/{id}")
    public ResponseEntity<Void> deleteByUserMealID(@PathVariable Long id) {
        userMealsService.deleteByUserMealID(id);
        return ResponseEntity.ok().build();
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/allMacros")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<DailyMacrosDTO>> fetchAllMacros(@PathVariable Long userId) {
        List<DailyMacrosDTO> allMacros = userMealsService.fetchAllMacros(userId);
        return ResponseEntity.ok(allMacros);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/user/{userId}/setGoal")
    public ResponseEntity<Goal> setUserGoal(@PathVariable Long userId, @RequestBody Goal goal) {
        Goal savedGoal = userMealsService.setUserGoal(userId, goal);
        return ResponseEntity.ok(savedGoal);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/user/{userId}/getGoal")
    public ResponseEntity<GoalDTO> getUserGoal(@PathVariable Long userId) {
        GoalDTO goal = userMealsService.getUserGoal(userId);
        return ResponseEntity.ok(goal);
    }

}
