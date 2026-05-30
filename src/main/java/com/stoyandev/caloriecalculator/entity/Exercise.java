package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_exercise")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Exercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_id", nullable = false)
    private Workout workout;

    @Column(name = "exercise_name", length = 100, nullable = false)
    private String exerciseName;

    @Column(nullable = false)
    private int position;

    @Column
    private String notes;

    @OneToMany(mappedBy = "workoutExercise", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("setIndex ASC")
    private List<ExerciseSet> sets = new ArrayList<>();
}
