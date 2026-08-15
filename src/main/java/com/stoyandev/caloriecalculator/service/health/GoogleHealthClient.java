package com.stoyandev.caloriecalculator.service.health;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Google OAuth 2.0 (server-side / authorization-code flow) for the Health API.
 * Builds the consent URL, exchanges the code for tokens (incl. a refresh token
 * via access_type=offline), and refreshes access tokens on demand. Read-only
 * health-metrics scope.
 */
@Component
public class GoogleHealthClient {

    // Read weight/body metrics + steps/activity + sleep, write nutrition. Space-delimited.
    public static final String SCOPE =
            "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly"
            + " https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly"
            + " https://www.googleapis.com/auth/googlehealth.sleep.readonly"
            + " https://www.googleapis.com/auth/googlehealth.nutrition.writeonly";
    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    static final String HEALTH_BASE = "https://health.googleapis.com/v4";

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final RestClient rest = RestClient.create();

    public GoogleHealthClient(
            @Value("${google.health.client-id}") String clientId,
            @Value("${google.health.client-secret}") String clientSecret,
            @Value("${google.health.redirect-uri}") String redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    /** Consent URL. `state` carries our opaque per-request token (CSRF + user link). */
    public String buildAuthUrl(String state) {
        return UriComponentsBuilder.fromHttpUrl(AUTH_URL)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", URLEncoder.encode(SCOPE, StandardCharsets.UTF_8))
                .queryParam("access_type", "offline")   // → refresh token
                .queryParam("prompt", "consent")        // force refresh token even on re-consent
                .queryParam("include_granted_scopes", "false")
                .queryParam("state", state)
                .build(true)
                .toUriString();
    }

    /** Exchange an authorization code for tokens (includes refresh_token). */
    public TokenResponse exchangeCode(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");
        return rest.post().uri(TOKEN_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(TokenResponse.class);
    }

    /** Mint a fresh access token from a stored refresh token. */
    public TokenResponse refresh(String refreshToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("refresh_token", refreshToken);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("grant_type", "refresh_token");
        return rest.post().uri(TOKEN_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(TokenResponse.class);
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("expires_in") Integer expiresIn,
            @JsonProperty("scope") String scope,
            @JsonProperty("token_type") String tokenType) {
    }
}
