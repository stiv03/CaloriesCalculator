package com.stoyandev.caloriecalculator.service.health;

import com.stoyandev.caloriecalculator.dto.ActivityDTO;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class ActivityServiceTest {

    private static final ZoneId ZONE = ZoneId.of("UTC");
    private static final LocalDate DAY = LocalDate.of(2026, 8, 14);

    @Test
    void parsesWeightliftingDurationAndHr() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:52:00Z"}}}
            ]}""";
        String hr = """
            {"dataPoints":[
              {"heartRate":{"beatsPerMinute":96,"sampleTime":{"physicalTime":"2026-08-14T18:05:00Z"}}},
              {"heartRate":{"beatsPerMinute":128,"sampleTime":{"physicalTime":"2026-08-14T18:20:00Z"}}},
              {"heartRate":{"beatsPerMinute":171,"sampleTime":{"physicalTime":"2026-08-14T18:40:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, hr, ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.exerciseType()).isEqualTo("WEIGHTLIFTING");
        assertThat(dto.durationMin()).isEqualTo(52);
        assertThat(dto.avgHr()).isEqualTo(132); // round((96+128+171)/3)
        assertThat(dto.minHr()).isEqualTo(96);
        assertThat(dto.maxHr()).isEqualTo(171);
    }

    @Test
    void ignoresNonWeightliftingSessions() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"RUNNING",
                "interval":{"startTime":"2026-08-14T07:00:00Z","endTime":"2026-08-14T07:30:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isFalse();
        // The reason surfaces which types Google DID return, so a "no workout"
        // result on the client still carries evidence of why.
        assertThat(dto.reason()).isEqualTo("no_weightlifting; saw=[RUNNING]");
    }

    @Test
    void emptyExerciseJsonReportsNoPoints() {
        ActivityDTO dto = ActivityService.parse("{}", "{}", ZONE, DAY);
        assertThat(dto.found()).isFalse();
        assertThat(dto.reason()).isEqualTo("no_exercise_points");
    }

    @Test
    void mergesMultipleWeightliftingSessionsSameDay() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T09:00:00Z","endTime":"2026-08-14T09:30:00Z"}}},
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:20:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.durationMin()).isEqualTo(50); // 30 + 20
    }

    @Test
    void foundButNoHrLeavesHrNull() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:40:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.avgHr()).isNull();
        assertThat(dto.minHr()).isNull();
        assertThat(dto.maxHr()).isNull();
    }

    @Test
    void heartRateOutsideExerciseWindowIsExcluded() {
        // The exercise ran 18:00-18:30. Samples before/after that window (from other
        // parts of the day) must not pollute the workout's HR stats — the window
        // filter reads sampleTime.physicalTime, so it only works if that field parses.
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:30:00Z"}}}
            ]}""";
        String hr = """
            {"dataPoints":[
              {"heartRate":{"beatsPerMinute":60,"sampleTime":{"physicalTime":"2026-08-14T08:00:00Z"}}},
              {"heartRate":{"beatsPerMinute":140,"sampleTime":{"physicalTime":"2026-08-14T18:15:00Z"}}},
              {"heartRate":{"beatsPerMinute":55,"sampleTime":{"physicalTime":"2026-08-14T22:00:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, hr, ZONE, DAY);
        assertThat(dto.found()).isTrue();
        // Only the 18:15 sample (140) is inside the window; the 08:00 and 22:00 are out.
        assertThat(dto.avgHr()).isEqualTo(140);
        assertThat(dto.minHr()).isEqualTo(140);
        assertThat(dto.maxHr()).isEqualTo(140);
    }
}
