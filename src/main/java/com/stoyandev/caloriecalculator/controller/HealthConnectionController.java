package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.service.health.HealthConnectionService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

/**
 * Google Health connection endpoints.
 *  - authorize/status/sync/disconnect are user-scoped (JWT).
 *  - callback is hit by Google's redirect (no JWT) and is permitAll; it trusts
 *    the signed `state` to identify the user.
 */
@RestController
@RequestMapping("/api/v1/health")
@AllArgsConstructor
public class HealthConnectionController {

    private final HealthConnectionService service;

    /** Returns the Google consent URL the frontend should open. */
    @GetMapping("/oauth/authorize/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Map<String, String>> authorize(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(Map.of("authUrl", service.buildAuthUrl(userId)));
        } catch (IllegalStateException e) {
            // Not configured on the server → clear 503, not a misleading 401/500.
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** Google redirects here after consent. Not JWT-protected; identity is in `state`. */
    @GetMapping("/oauth/callback")
    public RedirectView callback(@RequestParam(required = false) String code,
                                 @RequestParam(required = false) String state,
                                 @RequestParam(required = false) String error) {
        String target = service.handleCallback(code, state, error);
        return new RedirectView(target);
    }

    @GetMapping("/status/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Map<String, Object>> status(@PathVariable Long userId) {
        return ResponseEntity.ok(service.status(userId));
    }

    /** Save which data types to sync (steps/weight imported, food exported). */
    @PutMapping("/preferences/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> preferences(@PathVariable Long userId,
                                            @RequestBody SyncPreferences prefs) {
        service.updatePreferences(userId, prefs.steps(), prefs.weight(), prefs.food());
        return ResponseEntity.noContent().build();
    }

    /** Body for the preferences endpoint. Absent fields default to true. */
    public record SyncPreferences(Boolean syncSteps, Boolean syncWeight, Boolean syncFood) {
        boolean steps()  { return syncSteps  == null || syncSteps; }
        boolean weight() { return syncWeight == null || syncWeight; }
        boolean food()   { return syncFood   == null || syncFood; }
    }

    /** Manual "sync now" — runs the same importers the scheduler uses. */
    @PostMapping("/sync/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Map<String, Object>> sync(@PathVariable Long userId) {
        return ResponseEntity.ok(service.syncNow(userId));
    }

    @DeleteMapping("/disconnect/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> disconnect(@PathVariable Long userId) {
        service.disconnect(userId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
