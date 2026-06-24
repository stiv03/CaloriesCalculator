package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meal_template_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MealTemplateItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private MealTemplate template;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private Integer grams;

    @Column
    private Double caloriesPer100Grams;
}
