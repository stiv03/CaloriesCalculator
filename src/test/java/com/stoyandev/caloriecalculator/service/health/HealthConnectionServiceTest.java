package com.stoyandev.caloriecalculator.service.health;

import com.stoyandev.caloriecalculator.entity.GoogleHealthConnection;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The per-user sync preferences gate which data types run during a sync.
 * {@link HealthConnectionService#isEnabled} is the single decision point used
 * both for the step/weight importers and the food (nutrition) export.
 */
class HealthConnectionServiceTest {

    private static GoogleHealthConnection conn(boolean steps, boolean weight, boolean food) {
        return GoogleHealthConnection.builder()
                .syncSteps(steps).syncWeight(weight).syncFood(food)
                .build();
    }

    @Test
    void allEnabledByDefault() {
        // The builder defaults (@Builder.Default) leave every type on.
        GoogleHealthConnection c = GoogleHealthConnection.builder().build();
        assertThat(HealthConnectionService.isEnabled(c, "steps")).isTrue();
        assertThat(HealthConnectionService.isEnabled(c, "weight")).isTrue();
        assertThat(HealthConnectionService.isEnabled(c, "food")).isTrue();
    }

    @Test
    void gatesEachTypeIndependently() {
        GoogleHealthConnection c = conn(false, true, false);
        assertThat(HealthConnectionService.isEnabled(c, "steps")).isFalse();
        assertThat(HealthConnectionService.isEnabled(c, "weight")).isTrue();
        assertThat(HealthConnectionService.isEnabled(c, "food")).isFalse();
    }

    @Test
    void allDisabled() {
        GoogleHealthConnection c = conn(false, false, false);
        assertThat(HealthConnectionService.isEnabled(c, "steps")).isFalse();
        assertThat(HealthConnectionService.isEnabled(c, "weight")).isFalse();
        assertThat(HealthConnectionService.isEnabled(c, "food")).isFalse();
    }

    @Test
    void unknownTypeDefaultsEnabled() {
        // A newly-added importer with no matching flag should still run rather
        // than being silently dropped.
        GoogleHealthConnection c = conn(false, false, false);
        assertThat(HealthConnectionService.isEnabled(c, "heart-rate")).isTrue();
    }

    @Test
    void mintAccessTokenThrowsWhenNotConnected() {
        var repo = new com.stoyandev.caloriecalculator.repository.GoogleHealthConnectionRepository() {
            public java.util.Optional<GoogleHealthConnection> findByUserId(Long userId) { return java.util.Optional.empty(); }
            // remaining JpaRepository methods unused in this test:
            public <S extends GoogleHealthConnection> S save(S e) { return e; }
            public java.util.Optional<GoogleHealthConnection> findById(Long id) { return java.util.Optional.empty(); }
            public boolean existsById(Long id) { return false; }
            public java.util.List<GoogleHealthConnection> findAll() { return java.util.List.of(); }
            public java.util.List<GoogleHealthConnection> findAllById(Iterable<Long> ids) { return java.util.List.of(); }
            public long count() { return 0; }
            public void deleteById(Long id) {}
            public void delete(GoogleHealthConnection e) {}
            public void deleteAllById(Iterable<? extends Long> ids) {}
            public void deleteAll(Iterable<? extends GoogleHealthConnection> e) {}
            public void deleteAll() {}
            public void deleteByUserId(Long userId) {}
            public <S extends GoogleHealthConnection> java.util.List<S> saveAll(Iterable<S> e) { return java.util.List.of(); }
            public void flush() {}
            public <S extends GoogleHealthConnection> S saveAndFlush(S e) { return e; }
            public <S extends GoogleHealthConnection> java.util.List<S> saveAllAndFlush(Iterable<S> e) { return java.util.List.of(); }
            public void deleteAllInBatch(Iterable<GoogleHealthConnection> e) {}
            public void deleteAllByIdInBatch(Iterable<Long> ids) {}
            public void deleteAllInBatch() {}
            public GoogleHealthConnection getOne(Long id) { return null; }
            public GoogleHealthConnection getById(Long id) { return null; }
            public GoogleHealthConnection getReferenceById(Long id) { return null; }
            public <S extends GoogleHealthConnection> java.util.Optional<S> findOne(org.springframework.data.domain.Example<S> ex) { return java.util.Optional.empty(); }
            public <S extends GoogleHealthConnection> java.util.List<S> findAll(org.springframework.data.domain.Example<S> ex) { return java.util.List.of(); }
            public <S extends GoogleHealthConnection> java.util.List<S> findAll(org.springframework.data.domain.Example<S> ex, org.springframework.data.domain.Sort sort) { return java.util.List.of(); }
            public <S extends GoogleHealthConnection> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> ex, org.springframework.data.domain.Pageable p) { return org.springframework.data.domain.Page.empty(); }
            public <S extends GoogleHealthConnection> long count(org.springframework.data.domain.Example<S> ex) { return 0; }
            public <S extends GoogleHealthConnection> boolean exists(org.springframework.data.domain.Example<S> ex) { return false; }
            public java.util.List<GoogleHealthConnection> findAll(org.springframework.data.domain.Sort sort) { return java.util.List.of(); }
            public org.springframework.data.domain.Page<GoogleHealthConnection> findAll(org.springframework.data.domain.Pageable p) { return org.springframework.data.domain.Page.empty(); }
            public <S extends GoogleHealthConnection, R> R findBy(org.springframework.data.domain.Example<S> ex, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> q) { return null; }
        };
        var svc = new HealthConnectionService(null, repo, null, java.util.List.of(), null, null, null, null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> svc.mintAccessToken(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not_connected");
    }
}
