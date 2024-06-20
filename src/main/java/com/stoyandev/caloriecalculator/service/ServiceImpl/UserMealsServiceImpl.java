package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.UserMeals;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.UserMealsMapper;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.ProductRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.service.UserMealsService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class UserMealsServiceImpl implements UserMealsService {

    private final MealsRepository usersMealsRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Override
    public void addMealForUser(final Long userId, Long productId, Integer grams) {
        var newMeal = new UserMeals();

        var user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User Not found"));
        var product = productRepository.findById(productId);
        newMeal.setQuantity(grams);
        newMeal.setUser(user);
        newMeal.setProduct(product.orElseThrow(() -> new ResourceNotFoundException("Product not found")));
        newMeal.setConsumedAt(LocalDateTime.now());
        usersMealsRepository.save(newMeal);
    }

    @Override
    public List<UserMealsDTO> findAllUserMealsRelForSpecificDay(final Long userId, LocalDate date) {
        var allMealsEaten = usersMealsRepository.findAllByUserId(userId);
        List<UserMealsDTO> mealsEatenForGivenDay = new ArrayList<>();
        for (var meal : allMealsEaten) {
            if (date.equals(meal.getConsumedAt().toLocalDate())) {
                mealsEatenForGivenDay.add(UserMealsMapper.mapToUserProductDTO(meal));
            }
        }
        return mealsEatenForGivenDay;
    }

    @Override
    public double calculateTotalCaloriesForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalCalories = 0;
        for (var userProduct : usersProduct) {
            totalCalories += userProduct.getProduct().getCaloriesPer100Grams() * (userProduct.getQuantity() / 100);
        }
        return totalCalories;
    }

    @Override
    public double calculateTotalProteinForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalProtein = 0;
        for (var userProduct : usersProduct) {
            totalProtein += userProduct.getProduct().getProteinPer100Grams() * (userProduct.getQuantity() / 100);
        }
        return totalProtein;
    }

    @Override
    public double calculateTotalCarbsForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalCarbs = 0;
        for (var userProduct : usersProduct) {
            totalCarbs += userProduct.getProduct().getCarbsPer100Grams() * (userProduct.getQuantity() / 100);
        }
        return totalCarbs;
    }

    @Override
    public double calculateTotalFatsForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalFats = 0;
        for (var userProduct : usersProduct) {
            totalFats += userProduct.getProduct().getFatPer100Grams() * (userProduct.getQuantity() / 100);
        }
        return totalFats;
    }

    @Override
    public UserMealsDTO updateMealQuantity(long id, double newQuantity) {
        final var userMeal = usersMealsRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found" + id));
        userMeal.setQuantity(newQuantity);
        var savedUserMeal = usersMealsRepository.save(userMeal);
        return UserMealsMapper.mapToUserProductDTO(savedUserMeal);
    }

    @Override
    public void deleteByUserMealID(long id){
        usersMealsRepository.deleteByUserMealsID(id);
    }

}
