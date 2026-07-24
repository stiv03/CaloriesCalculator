package com.stoyandev.caloriecalculator.dto;

/**
 * Result of a barcode lookup. {@code source} tells the client where the match
 * came from: {@code "local"} (already in our DB — has an id, ready to log) or
 * {@code "external"} (an Open Food Facts suggestion — no id, user must confirm
 * and pick a type before it is saved).
 */
public record BarcodeLookupDTO(String source, ProductDTO product) {
}
