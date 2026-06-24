package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "supplement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Supplement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "name", nullable = false)
    private String name;

    /** Free-text dosage like "5000 IU" or "5g". Optional. */
    @Column(name = "dosage")
    private String dosage;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
