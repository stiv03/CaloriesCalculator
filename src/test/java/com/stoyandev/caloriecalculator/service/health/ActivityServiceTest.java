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
    void ignoresNonStrengthSessions() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"RUNNING",
                "interval":{"startTime":"2026-08-14T07:00:00Z","endTime":"2026-08-14T07:30:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isFalse();
        // Pure cardio is not enriched; the reason surfaces which types Google DID
        // return, so a "no workout" result on the client still carries evidence of why.
        assertThat(dto.reason()).isEqualTo("no_strength_session; saw=[RUNNING]");
    }

    @Test
    void matchesGenericWorkoutTypeAndPreservesIt() {
        // Fitbit exports a session its UI calls "Weightlifting" as the generic
        // WORKOUT type (never WEIGHTLIFTING), so the allow-list must accept it and
        // the DTO must report the actual type Google returned, not a hardcoded label.
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WORKOUT",
                "interval":{"startTime":"2026-08-14T12:15:00Z","endTime":"2026-08-14T13:50:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.exerciseType()).isEqualTo("WORKOUT");
        assertThat(dto.durationMin()).isEqualTo(95);
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

    @Test
    void buildsHrSeriesFromInWindowSamplesSortedByTime() {
        // The trace is every in-window sample, ordered by time — even if Google
        // returns them out of order. Out-of-window samples are dropped, matching
        // the min/max/avg window logic.
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:30:00Z"}}}
            ]}""";
        String hr = """
            {"dataPoints":[
              {"heartRate":{"beatsPerMinute":150,"sampleTime":{"physicalTime":"2026-08-14T18:20:00Z"}}},
              {"heartRate":{"beatsPerMinute":110,"sampleTime":{"physicalTime":"2026-08-14T18:05:00Z"}}},
              {"heartRate":{"beatsPerMinute":99,"sampleTime":{"physicalTime":"2026-08-14T23:00:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, hr, ZONE, DAY);
        assertThat(dto.hrSeries()).hasSize(2);
        assertThat(dto.hrSeries().get(0).bpm()).isEqualTo(110); // 18:05 first
        assertThat(dto.hrSeries().get(1).bpm()).isEqualTo(150); // 18:20 second
        assertThat(dto.hrSeries().get(0).t()).isLessThan(dto.hrSeries().get(1).t());
    }

    @Test
    void pullsZonesAvgHrAndActiveZoneMinutesFromMetricsSummary() {
        // Google embeds a session rollup on the exercise point: avg HR, per-zone
        // durations (google-duration strings), and active zone minutes. These need
        // no HR samples at all — they ride on the exercise fetch.
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WORKOUT",
                "interval":{"startTime":"2026-08-14T12:00:00Z","endTime":"2026-08-14T13:34:00Z"},
                "metricsSummary":{
                  "averageHeartRateBeatsPerMinute":118,
                  "activeZoneMinutes":47,
                  "heartRateZoneDurations":{
                    "lightTime":"1800s","moderateTime":"2400s","vigorousTime":"600s","peakTime":"0s"
                  }}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.avgHr()).isEqualTo(118); // from summary, no samples needed
        assertThat(dto.activeZoneMinutes()).isEqualTo(47);
        assertThat(dto.zones()).extracting(ActivityDTO.Zone::name)
                .containsExactly("Light", "Moderate", "Vigorous"); // Peak 0s is dropped
        assertThat(dto.zones()).extracting(ActivityDTO.Zone::minutes)
                .containsExactly(30, 40, 10); // 1800s=30m, 2400s=40m, 600s=10m
    }

    @Test
    void summaryAvgHrTakesPrecedenceOverSampleMean() {
        // When Google gives both a summary avg and raw samples, trust Google's
        // session number; samples still drive min/max and the trace.
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:30:00Z"},
                "metricsSummary":{"averageHeartRateBeatsPerMinute":125}}}
            ]}""";
        String hr = """
            {"dataPoints":[
              {"heartRate":{"beatsPerMinute":100,"sampleTime":{"physicalTime":"2026-08-14T18:10:00Z"}}},
              {"heartRate":{"beatsPerMinute":180,"sampleTime":{"physicalTime":"2026-08-14T18:20:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, hr, ZONE, DAY);
        assertThat(dto.avgHr()).isEqualTo(125);  // summary, not (100+180)/2=140
        assertThat(dto.minHr()).isEqualTo(100);  // still from samples
        assertThat(dto.maxHr()).isEqualTo(180);
    }

    @Test
    void noMetricsSummaryLeavesZonesEmptyAndAzmNull() {
        String exercise = """
            {"dataPoints":[
              {"exercise":{"exerciseType":"WEIGHTLIFTING",
                "interval":{"startTime":"2026-08-14T18:00:00Z","endTime":"2026-08-14T18:40:00Z"}}}
            ]}""";
        ActivityDTO dto = ActivityService.parse(exercise, "{}", ZONE, DAY);
        assertThat(dto.found()).isTrue();
        assertThat(dto.zones()).isEmpty();
        assertThat(dto.activeZoneMinutes()).isNull();
    }
}
