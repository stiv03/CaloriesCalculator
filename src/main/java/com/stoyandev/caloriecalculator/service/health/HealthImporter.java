package com.stoyandev.caloriecalculator.service.health;

import java.time.Instant;

/**
 * A pluggable importer for one Google Health data type. Add steps/sleep/etc.
 * later by implementing this — the OAuth, token, and scheduling layers stay
 * unchanged.
 */
public interface HealthImporter {

    /** The Google Health dataType this handles, e.g. "weight". */
    String dataType();

    /**
     * Import readings for one user since `since` (null = a default look-back).
     * `accessToken` is a fresh Google access token. Returns how many records
     * were written/updated.
     */
    int importSince(Long userId, String accessToken, Instant since);
}
