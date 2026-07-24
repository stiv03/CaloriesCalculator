package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Water intake for one user on one day. Exactly one row per (user, day):
 * updates overwrite the day's total rather than appending, so the value is the
 * running total of water logged that day.
 */
@Entity
@Table(
    name = "water_record",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_water_record_user_date",
        columnNames = {"user_id", "record_date"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaterRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "record_date", nullable = false)
    private LocalDate date;

    @Column(name = "amount_ml", nullable = false)
    private int amountMl;
}
