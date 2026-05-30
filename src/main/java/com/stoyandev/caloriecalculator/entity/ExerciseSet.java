package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "workout_set")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ExerciseSet {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_exercise_id", nullable = false)
    private Exercise workoutExercise;

    @Column(name = "set_index", nullable = false)
    private int setIndex;
    @Column(nullable = false)
    private double weight;

    @Column(nullable = false)
    private int reps;
}
