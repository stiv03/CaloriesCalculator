package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
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

    @Column(name = "age", length = 3, nullable = false)
    private int age;

    @Column(name = "weight", length = 3, nullable = false)
    private double weight;

    @Column(name = "height", length = 3, nullable = false)
    private int height;

}