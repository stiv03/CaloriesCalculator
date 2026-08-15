package com.stoyandev.caloriecalculator.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Breakdown of one Google Health sync run, surfaced to the UI so the user can
 * click the count and see exactly what synced in each direction (and why
 * anything failed).
 */
public class HealthSyncResultDTO {
    private int weightImported;      // Google Health → app
    private int stepsImported;       // Google Health → app (days)
    private int sleepImported;       // Google Health → app (nights)
    private int nutritionExported;   // app → Google Health (written/updated)
    private int nutritionSkipped;    // unchanged, nothing to do
    private final List<String> errors = new ArrayList<>();

    public int getWeightImported() { return weightImported; }
    public void addWeightImported(int n) { this.weightImported += n; }

    public int getStepsImported() { return stepsImported; }
    public void addStepsImported(int n) { this.stepsImported += n; }

    public int getSleepImported() { return sleepImported; }
    public void addSleepImported(int n) { this.sleepImported += n; }

    public int getNutritionExported() { return nutritionExported; }
    public void addNutritionExported(int n) { this.nutritionExported += n; }

    public int getNutritionSkipped() { return nutritionSkipped; }
    public void addNutritionSkipped(int n) { this.nutritionSkipped += n; }

    public List<String> getErrors() { return errors; }
    public void addError(String e) { this.errors.add(e); }

    /** Grand total of records that changed (for the headline count). */
    public int getTotal() { return weightImported + stepsImported + sleepImported + nutritionExported; }
}
