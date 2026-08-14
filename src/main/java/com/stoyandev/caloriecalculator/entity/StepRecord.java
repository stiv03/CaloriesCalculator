package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Daily step count imported from Google Health. One row per (user, day);
 * imports overwrite the day's total (Google reports steps as intra-day
 * intervals which the importer sums per calendar day).
 */
@Entity
@Table(
    name = "step_record",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_step_record_user_date",
        columnNames = {"user_id", "record_date"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StepRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "record_date", nullable = false)
    private LocalDate date;

    @Column(name = "steps", nullable = false)
    private int steps;
}
