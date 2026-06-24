package com.stoyandev.caloriecalculator.entity;

import com.stoyandev.caloriecalculator.entity.enums.ExerciseType;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_template")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkoutTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExerciseType exerciseType;

    @Column
    private String label; // optional e.g. "Legs 1", "Legs 2"

    @Column(nullable = false)
    private int sortOrder;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private List<WorkoutTemplateExercise> exercises = new ArrayList<>();
}
