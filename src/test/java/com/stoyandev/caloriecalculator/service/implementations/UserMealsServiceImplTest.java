package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.entity.Product;
import com.stoyandev.caloriecalculator.entity.UserMeals;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.repository.GoalRepository;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.ProductRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Pins the per-day macro arithmetic so the upcoming refactor of the
 * underlying repository call cannot change the visible totals.
 */
@ExtendWith(MockitoExtension.class)
class UserMealsServiceImplTest {

    @Mock private MealsRepository mealsRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductRepository productRepository;
    @Mock private GoalRepository goalRepository;

    @InjectMocks private UserMealsServiceImpl service;

    private static final Long USER_ID = 42L;

    /** Chicken: 165 kcal / 31g protein / 0g carbs / 3.6g fat per 100g. */
    private Product chicken;
    /** Rice: 130 kcal / 2.7g protein / 28g carbs / 0.3g fat per 100g. */
    private Product rice;

    @BeforeEach
    void setUp() {
        chicken = new Product();
        chicken.setId(1L);
        chicken.setName("Chicken breast");
        chicken.setCaloriesPer100Grams(165);
        chicken.setProteinPer100Grams(31);
        chicken.setCarbsPer100Grams(0);
        chicken.setFatPer100Grams(3.6);

        rice = new Product();
        rice.setId(2L);
        rice.setName("White rice cooked");
        rice.setCaloriesPer100Grams(130);
        rice.setProteinPer100Grams(2.7);
        rice.setCarbsPer100Grams(28);
        rice.setFatPer100Grams(0.3);
    }

    @Test
    void calculateDailyMacros_emptyDay_returnsZeros() {
        final var date = LocalDate.of(2026, 5, 30);
        when(mealsRepository.findAllByUserIdAndConsumedAtRange(
                eq(USER_ID),
                any(LocalDateTime.class),
                any(LocalDateTime.class))).thenReturn(List.of());

        var result = service.calculateDailyMacros(USER_ID, date);

        assertThat(result.date()).isEqualTo("2026-05-30");
        assertThat(result.calories()).isZero();
        assertThat(result.protein()).isZero();
        assertThat(result.carb()).isZero();
        assertThat(result.fat()).isZero();
    }

    @Test
    void calculateDailyMacros_singleMeal_scalesByQuantity() {
        // 200g of chicken: 2 × (165, 31, 0, 3.6) = (330, 62, 0, 7.2)
        final var date = LocalDate.of(2026, 5, 30);
        var meal = meal(chicken, 200, date.atTime(12, 0));
        when(mealsRepository.findAllByUserIdAndConsumedAtRange(
                eq(USER_ID), any(), any())).thenReturn(List.of(meal));

        var result = service.calculateDailyMacros(USER_ID, date);

        assertThat(result.calories()).isEqualTo(330);
        assertThat(result.protein()).isEqualTo(62.0);
        assertThat(result.carb()).isEqualTo(0.0);
        assertThat(result.fat()).isEqualTo(7.2);
    }

    @Test
    void calculateDailyMacros_multipleMeals_sumsCorrectly() {
        // 150g chicken + 250g rice
        // chicken 150g: (247.5, 46.5, 0, 5.4)
        // rice    250g: (325,    6.75, 70, 0.75)
        // total      : (572.5, 53.25, 70, 6.15) → calories cast to int = 572
        final var date = LocalDate.of(2026, 5, 30);
        when(mealsRepository.findAllByUserIdAndConsumedAtRange(
                eq(USER_ID), any(), any())).thenReturn(List.of(
                        meal(chicken, 150, date.atTime(12, 0)),
                        meal(rice, 250, date.atTime(13, 0))));

        var result = service.calculateDailyMacros(USER_ID, date);

        assertThat(result.calories()).isEqualTo(572);
        assertThat(result.protein()).isEqualTo(53.25);
        assertThat(result.carb()).isEqualTo(70.0);
        assertThat(result.fat()).isCloseTo(6.15, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void fetchAllMacros_groupsByDay() {
        final var dayA = LocalDate.of(2026, 5, 28);
        final var dayB = LocalDate.of(2026, 5, 30);
        when(mealsRepository.findAllByUserId(USER_ID)).thenReturn(List.of(
                meal(chicken, 100, dayA.atTime(8, 0)),    // 165 kcal
                meal(chicken, 100, dayA.atTime(20, 0)),   // 165 kcal → dayA = 330
                meal(rice, 200, dayB.atTime(13, 0))));    // 260 kcal

        var result = service.fetchAllMacros(USER_ID);

        assertThat(result).hasSize(2);
        var byDate = result.stream()
                .collect(java.util.stream.Collectors.toMap(
                        d -> d.date(), d -> d));
        assertThat(byDate.get("2026-05-28").calories()).isEqualTo(330);
        assertThat(byDate.get("2026-05-30").calories()).isEqualTo(260);
    }

    @Test
    void fetchAllMacros_noMeals_returnsEmpty() {
        when(mealsRepository.findAllByUserId(USER_ID)).thenReturn(List.of());
        assertThat(service.fetchAllMacros(USER_ID)).isEmpty();
    }

    private UserMeals meal(Product product, double grams, LocalDateTime at) {
        var m = new UserMeals();
        m.setId(System.identityHashCode(at) & 0xFFFFL);
        var owner = new Users();
        owner.setId(USER_ID);
        m.setUser(owner);
        m.setProduct(product);
        m.setQuantity(grams);
        m.setConsumedAt(at);
        return m;
    }
}
