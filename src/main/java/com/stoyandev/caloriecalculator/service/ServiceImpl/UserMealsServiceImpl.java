package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.DailyMacrosDTO;
import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.Goal;
import com.stoyandev.caloriecalculator.entity.UserMeals;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.GoalMapper;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.mapper.UserMealsMapper;
import com.stoyandev.caloriecalculator.repository.GoalRepository;
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

import static com.stoyandev.caloriecalculator.mapper.UserMapper.mapGoalToDTO;

@Service
@AllArgsConstructor
public class UserMealsServiceImpl implements UserMealsService {

    public static final int HUNDRED_GRAMS_DENOMINATOR = 100;
    private final MealsRepository usersMealsRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final GoalRepository goalRepository;

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

    @Override
    public GoalDTO setUserGoal(Long userId, GoalDTO goal) {
        final var updatedGoal = goalRepository.findByUserId(userId);
        if(updatedGoal.isPresent()) {
            updatedGoal.get().setFat(goal.fat());
            updatedGoal.get().setProtein(goal.protein());
            updatedGoal.get().setCarbs(goal.carbs());
            updatedGoal.get().setCalories(goal.calories());
           var savedGoal = goalRepository.save(updatedGoal.get());
            return GoalMapper.mapToDTo(savedGoal);
        }

        final var newGoal = new Goal();
        final var user = userRepository.findById(userId).orElseThrow(()-> new ResourceNotFoundException("User not found"));
        newGoal.setUser(user);
        newGoal.setFat(goal.fat());
        newGoal.setCarbs(goal.carbs());
        newGoal.setProtein(goal.protein());
        newGoal.setCalories(goal.calories());
        var savedGoal2 = goalRepository.save(newGoal);

        return GoalMapper.mapToDTo(savedGoal2);
    }

    @Override
    public GoalDTO getUserGoal(Long userId) {
        final var goal = goalRepository.findByUserId(userId).orElseThrow(() -> new ResourceNotFoundException("Goal not found"));
        return UserMapper.mapGoalToDTO(goal);
    }

}
