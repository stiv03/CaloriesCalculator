package com.stoyandev.caloriecalculator.entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DaySummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "date", nullable = false)
    private LocalDateTime consumedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Max(value = 350, message = "Invalid data")
    @Positive
    @Column(name = "today_weight", length = 3, nullable = false)
    private double todayWeight;

    @Positive
    @Column(name = "today_calories", length = 3, nullable = false)
    private double todayCalories;

    @Positive
    @Column(name = "today_protein", length = 3, nullable = false)
    private double todayProtein;

    @Positive
    @Column(name = "today_fat", length = 3, nullable = false)
    private double todayFat;

    @Positive
    @Column(name = "today_carbs", length = 3, nullable = false)
    private double todayCarbs;







}
