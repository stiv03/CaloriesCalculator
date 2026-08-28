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
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
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

    @Override
    public String exportWeeklyCsv(Long userId, LocalDate startDate) {
        LocalDateTime from = startDate.atStartOfDay();
        LocalDateTime to = startDate.plusDays(7).atStartOfDay();
        List<UserMeals> meals = usersMealsRepository.findAllByUserIdAndConsumedAtRange(userId, from, to);

        // Group by date, then by meal type (ordered by enum declaration)
        Map<LocalDate, Map<MealType, List<UserMeals>>> byDate = meals.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getConsumedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.groupingBy(
                                m -> m.getMealType() != null ? m.getMealType() : MealType.SNACK,
                                () -> Arrays.stream(MealType.values())
                                        .collect(Collectors.toMap(t -> t, t -> new java.util.ArrayList<>(),
                                                (a, b) -> { a.addAll(b); return a; },
                                                LinkedHashMap::new)),
                                Collectors.toList())));

        StringBuilder sb = new StringBuilder();
        sb.append("Date,Meal Type,Product,Grams,Calories,Protein (g),Fat (g),Carbs (g)\n");

        for (Map.Entry<LocalDate, Map<MealType, List<UserMeals>>> dayEntry : byDate.entrySet()) {
            LocalDate date = dayEntry.getKey();
            double dayCal = 0, dayProt = 0, dayFat = 0, dayCarb = 0, dayGrams = 0;

            for (MealType mealType : MealType.values()) {
                List<UserMeals> typeMeals = dayEntry.getValue().getOrDefault(mealType, List.of());
                for (UserMeals m : typeMeals) {
                    double q = m.getQuantity();
                    double cal = m.getProduct().getCaloriesPer100Grams() * q / HUNDRED_GRAMS_DENOMINATOR;
                    double prot = m.getProduct().getProteinPer100Grams() * q / HUNDRED_GRAMS_DENOMINATOR;
                    double fat = m.getProduct().getFatPer100Grams() * q / HUNDRED_GRAMS_DENOMINATOR;
                    double carb = m.getProduct().getCarbsPer100Grams() * q / HUNDRED_GRAMS_DENOMINATOR;
                    sb.append(date).append(',')
                            .append(mealType.name()).append(',')
                            .append(escapeCsv(m.getProduct().getName())).append(',')
                            .append(String.format("%.1f", q)).append(',')
                            .append(String.format("%.1f", cal)).append(',')
                            .append(String.format("%.1f", prot)).append(',')
                            .append(String.format("%.1f", fat)).append(',')
                            .append(String.format("%.1f", carb)).append('\n');
                    dayCal += cal; dayProt += prot; dayFat += fat; dayCarb += carb; dayGrams += q;
                }
            }

            if (dayGrams > 0) {
                sb.append(date).append(",DAILY TOTAL,,")
                        .append(String.format("%.1f", dayGrams)).append(',')
                        .append(String.format("%.1f", dayCal)).append(',')
                        .append(String.format("%.1f", dayProt)).append(',')
                        .append(String.format("%.1f", dayFat)).append(',')
                        .append(String.format("%.1f", dayCarb)).append('\n');
            }
        }

        return sb.toString();
    }

    private static String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
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
