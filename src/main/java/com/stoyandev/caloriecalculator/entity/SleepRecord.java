package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A night's sleep imported from Google Health. One row per (user, wake day):
 * a session is filed under the local calendar date its {@code endTime} falls
 * on, matching how sleep apps show "last night". Multiple sessions on one date
 * (e.g. naps) are merged.
 *
 * Per-stage minute totals are denormalised for the fast month rollup; the raw
 * ordered stage segments are kept as JSON ({@link #segments}) so the calendar
 * day view can draw a hypnogram timeline. Imports overwrite the day's row.
 */
@Entity
@Table(
    name = "sleep_record",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_sleep_record_user_date",
        columnNames = {"user_id", "record_date"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SleepRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    /** Calendar day the sleep ended (wake-up day). */
    @Column(name = "record_date", nullable = false)
    private LocalDate date;

    /** Time asleep = rem + deep + light (awake excluded, but stored below). */
    @Column(name = "total_minutes", nullable = false)
    private int totalMinutes;

    @Column(name = "rem_minutes", nullable = false)
    private int remMinutes;

    @Column(name = "deep_minutes", nullable = false)
    private int deepMinutes;

    @Column(name = "light_minutes", nullable = false)
    private int lightMinutes;

    @Column(name = "awake_minutes", nullable = false)
    private int awakeMinutes;

    /** Earliest start / latest end across merged sessions for the night. */
    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    /**
     * Raw ordered stage segments as a JSON array string:
     * {@code [{"start":"...","end":"...","type":"DEEP"}, ...]}.
     * Read back whole to render the hypnogram; empty/null when the session had
     * no stage detail.
     */
    @Column(name = "segments", columnDefinition = "text")
    private String segments;
}
