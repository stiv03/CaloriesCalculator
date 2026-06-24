package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workout_template_exercise")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkoutTemplateExercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private WorkoutTemplate template;

    @Column(nullable = false)
    private String exerciseName;

    @Column
    private String targetSetsReps;

    @Column(nullable = false)
    private int position;
}
