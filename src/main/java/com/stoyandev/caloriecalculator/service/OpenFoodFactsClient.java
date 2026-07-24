package com.stoyandev.caloriecalculator.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.stoyandev.caloriecalculator.dto.ProductDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Optional;

/**
 * Looks up a product by barcode against the public Open Food Facts API.
 *
 * <p>Isolated behind a single method so the external data source can be swapped
 * (e.g. to FatSecret) without touching callers. Results are <em>suggestions</em>
 * only — never persisted here; the caller decides whether to save. Returned
 * {@link ProductDTO}s therefore have a {@code null} id and {@code null}
 * productType (OFF has no reliable mapping to our ProductType enum, so the user
 * picks it).
 *
 * <p>All failures (network, timeout, OFF downtime, missing/partial data) resolve
 * to {@link Optional#empty()} rather than propagating — a barcode miss must never
 * break the request; the frontend falls back to manual entry.
 */
@Service
public class OpenFoodFactsClient {

    private static final Logger log = LoggerFactory.getLogger(OpenFoodFactsClient.class);

    // OFF asks callers to identify themselves via User-Agent so they can reach out about issues.
    private static final String USER_AGENT =
            "CaloriesCalculator/1.0 (https://github.com/stiv03/CaloriesCalculator)";
    private static final String BASE_URL = "https://world.openfoodfacts.org";

    private final RestClient restClient;

    public OpenFoodFactsClient() {
        // Bounded timeouts so a slow/unresponsive OFF can't hang the user's request.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(3).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(5).toMillis());

        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", USER_AGENT)
                .requestFactory(factory)
                .build();
    }

    /**
     * Fetch a product by its EAN/UPC barcode.
     *
     * @return a suggestion DTO (id/type null) if OFF has the product with at least
     *         a name and calorie value; empty on any miss or error.
     */
    public Optional<ProductDTO> lookupByBarcode(String barcode) {
        if (barcode == null || barcode.isBlank()) {
            return Optional.empty();
        }
        try {
            OffResponse response = restClient.get()
                    .uri("/api/v2/product/{code}?fields=code,product_name,nutriments", barcode.trim())
                    .retrieve()
                    .body(OffResponse.class);

            if (response == null || response.status() != 1 || response.product() == null) {
                return Optional.empty();
            }
            return toProductDTO(response.product(), barcode.trim());
        } catch (Exception e) {
            // OFF down, timeout, 404, or malformed body — treat all as "not found".
            log.info("Open Food Facts lookup failed for barcode {}: {}", barcode, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<ProductDTO> toProductDTO(OffProduct p, String barcode) {
        String name = p.productName();
        if (name == null || name.isBlank()) {
            return Optional.empty(); // unusable without a name
        }
        OffNutriments n = p.nutriments();
        if (n == null || n.energyKcal100g() == null) {
            return Optional.empty(); // unusable without calories
        }
        return Optional.of(new ProductDTO(
                name.trim(),
                null,                          // not persisted → no id
                null,                          // user picks ProductType
                n.energyKcal100g(),
                orZero(n.proteins100g()),
                orZero(n.fat100g()),
                orZero(n.carbohydrates100g()),
                barcode
        ));
    }

    private static double orZero(Double v) {
        return v == null ? 0.0 : v;
    }

    // --- OFF JSON shapes (only the fields we requested) ---

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OffResponse(int status, OffProduct product) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OffProduct(
            @JsonProperty("product_name") String productName,
            OffNutriments nutriments) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OffNutriments(
            @JsonProperty("energy-kcal_100g") Double energyKcal100g,
            @JsonProperty("proteins_100g") Double proteins100g,
            @JsonProperty("fat_100g") Double fat100g,
            @JsonProperty("carbohydrates_100g") Double carbohydrates100g) {
    }
}
