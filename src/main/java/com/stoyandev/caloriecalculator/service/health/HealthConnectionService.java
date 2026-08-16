package com.stoyandev.caloriecalculator.service.health;

import com.stoyandev.caloriecalculator.entity.GoogleHealthConnection;
import com.stoyandev.caloriecalculator.repository.GoogleHealthConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates the Google Health connection: OAuth handshake, encrypted
 * refresh-token storage, and running all {@link HealthImporter}s (manually or
 * on a daily schedule). Adding a new metric = add an importer bean; this class
 * is unchanged.
 */
@Service
@RequiredArgsConstructor
public class HealthConnectionService {

    private static final Logger log = LoggerFactory.getLogger(HealthConnectionService.class);
    private static final long STATE_TTL_MS = 10 * 60 * 1000; // 10 min to complete consent

    private final GoogleHealthClient client;
    private final GoogleHealthConnectionRepository connectionRepo;
    private final TokenCipher cipher;
    private final List<HealthImporter> importers;
    private final NutritionExporter nutritionExporter;
    private final com.stoyandev.caloriecalculator.repository.NutritionExportRepository nutritionExportRepo;
    private final com.stoyandev.caloriecalculator.repository.SleepRecordRepository sleepRecordRepo;
    private final com.stoyandev.caloriecalculator.repository.WorkoutActivityRecordRepository workoutActivityRepo;

    @Value("${google.health.token-enc-key}")
    private String stateKeyBase64; // reuse the enc key as the HMAC key for state signing

    @Value("${google.health.post-connect-redirect}")
    private String postConnectRedirect;

    // ---- Connect flow ----

    public String buildAuthUrl(Long userId) {
        if (!client.isConfigured()) {
            throw new IllegalStateException("Google Health is not configured on the server.");
        }
        return client.buildAuthUrl(signState(userId));
    }

    @Transactional
    public String handleCallback(String code, String state, String error) {
        try {
            if (error != null && !error.isBlank()) {
                return postConnectRedirect + "?health=error";
            }
            Long userId = verifyState(state);
            if (userId == null || code == null || code.isBlank()) {
                return postConnectRedirect + "?health=invalid";
            }
            GoogleHealthClient.TokenResponse tokens = client.exchangeCode(code);
            if (tokens == null || tokens.refreshToken() == null || tokens.refreshToken().isBlank()) {
                // No refresh token (e.g. user previously consented without offline) — signal retry.
                return postConnectRedirect + "?health=no_refresh_token";
            }
            GoogleHealthConnection conn = connectionRepo.findByUserId(userId)
                    .orElseGet(() -> GoogleHealthConnection.builder().userId(userId).build());
            conn.setRefreshTokenEnc(cipher.encrypt(tokens.refreshToken()));
            conn.setScopes(tokens.scope());
            conn.setConnectedAt(Instant.now());
            connectionRepo.save(conn);
            return postConnectRedirect + "?health=connected";
        } catch (Exception e) {
            log.warn("Health OAuth callback failed: {}", e.getMessage());
            return postConnectRedirect + "?health=error";
        }
    }

    // ---- Status / manual sync / disconnect ----

    public Map<String, Object> status(Long userId) {
        Map<String, Object> out = new HashMap<>();
        var conn = connectionRepo.findByUserId(userId).orElse(null);
        out.put("connected", conn != null);
        out.put("configured", client.isConfigured());
        out.put("lastSyncAt", conn != null && conn.getLastSyncAt() != null ? conn.getLastSyncAt().toString() : null);
        // Sync preferences (default true when not yet connected, so the UI shows
        // everything enabled before first connect).
        out.put("syncSteps", conn == null || conn.isSyncSteps());
        out.put("syncWeight", conn == null || conn.isSyncWeight());
        out.put("syncFood", conn == null || conn.isSyncFood());
        out.put("syncSleep", conn == null || conn.isSyncSleep());
        out.put("syncWorkouts", conn == null || conn.isSyncWorkouts());
        return out;
    }

    /** Whether on-demand workout sessions should be persisted for this user. */
    public boolean isWorkoutSyncEnabled(Long userId) {
        var conn = connectionRepo.findByUserId(userId).orElse(null);
        return conn != null && conn.isSyncWorkouts();
    }

    /** Persist which data types to sync. No-op if the user isn't connected. */
    @Transactional
    public void updatePreferences(Long userId, boolean syncSteps, boolean syncWeight, boolean syncFood, boolean syncSleep, boolean syncWorkouts) {
        var conn = connectionRepo.findByUserId(userId).orElse(null);
        if (conn == null) return;
        conn.setSyncSteps(syncSteps);
        conn.setSyncWeight(syncWeight);
        conn.setSyncFood(syncFood);
        conn.setSyncSleep(syncSleep);
        conn.setSyncWorkouts(syncWorkouts);
        connectionRepo.save(conn);
    }

    @Transactional
    public Map<String, Object> syncNow(Long userId) {
        var conn = connectionRepo.findByUserId(userId).orElse(null);
        Map<String, Object> out = new HashMap<>();
        if (conn == null) {
            out.put("synced", false);
            out.put("reason", "not_connected");
            return out;
        }
        try {
            var result = runImporters(conn);
            out.put("synced", true);
            out.put("recordsImported", result.getTotal());
            out.put("weightImported", result.getWeightImported());
            out.put("stepsImported", result.getStepsImported());
            out.put("sleepImported", result.getSleepImported());
            out.put("nutritionExported", result.getNutritionExported());
            out.put("nutritionSkipped", result.getNutritionSkipped());
            out.put("errors", result.getErrors());
        } catch (Exception e) {
            // Never let a sync failure bubble up as a 500/401 that logs the user
            // out — surface it in the result so the UI can show what went wrong.
            log.warn("Manual sync failed for user {}: {}", userId, e.getMessage());
            out.put("synced", false);
            out.put("reason", "sync_failed");
            out.put("errors", java.util.List.of(String.valueOf(e.getMessage())));
        }
        return out;
    }

