package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Max(value = 100, message = "User can not be more than 100 years old")
    @Positive
    @Column(name = "age", length = 3, nullable = false)
    private int age;

    @Max(value = 350, message = "Invalid data")
    @Positive
    @Column(name = "weight", length = 3, nullable = false)
    private double weight;

    @Max(value = 250, message = "Invalid data")
    @Positive
    @Column(name = "height", length = 3, nullable = false)
    private int height;

}