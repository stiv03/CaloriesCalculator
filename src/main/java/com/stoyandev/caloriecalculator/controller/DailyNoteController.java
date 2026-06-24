package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.entity.DailyNote;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.DailyNoteRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notes")
@AllArgsConstructor
public class DailyNoteController {

    private final DailyNoteRepository noteRepository;
    private final UserRepository userRepository;

    @GetMapping("/{userId}/all")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<Map<String, String>>> getAllNotes(@PathVariable Long userId) {
        List<Map<String, String>> notes = noteRepository
                .findAllByUserIdOrderByDateDesc(userId)
                .stream()
                .map(n -> Map.of("date", n.getDate().toString(), "content", n.getContent()))
                .toList();
        return ResponseEntity.ok(notes);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Map<String, String>> getNote(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String content = noteRepository.findByUserIdAndDate(userId, date)
                .map(DailyNote::getContent)
                .orElse("");
        return ResponseEntity.ok(Map.of("content", content));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> saveNote(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Map<String, String> body) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        DailyNote note = noteRepository.findByUserIdAndDate(userId, date)
                .orElse(DailyNote.builder().user(user).date(date).build());
        note.setContent(body.getOrDefault("content", ""));
        noteRepository.save(note);
        return ResponseEntity.ok().build();
    }
}
