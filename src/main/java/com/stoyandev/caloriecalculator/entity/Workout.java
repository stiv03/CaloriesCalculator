package com.stoyandev.caloriecalculator.entity;

import com.stoyandev.caloriecalculator.entity.enums.ExerciseType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Workout {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(name = "workout_type", nullable = false)
    private ExerciseType exerciseType;

    @Column
    private String label;

    @Column(name = "template_id")
    private Long templateId;

    @Column
    private String notes;

    @Column(name = "rest_day")
    private Boolean restDay;

    public boolean isRestDay() {
        return Boolean.TRUE.equals(restDay);
    }

    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Exercise> exercises = new ArrayList<>();
}
