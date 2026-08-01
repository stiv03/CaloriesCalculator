package com.stoyandev.caloriecalculator.service.health;

import com.stoyandev.caloriecalculator.entity.NutritionExport;
import com.stoyandev.caloriecalculator.entity.UserMeals;
import com.stoyandev.caloriecalculator.entity.enums.MealType;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.NutritionExportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Writes the user's logged meals into Google Health as nutrition entries — one
 * per (day, meal type), macros aggregated from the products in that slot.
 *
 * Duplicate-safe: each export is tracked in NutritionExport with a content
 * signature. Re-running skips unchanged meals and re-writes changed ones. This
 * is the app→Google direction (mirror of the WeightImporter's Google→app).
 */
@Component
@RequiredArgsConstructor
public class NutritionExporter {

    private static final Logger log = LoggerFactory.getLogger(NutritionExporter.class);
    private static final int DEFAULT_LOOKBACK_DAYS = 7;
    private static final double PER_100G = 100.0;

    private final MealsRepository mealsRepository;
    private final NutritionExportRepository exportRepository;
    private final RestClient rest = RestClient.create();

    /** Google Health meal-type names; PREWORKOUT has no equivalent → SNACK. */
    private static String googleMealType(MealType t) {
        return switch (t) {
            case BREAKFAST -> "BREAKFAST";
            case LUNCH -> "LUNCH";
            case DINNER -> "DINNER";
            default -> "SNACK"; // SNACK, PREWORKOUT
        };
    }

    /**
     * Export the last `lookbackDays` of meals for a user. Returns the number of
     * nutrition entries written or updated.
     */
    public int export(Long userId, String accessToken, int lookbackDays) {
        int days = lookbackDays > 0 ? lookbackDays : DEFAULT_LOOKBACK_DAYS;
        int written = 0;
        LocalDate today = LocalDate.now();
        for (int i = 0; i < days; i++) {
            written += exportDay(userId, accessToken, today.minusDays(i));
        }
        return written;
    }

    private int exportDay(Long userId, String accessToken, LocalDate date) {
        List<UserMeals> meals = mealsRepository.findAllByUserIdAndConsumedAtRange(
                userId, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        if (meals.isEmpty()) return 0;

        // Aggregate macros per meal type.
        Map<MealType, Macros> byMeal = new EnumMap<>(MealType.class);
        for (UserMeals m : meals) {
            MealType type = m.getMealType() != null ? m.getMealType() : MealType.SNACK;
            var p = m.getProduct();
            double q = m.getQuantity();
            Macros acc = byMeal.computeIfAbsent(type, k -> new Macros());
            acc.kcal += p.getCaloriesPer100Grams() * q / PER_100G;
            acc.protein += p.getProteinPer100Grams() * q / PER_100G;
            acc.carbs += p.getCarbsPer100Grams() * q / PER_100G;
            acc.fat += p.getFatPer100Grams() * q / PER_100G;
        }

        int written = 0;
        for (Map.Entry<MealType, Macros> e : byMeal.entrySet()) {
            if (exportMeal(userId, accessToken, date, e.getKey(), e.getValue())) written++;
        }
        return written;
    }

    /** Returns true if it wrote (new or changed), false if skipped as unchanged. */
    private boolean exportMeal(Long userId, String token, LocalDate date, MealType type, Macros macros) {
        String sig = macros.signature();
        NutritionExport existing = exportRepository
                .findByUserIdAndDateAndMealType(userId, date, type)
                .orElse(null);
        if (existing != null && sig.equals(existing.getContentSig())) {
            return false; // unchanged → nothing to do
        }

        Map<String, Object> body = buildNutritionBody(date, type, macros);
        try {
            var resp = rest.post()
                    .uri(GoogleHealthClient.HEALTH_BASE + "/users/me/dataTypes/nutrition/dataPoints")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            String remoteId = resp != null && resp.get("name") != null ? resp.get("name").toString() : null;

            NutritionExport rec = existing != null ? existing
                    : NutritionExport.builder().userId(userId).date(date).mealType(type).build();
            rec.setRemoteId(remoteId);
            rec.setContentSig(sig);
            rec.setExportedAt(Instant.now());
            exportRepository.save(rec);
            return true;
        } catch (Exception ex) {
            log.warn("Nutrition export failed for user {} {} {}: {}", userId, date, type, ex.getMessage());
            return false;
        }
    }

    private Map<String, Object> buildNutritionBody(LocalDate date, MealType type, Macros m) {
        // Represent the meal as an interval on that date (noon, arbitrary but stable).
        String start = date.atTime(12, 0).atZone(java.time.ZoneOffset.UTC).toInstant().toString();
        String end = date.atTime(12, 30).atZone(java.time.ZoneOffset.UTC).toInstant().toString();
        return Map.of("nutritionLog", Map.of(
                "interval", Map.of("startTime", start, "endTime", end),
                "mealType", googleMealType(type),
                "foodDisplayName", type.name().charAt(0) + type.name().substring(1).toLowerCase(),
                "energy", Map.of("unit", "kcal", "value", round(m.kcal)),
                "totalCarbohydrate", Map.of("unit", "g", "value", round(m.carbs)),
                "totalFat", Map.of("unit", "g", "value", round(m.fat)),
                "nutrients", List.of(Map.of(
                        "nutrient", "PROTEIN",
                        "quantity", Map.of("unit", "g", "value", round(m.protein))))
        ));
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }

    /** Mutable macro accumulator for one meal slot. */
    private static final class Macros {
        double kcal, protein, carbs, fat;
        String signature() {
            return round(kcal) + "|" + round(protein) + "|" + round(carbs) + "|" + round(fat);
        }
    }
}
