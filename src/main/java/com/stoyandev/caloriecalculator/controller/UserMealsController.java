package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.DailyMacrosDTO;
import com.stoyandev.caloriecalculator.dto.MealRequest;
import com.stoyandev.caloriecalculator.dto.UpdateMealQuantityDTO;
import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.service.UserMealsService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Void> addMeal(@PathVariable Long userId, @RequestBody MealRequest mealRequest) {
        userMealsService.addMealForUser(userId, mealRequest.productId(), mealRequest.grams());
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/date/{userId}")
    public ResponseEntity<List<UserMealsDTO>> displayProductsForUserForDay(@PathVariable Long userId, @RequestParam String date) {
        var products = userMealsService.findAllUserMealsRelForSpecificDay(userId, LocalDate.parse(date, FORMATTER));
        return new ResponseEntity<>(products, HttpStatus.OK);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/calories")
    public double calculateTotalCaloriesForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalCaloriesForDay(userId, LocalDate.parse(date, FORMATTER));
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/protein")
    public double calculateTotalProteinForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalProteinForDay(userId, LocalDate.parse(date, FORMATTER));
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/carbs")
    public double calculateTotalCarbsForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalCarbsForDay(userId, LocalDate.parse(date, FORMATTER));
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/fats")
    public double calculateTotalFatsForDay(@PathVariable Long userId, @RequestParam String date) {
        return userMealsService.calculateTotalFatsForDay(userId, LocalDate.parse(date, FORMATTER));
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/meals/{userId}/totalMacros")
    public ResponseEntity<DailyMacrosDTO> fetchMacrosForDate(@PathVariable Long userId, @RequestParam String date) {
        final var dailyMacros = userMealsService.calculateDailyMacros(userId, LocalDate.parse(date, FORMATTER));
        return ResponseEntity.ok(dailyMacros);
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PutMapping("/meals/upgrade/quantity/{id}")
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
}
