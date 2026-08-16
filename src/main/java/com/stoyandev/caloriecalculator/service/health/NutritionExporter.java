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
 * Duplicate-safe in both directions: each export is tracked in NutritionExport
 * with a content signature and the Google dataPoint's resource name (remoteId).
 * Re-running skips unchanged meals; a changed meal is PATCHed in place (so the
 * old Google point is updated, never orphaned); a meal slot that no longer has
 * any food is deleted from Google via batchDelete and its tracking row removed.
 * This is the app→Google direction (mirror of the WeightImporter's Google→app).
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
     * Export the last `lookbackDays` of meals for a user into the given result
     * (nutritionExported / nutritionSkipped / errors).
     */
    public void export(Long userId, String accessToken, int lookbackDays,
                       com.stoyandev.caloriecalculator.dto.HealthSyncResultDTO result) {
        int days = lookbackDays > 0 ? lookbackDays : DEFAULT_LOOKBACK_DAYS;
        LocalDate today = LocalDate.now();
        for (int i = 0; i < days; i++) {
            exportDay(userId, accessToken, today.minusDays(i), result);
        }
    }

    private void exportDay(Long userId, String accessToken, LocalDate date,
                           com.stoyandev.caloriecalculator.dto.HealthSyncResultDTO result) {
        List<UserMeals> meals = mealsRepository.findAllByUserIdAndConsumedAtRange(
                userId, date.atStartOfDay(), date.plusDays(1).atStartOfDay());

        // Aggregate macros per meal type (empty when a day has no food).
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

        // Delete Google points for slots we previously exported but that no longer
        // have any food (a meal was removed in the app). Without this the deleted
        // meal would linger in Google forever.
        for (NutritionExport prev : exportRepository.findAllByUserIdAndDate(userId, date)) {
            if (!byMeal.containsKey(prev.getMealType())) {
                deleteMeal(userId, accessToken, prev, result);
            }
        }

        for (Map.Entry<MealType, Macros> e : byMeal.entrySet()) {
            exportMeal(userId, accessToken, date, e.getKey(), e.getValue(), result);
        }
    }

    private void exportMeal(Long userId, String token, LocalDate date, MealType type, Macros macros,
                            com.stoyandev.caloriecalculator.dto.HealthSyncResultDTO result) {
        String sig = macros.signature();
        NutritionExport existing = exportRepository
                .findByUserIdAndDateAndMealType(userId, date, type)
                .orElse(null);
        if (existing != null && sig.equals(existing.getContentSig())) {
            result.addNutritionSkipped(1); // unchanged → nothing to do
            return;
        }

        Map<String, Object> body = buildNutritionBody(date, type, macros);
        boolean patchInPlace = existing != null && existing.getRemoteId() != null
                && !existing.getRemoteId().isBlank();
        try {
            String remoteId;
            if (patchInPlace) {
                // Update the existing Google point rather than creating a new one,
                // so a corrected meal doesn't leave the old macros orphaned.
                // updateMask=* replaces the whole nutritionLog payload.
                var resp = rest.method(org.springframework.http.HttpMethod.PATCH)
                        .uri(GoogleHealthClient.HEALTH_BASE + "/" + existing.getRemoteId() + "?updateMask=*")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
                remoteId = resp != null && resp.get("name") != null
                        ? resp.get("name").toString() : existing.getRemoteId();
            } else {
                var resp = rest.post()
                        .uri(GoogleHealthClient.HEALTH_BASE + "/users/me/dataTypes/nutrition-log/dataPoints")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
                remoteId = resp != null && resp.get("name") != null ? resp.get("name").toString() : null;
            }

            NutritionExport rec = existing != null ? existing
                    : NutritionExport.builder().userId(userId).date(date).mealType(type).build();
            rec.setRemoteId(remoteId);
            rec.setContentSig(sig);
            rec.setExportedAt(Instant.now());
            exportRepository.save(rec);
            result.addNutritionExported(1);
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound nf) {
            // The tracked point is gone on Google's side (deleted elsewhere / stale
            // id). Drop the stale mapping so the next run re-creates it cleanly.
            if (existing != null) exportRepository.delete(existing);
            log.warn("Nutrition point missing on patch for user {} {} {} — will re-create next run",
                    userId, date, type);
            result.addError(date + " " + type + ": remote point gone, re-creating next run");
        } catch (Exception ex) {
            String msg = date + " " + type + ": " + ex.getMessage();
            log.warn("Nutrition export failed for user {} {}", userId, msg);
            result.addError(msg);
        }
    }

    /**
     * Delete a previously-exported meal slot from Google (the app no longer has
     * any food in it) and forget the tracking row. A 404 means it's already gone,
     * which is success — we just clear our row.
     */
    private void deleteMeal(Long userId, String token, NutritionExport prev,
                            com.stoyandev.caloriecalculator.dto.HealthSyncResultDTO result) {
        String remoteId = prev.getRemoteId();
        try {
            if (remoteId != null && !remoteId.isBlank()) {
                rest.post()
                        .uri(GoogleHealthClient.HEALTH_BASE
                                + "/users/me/dataTypes/nutrition-log/dataPoints:batchDelete")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("names", List.of(remoteId)))
                        .retrieve()
                        .toBodilessEntity();
            }
            exportRepository.delete(prev);
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound nf) {
            exportRepository.delete(prev); // already gone → clear our mapping
        } catch (Exception ex) {
            String msg = prev.getDate() + " " + prev.getMealType() + " delete: " + ex.getMessage();
            log.warn("Nutrition delete failed for user {} {}", userId, msg);
            result.addError(msg);
        }
    }

    private Map<String, Object> buildNutritionBody(LocalDate date, MealType type, Macros m) {
        // Represent the meal as an interval on that date (noon, arbitrary but stable).
        String start = date.atTime(12, 0).atZone(java.time.ZoneOffset.UTC).toInstant().toString();
        String end = date.atTime(12, 30).atZone(java.time.ZoneOffset.UTC).toInstant().toString();
        // Google Health quantities use unit-named numeric fields, NOT {unit,value}:
        // EnergyQuantity → "kcal"; WeightQuantity (fat/carbs/protein) → "grams".
        return Map.of("nutritionLog", Map.of(
                "interval", Map.of("startTime", start, "endTime", end),
                "mealType", googleMealType(type),
                "foodDisplayName", type.name().charAt(0) + type.name().substring(1).toLowerCase(),
                "energy", Map.of("kcal", round(m.kcal)),
                "totalCarbohydrate", Map.of("grams", round(m.carbs)),
                "totalFat", Map.of("grams", round(m.fat)),
                "nutrients", List.of(Map.of(
                        "nutrient", "PROTEIN",
                        "quantity", Map.of("grams", round(m.protein))))
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
