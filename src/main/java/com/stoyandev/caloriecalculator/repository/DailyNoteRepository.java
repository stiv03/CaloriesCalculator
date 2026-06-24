package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.DailyNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyNoteRepository extends JpaRepository<DailyNote, Long> {
    Optional<DailyNote> findByUserIdAndDate(Long userId, LocalDate date);
    List<DailyNote> findAllByUserIdOrderByDateDesc(Long userId);
}
