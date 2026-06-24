package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.DailyMacrosDTO;
import com.stoyandev.caloriecalculator.dto.MealResponseDTO;
import com.stoyandev.caloriecalculator.entity.UserMeals;
import com.stoyandev.caloriecalculator.entity.enums.MealType;
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
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class UserMealsServiceImpl implements UserMealsService {

    public static final int HUNDRED_GRAMS_DENOMINATOR = 100;
    private final MealsRepository usersMealsRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Override
    public void addMealForUser(final Long userId, Long productId, Integer grams, MealType mealType) {
        var newMeal = new UserMeals();

        var user = userRepository
                .findById(userId).
                orElseThrow(() -> new ResourceNotFoundException("User Not found"));
        var product = productRepository.findById(productId);
        newMeal.setQuantity(grams);
        newMeal.setUser(user);
        newMeal.setProduct(product.orElseThrow(() -> new ResourceNotFoundException("Product not found")));
        newMeal.setConsumedAt(LocalDateTime.now());
        newMeal.setMealType(mealType != null ? mealType : MealType.SNACK);
        usersMealsRepository.save(newMeal);
    }

    @Override
    public List<MealResponseDTO> findAllUserMealsRelForSpecificDay(final Long userId, LocalDate date) {
        return usersMealsRepository
                .findAllByUserIdAndConsumedAtRange(userId, date.atStartOfDay(), date.plusDays(1).atStartOfDay())
                .stream()
                .map(UserMealsMapper::mapToUserProductDTO)
                .toList();
    }

    @Override
    public DailyMacrosDTO calculateDailyMacros(Long userId, LocalDate date) {
        var meals = usersMealsRepository
                .findAllByUserIdAndConsumedAtRange(userId, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        return aggregate(date, meals);
    }

    @Override
    public MealResponseDTO updateMealQuantity(final long id, double newQuantity) {
        final var userMeal = usersMealsRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found" + id));

        userMeal.setQuantity(newQuantity);
        var savedUserMeal = usersMealsRepository.save(userMeal);
        return UserMealsMapper.mapToUserProductDTO(savedUserMeal);
    }

    @Override
    public void deleteByUserMealID(final long id) {
        usersMealsRepository.deleteByUserMealsID(id);
    }


    @Override
    public List<DailyMacrosDTO> fetchAllMacros(Long userId) {
        // Single repo call, fold each day's meals into a DailyMacrosDTO once.
        // TreeMap keeps the result ordered by date ascending.
        Map<LocalDate, List<UserMeals>> mealsByDate = usersMealsRepository.findAllByUserId(userId).stream()
                .collect(Collectors.groupingBy(
                        m -> m.getConsumedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.toList()));

        return mealsByDate.entrySet().stream()
                .map(e -> aggregate(e.getKey(), e.getValue()))
                .toList();
    }

    /**
     * Sums macros for a list of meals into a per-day DTO. Calories cast to int
     * preserves the legacy contract of {@link DailyMacrosDTO#calories()}.
     */
    private DailyMacrosDTO aggregate(LocalDate date, List<UserMeals> meals) {
        double totalCalories = 0;
        double totalProtein = 0;
        double totalCarbs = 0;
        double totalFats = 0;

        for (final var meal : meals) {
            var product = meal.getProduct();
            double quantity = meal.getQuantity();
            totalCalories += product.getCaloriesPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
            totalProtein += product.getProteinPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
            totalCarbs += product.getCarbsPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
            totalFats += product.getFatPer100Grams() * quantity / HUNDRED_GRAMS_DENOMINATOR;
        }
        return new DailyMacrosDTO(date.toString(), (int) totalCalories, totalProtein, totalFats, totalCarbs);
    }
}
