package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.GetAllMealsForDate;
import com.stoyandev.caloriecalculator.dto.MealRequest;
import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.service.UsersProductService;
import lombok.AllArgsConstructor;
import org.apache.coyote.Response;
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
    private UsersProductService usersProductService;

    @PostMapping("/meals/{userId}")
    public ResponseEntity<Void> addMeal(@PathVariable Long userId, @RequestBody MealRequest mealRequest) {
        usersProductService.addMealForUser(userId, mealRequest.productId(), mealRequest.grams());
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @GetMapping("/meals/date/{id}/")
    public ResponseEntity<List<UserMealsDTO>> displayProductsForUserForDay(@PathVariable Long id, @RequestBody GetAllMealsForDate date){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d-MM-yyyy");
        var products = usersProductService.findAllUserMealsRelForSpecificDay(id, LocalDate.parse(date.value(), formatter));
        return new ResponseEntity<>(products, HttpStatus.OK);
    }

    @GetMapping("/meals/{id}/calories")
    public double calculateTotalCaloriesForDay(@PathVariable Long id, @RequestBody GetAllMealsForDate date){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d-MM-yyyy");
        return usersProductService.calculateTotalCaloriesForDay(id,LocalDate.parse(date.value(), formatter));
    }

    @GetMapping("/meals/{id}/protein")
    public double calculateTotalProteinForDay(@PathVariable Long id, @RequestBody GetAllMealsForDate date){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d-MM-yyyy");
        return usersProductService.calculateTotalProteinForDay(id, LocalDate.parse(date.value(), formatter));
    }

    @GetMapping("/meals/{id}/carbs")
    public double calculateTotalCarbsForDay(@PathVariable Long id, @RequestBody GetAllMealsForDate date){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d-MM-yyyy");
        return usersProductService.calculateTotalCarbsForDay(id, LocalDate.parse(date.value(), formatter));
    }

    @GetMapping("/meals/{id}/fats")
    public double calculateTotalFatsForDay(@PathVariable Long id, @RequestBody GetAllMealsForDate date){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d-MM-yyyy");
        return usersProductService.calculateTotalFatsForDay(id, LocalDate.parse(date.value(), formatter));
    }
}
