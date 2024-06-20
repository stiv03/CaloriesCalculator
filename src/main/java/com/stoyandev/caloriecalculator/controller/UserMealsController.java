package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.GetAllMealsForDate;
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
@RequestMapping
@AllArgsConstructor
public class UserMealsController {
    private UserMealsService userMealsService;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("d-MM-yyyy");

    @PostMapping("/meals/{userId}")
    public ResponseEntity<Void> addMeal(@PathVariable Long userId, @RequestBody MealRequest mealRequest) {
        userMealsService.addMealForUser(userId, mealRequest.productId(), mealRequest.grams());
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @GetMapping("/meals/date/{userId}")
    public ResponseEntity<List<UserMealsDTO>> displayProductsForUserForDay(@PathVariable Long userId, @RequestBody GetAllMealsForDate date) {
        var products = userMealsService.findAllUserMealsRelForSpecificDay(userId, LocalDate.parse(date.dateAsString(), FORMATTER));
        return new ResponseEntity<>(products, HttpStatus.OK);
    }

    @GetMapping("/meals/{userId}/calories")
    public double calculateTotalCaloriesForDay(@PathVariable Long userId, @RequestBody GetAllMealsForDate date) {
        return userMealsService.calculateTotalCaloriesForDay(userId, LocalDate.parse(date.dateAsString(), FORMATTER));
    }

    @GetMapping("/meals/{userId}/protein")
    public double calculateTotalProteinForDay(@PathVariable Long userId, @RequestBody GetAllMealsForDate date) {
        return userMealsService.calculateTotalProteinForDay(userId, LocalDate.parse(date.dateAsString(), FORMATTER));
    }

    @GetMapping("/meals/{userId}/carbs")
    public double calculateTotalCarbsForDay(@PathVariable Long userId, @RequestBody GetAllMealsForDate date) {
        return userMealsService.calculateTotalCarbsForDay(userId, LocalDate.parse(date.dateAsString(), FORMATTER));
    }

    @GetMapping("/meals/{userId}/fats")
    public double calculateTotalFatsForDay(@PathVariable Long userId, @RequestBody GetAllMealsForDate date) {
        return userMealsService.calculateTotalFatsForDay(userId, LocalDate.parse(date.dateAsString(), FORMATTER));
    }

    @GetMapping("/meals/upgrade/quantity/{id}")
    public ResponseEntity<UserMealsDTO> updateMealQuantity(@PathVariable Long id, @RequestBody UpdateMealQuantityDTO newQuantity) {
        var updatedUserMeal = userMealsService.updateMealQuantity(id, newQuantity.newQuantity());
        return ResponseEntity.ok(updatedUserMeal);
    }

    @PutMapping("/delete/meal/{id}")
    public ResponseEntity<Void> deleteByUserMealID(@PathVariable Long id) {
        userMealsService.deleteByUserMealID(id);
        return ResponseEntity.ok().build();
    }
}
