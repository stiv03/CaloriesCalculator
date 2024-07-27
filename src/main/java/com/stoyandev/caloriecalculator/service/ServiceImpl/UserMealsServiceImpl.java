package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.DailyMacrosDTO;
import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.UserMeals;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.UserMealsMapper;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.ProductRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.service.UserMealsService;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class UserMealsServiceImpl implements UserMealsService {

    public static final int HUNDRED_GRAMS_DENOMINATOR = 100;
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
            totalCalories += userProduct.getProduct().getCaloriesPer100Grams() * (userProduct.getQuantity() / HUNDRED_GRAMS_DENOMINATOR);
        }
        return totalCalories;
    }

    @Override
    public double calculateTotalProteinForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalProtein = 0;
        for (var userProduct : usersProduct) {
            totalProtein += userProduct.getProduct().getProteinPer100Grams() * (userProduct.getQuantity() / HUNDRED_GRAMS_DENOMINATOR);
        }
        return totalProtein;
    }

    @Override
    public double calculateTotalCarbsForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalCarbs = 0;
        for (var userProduct : usersProduct) {
            totalCarbs += userProduct.getProduct().getCarbsPer100Grams() * (userProduct.getQuantity() / HUNDRED_GRAMS_DENOMINATOR);
        }
        return totalCarbs;
    }

    @Override
    public double calculateTotalFatsForDay(final Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);

        double totalFats = 0;
        for (var userProduct : usersProduct) {
            totalFats += userProduct.getProduct().getFatPer100Grams() * (userProduct.getQuantity() / HUNDRED_GRAMS_DENOMINATOR);
        }
        return totalFats;
    }

    @Override
    public DailyMacrosDTO calculateDailyMacros(Long userId, LocalDate date) {
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(userId, date);
        double totalCalories = 0;
        double totalProtein = 0;
        double totalCarbs = 0;
        double totalFats = 0;

        for (final var userProduct : usersProduct) {
            final var product = userProduct.getProduct();
            double quantity = userProduct.getQuantity();
            totalCalories += product.getCaloriesPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
            totalProtein += product.getProteinPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
            totalCarbs += product.getCarbsPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
            totalFats += product.getFatPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
        }
        return new DailyMacrosDTO(date.toString(), (int) totalCalories, totalProtein, totalFats, totalCarbs);
    }

    @Override
    public UserMealsDTO updateMealQuantity(long id, double newQuantity) {
        final var userMeal = usersMealsRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found" + id));
        // Validate authentication of user:
        SecurityContextHolder.getContext().getAuthentication();

        userMeal.setQuantity(newQuantity);
        var savedUserMeal = usersMealsRepository.save(userMeal);
        return UserMealsMapper.mapToUserProductDTO(savedUserMeal);
    }

    @Override
    public void deleteByUserMealID(long id) {
        usersMealsRepository.deleteByUserMealsID(id);
    }


    @Override
    public List<DailyMacrosDTO> fetchAllMacros(Long userId) {
        return usersMealsRepository.findAllByUserId(userId).stream()
                .collect(Collectors.groupingBy(meal -> meal.getConsumedAt().toLocalDate()))
                .keySet().stream()
                .map(date -> calculateDailyMacros(userId, date))
                .toList();
    }

}
