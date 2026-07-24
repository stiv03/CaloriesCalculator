package com.stoyandev.caloriecalculator.entity;

import com.stoyandev.caloriecalculator.entity.enums.ProductType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(indexes = @Index(name = "idx_product_barcode", columnList = "barcode"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "product type", nullable = false)
    private ProductType productType;

    @Column(name = "calories in 100 grams", length = 10, nullable = false)
    private double caloriesPer100Grams;

    @Column(name = "protein_per_100g", length = 10, nullable = false)
    private double proteinPer100Grams;

    @Column(name = "fats_per_100g", length = 10, nullable = false)
    private double fatPer100Grams;

    @Column(name = "carbs_per_100g", length = 10, nullable = false)
    private double carbsPer100Grams;

    // EAN/UPC barcode. Nullable: existing and manually-entered products may have none.
    // Indexed for fast lookup by scan.
    @Column(name = "barcode", length = 32)
    private String barcode;


}
