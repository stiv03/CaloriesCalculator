package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
    name = "supplement_intake",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_supplement_intake_supplement_date",
        columnNames = {"supplement_id", "intake_date"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SupplementIntake {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplement_id", nullable = false)
    private Supplement supplement;

    @Column(name = "intake_date", nullable = false)
    private LocalDate date;

    @Column(name = "taken", nullable = false)
    private boolean taken;
}
