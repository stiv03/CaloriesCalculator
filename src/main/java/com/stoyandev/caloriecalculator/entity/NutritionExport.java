package com.stoyandev.caloriecalculator.entity;

import com.stoyandev.caloriecalculator.entity.enums.MealType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Tracks a meal (one user/day/mealType) that has been written to Google Health,
 * so repeated syncs don't create duplicate nutrition entries. Stores the Google
 * dataPoint resource name so the entry can be updated or re-sent if the meal's
 * macros change.
 */
@Entity
@Table(
    name = "nutrition_export",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_nutrition_export_user_date_meal",
        columnNames = {"user_id", "export_date", "meal_type"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionExport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "export_date", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    private MealType mealType;

    /** Google Health dataPoint resource name (e.g. users/.../dataPoints/123). */
    @Column(name = "remote_id", length = 512)
    private String remoteId;

    /**
     * Hash/signature of the exported macros. If the meal changes, the signature
     * differs and we re-export; if unchanged, we skip.
     */
    @Column(name = "content_sig", length = 128)
    private String contentSig;

    @Column(name = "exported_at", nullable = false)
    private Instant exportedAt;
}
