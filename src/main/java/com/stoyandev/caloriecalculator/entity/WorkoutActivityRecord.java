package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A Google Health WEIGHTLIFTING session persisted on-demand when the user
 * views a workout day in History (and has workout sync enabled). One row per
 * (user, day); re-viewing a day upserts. Read-through cache for {@code ActivityService}.
 */
@Entity
@Table(
    name = "workout_activity_record",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_workout_activity_user_date",
        columnNames = {"user_id", "record_date"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutActivityRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "record_date", nullable = false)
    private LocalDate date;

    @Column(name = "exercise_type", nullable = false)
    private String exerciseType;

    @Column(name = "duration_min")
    private Integer durationMin;

    @Column(name = "avg_hr")
    private Integer avgHr;

    @Column(name = "min_hr")
    private Integer minHr;

    @Column(name = "max_hr")
    private Integer maxHr;

    /** HR zones serialized as JSON (list of {name, minutes}); empty/null when none. */
    @Column(name = "zones_json", length = 2048)
    private String zonesJson;

    /** Active zone minutes for the session (Google's activeZoneMinutes); null when absent. */
    @Column(name = "active_zone_minutes")
    private Integer activeZoneMinutes;

    /**
     * HR-over-time trace serialized as JSON (list of {t, bpm}). A 90-min session
     * yields hundreds of samples, so this needs TEXT rather than a bounded column.
     */
    @Column(name = "hr_series_json", columnDefinition = "text")
    private String hrSeriesJson;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;
}
