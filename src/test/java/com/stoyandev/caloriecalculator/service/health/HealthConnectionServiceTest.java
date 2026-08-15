package com.stoyandev.caloriecalculator.service.health;

import com.stoyandev.caloriecalculator.entity.GoogleHealthConnection;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The per-user sync preferences gate which data types run during a sync.
 * {@link HealthConnectionService#isEnabled} is the single decision point used
 * both for the step/weight importers and the food (nutrition) export.
 */
class HealthConnectionServiceTest {

    private static GoogleHealthConnection conn(boolean steps, boolean weight, boolean food) {
        return GoogleHealthConnection.builder()
                .syncSteps(steps).syncWeight(weight).syncFood(food)
                .build();
    }

    @Test
    void allEnabledByDefault() {
        // The builder defaults (@Builder.Default) leave every type on.
        GoogleHealthConnection c = GoogleHealthConnection.builder().build();
        assertThat(HealthConnectionService.isEnabled(c, "steps")).isTrue();
        assertThat(HealthConnectionService.isEnabled(c, "weight")).isTrue();
        assertThat(HealthConnectionService.isEnabled(c, "food")).isTrue();
    }

    @Test
    void gatesEachTypeIndependently() {
        GoogleHealthConnection c = conn(false, true, false);
        assertThat(HealthConnectionService.isEnabled(c, "steps")).isFalse();
        assertThat(HealthConnectionService.isEnabled(c, "weight")).isTrue();
        assertThat(HealthConnectionService.isEnabled(c, "food")).isFalse();
    }

    @Test
    void allDisabled() {
        GoogleHealthConnection c = conn(false, false, false);
        assertThat(HealthConnectionService.isEnabled(c, "steps")).isFalse();
        assertThat(HealthConnectionService.isEnabled(c, "weight")).isFalse();
        assertThat(HealthConnectionService.isEnabled(c, "food")).isFalse();
    }

    @Test
    void unknownTypeDefaultsEnabled() {
        // A newly-added importer with no matching flag should still run rather
        // than being silently dropped.
        GoogleHealthConnection c = conn(false, false, false);
        assertThat(HealthConnectionService.isEnabled(c, "heart-rate")).isTrue();
    }
}