    @Transactional
    public void disconnect(Long userId) {
        connectionRepo.deleteByUserId(userId);
        // Forget export tracking so a future reconnect re-exports cleanly.
        nutritionExportRepo.deleteByUserId(userId);
        // Drop imported sleep so a reconnect re-imports from a clean slate.
        sleepRecordRepo.deleteAllByUserId(userId);
        // Drop saved workout sessions so a reconnect re-fetches on demand.
        workoutActivityRepo.deleteAllByUserId(userId);
    }

    // ---- Scheduled sync every 2 hours from 06:00 through midnight (at :13 to
    // avoid the top-of-hour crowd): 06, 08, 10 … 22, and 00. The 02:00/04:00
    // slots are skipped since nothing changes overnight. Imports are incremental
    // (importSince(lastSyncAt)) and the nutrition push is duplicate-safe, so each
    // run only picks up what changed — this keeps food logged through the day,
    // and health data, fresh rather than stale until the next morning. ----

    @Scheduled(cron = "0 13 0,6,8,10,12,14,16,18,20,22 * * *")
    @Transactional
    public void scheduledSync() {
        if (!client.isConfigured()) return;
        for (GoogleHealthConnection conn : connectionRepo.findAll()) {
            try {
                runImporters(conn);
            } catch (Exception e) {
                log.warn("Scheduled health sync failed for user {}: {}", conn.getUserId(), e.getMessage());
            }
        }
    }

    // ---- Core: refresh token, run every importer + nutrition export ----

    /**
     * Mint a fresh Google access token for the connected user from the stored
     * refresh token. Throws IllegalStateException (never returns null) so callers
     * can map to a shaped "not connected"/"error" response.
     */
    public String mintAccessToken(Long userId) {
        var conn = connectionRepo.findByUserId(userId).orElse(null);
        if (conn == null) throw new IllegalStateException("not_connected");
        GoogleHealthClient.TokenResponse refreshed = client.refresh(cipher.decrypt(conn.getRefreshTokenEnc()));
        if (refreshed == null || refreshed.accessToken() == null) {
            throw new IllegalStateException("token_refresh_failed");
        }
        return refreshed.accessToken();
    }

    private com.stoyandev.caloriecalculator.dto.HealthSyncResultDTO runImporters(GoogleHealthConnection conn) {
        var result = new com.stoyandev.caloriecalculator.dto.HealthSyncResultDTO();
        String accessToken = mintAccessToken(conn.getUserId());
        // Each importer/exporter is isolated: one failing (e.g. a bad endpoint)
        // must not abort the others, and its error is recorded in the breakdown.
        // Per-user preferences gate which data types run.
        for (HealthImporter importer : importers) {
            if (!isEnabled(conn, importer.dataType())) continue;
            try {
                int n = importer.importSince(conn.getUserId(), accessToken, conn.getLastSyncAt());
                switch (importer.dataType()) {
                    case "steps" -> result.addStepsImported(n);
                    case "sleep" -> result.addSleepImported(n);
                    default -> result.addWeightImported(n);
                }
            } catch (Exception e) {
                result.addError(importer.dataType() + " import: " + shortMsg(e.getMessage()));
                log.warn("{} import failed for user {}: {}", importer.dataType(), conn.getUserId(), e.getMessage());
            }
        }
        // App → Google: push recent meals as nutrition entries (duplicate-safe).
        if (isEnabled(conn, "food")) {
            try {
                nutritionExporter.export(conn.getUserId(), accessToken, 7, result);
            } catch (Exception e) {
                result.addError("nutrition export: " + shortMsg(e.getMessage()));
            }
        }
        conn.setLastSyncAt(Instant.now());
        connectionRepo.save(conn);
        return result;
    }

    /** Whether a data type is enabled for this connection. Unknown types default on. */
    static boolean isEnabled(GoogleHealthConnection conn, String dataType) {
        return switch (dataType) {
            case "steps" -> conn.isSyncSteps();
            case "weight" -> conn.isSyncWeight();
            case "food" -> conn.isSyncFood();
            case "sleep" -> conn.isSyncSleep();
            default -> true;
        };
    }

    /** Trim long/HTML error bodies to a readable snippet for the UI. */
    private static String shortMsg(String msg) {
        if (msg == null) return "unknown error";
        String m = msg.replaceAll("\\s+", " ").trim();
        return m.length() > 200 ? m.substring(0, 200) + "…" : m;
    }

    // ---- Signed state (HMAC) so the stateless callback can trust the userId ----

    private String signState(Long userId) {
        String payload = userId + ":" + Instant.now().toEpochMilli();
        String sig = hmac(payload);
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString((payload + ":" + sig).getBytes(StandardCharsets.UTF_8));
    }

    private Long verifyState(String state) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(state), StandardCharsets.UTF_8);
            int lastColon = decoded.lastIndexOf(':');
            String payload = decoded.substring(0, lastColon);
            String sig = decoded.substring(lastColon + 1);
            if (!hmac(payload).equals(sig)) return null;
            String[] parts = payload.split(":");
            long ts = Long.parseLong(parts[1]);
            if (Instant.now().toEpochMilli() - ts > STATE_TTL_MS) return null; // expired
            return Long.parseLong(parts[0]);
        } catch (Exception e) {
            return null;
        }
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(Base64.getDecoder().decode(stateKeyBase64.trim()), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("state signing failed", e);
        }
    }
}
