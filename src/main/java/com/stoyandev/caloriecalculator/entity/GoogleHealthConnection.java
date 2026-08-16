package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * A user's server-side Google Health connection. Holds the long-lived refresh
 * token (encrypted at rest) so the backend can pull health data unattended.
 * One row per user.
 */
@Entity
@Table(
    name = "google_health_connection",
    uniqueConstraints = @UniqueConstraint(name = "uk_ghc_user", columnNames = "user_id")
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleHealthConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** Refresh token, AES-GCM encrypted (base64). Never stored in plaintext. */
    @Column(name = "refresh_token_enc", nullable = false, length = 2048)
    private String refreshTokenEnc;

    /** Space-delimited scopes granted at connect time. */
    @Column(name = "scopes", length = 1024)
    private String scopes;

    @Column(name = "connected_at", nullable = false)
    private Instant connectedAt;

    /** Last successful sync (null until the first run). Drives incremental import. */
    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    // ---- Per-user sync preferences. Default true so existing connections keep
    // syncing everything until the user opts out. steps/weight are imported
    // FROM Google; food (meals) is exported TO Google.
    @Builder.Default
    @Column(name = "sync_steps", nullable = false, columnDefinition = "boolean default true")
    private boolean syncSteps = true;

    @Builder.Default
    @Column(name = "sync_weight", nullable = false, columnDefinition = "boolean default true")
    private boolean syncWeight = true;

    @Builder.Default
    @Column(name = "sync_food", nullable = false, columnDefinition = "boolean default true")
    private boolean syncFood = true;

    @Builder.Default
    @Column(name = "sync_sleep", nullable = false, columnDefinition = "boolean default true")
    private boolean syncSleep = true;

    /** Whether viewed Google WEIGHTLIFTING sessions are persisted on-demand. */
    @Builder.Default
    @Column(name = "sync_workouts", nullable = false, columnDefinition = "boolean default true")
    private boolean syncWorkouts = true;
}
