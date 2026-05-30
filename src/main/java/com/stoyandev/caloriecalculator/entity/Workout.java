package com.stoyandev.caloriecalculator.entity;


import com.stoyandev.caloriecalculator.entity.enums.ExerciseType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Workout {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime date;

    @Enumerated(EnumType.STRING)
    @Column(name = "workout_type", nullable = false)
    private ExerciseType exerciseType;

    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Exercise> exercises = new ArrayList<>();
}
