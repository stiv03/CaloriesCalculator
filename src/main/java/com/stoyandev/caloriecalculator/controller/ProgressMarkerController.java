package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.ProgressMarkerDTO;
import com.stoyandev.caloriecalculator.dto.ProgressMarkerRequestDTO;
import com.stoyandev.caloriecalculator.entity.ProgressMarker;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.ProgressMarkerRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/progress-markers")
@AllArgsConstructor
public class ProgressMarkerController {

    private final ProgressMarkerRepository markerRepository;
    private final UserRepository userRepository;

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<ProgressMarkerDTO>> list(@PathVariable Long userId) {
        return ResponseEntity.ok(markerRepository.findByUserIdOrderByDateAsc(userId).stream()
                .map(this::toDTO).toList());
    }

    private static final java.util.regex.Pattern HEX_COLOR =
            java.util.regex.Pattern.compile("^#[0-9a-fA-F]{6}$");

    @PostMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<ProgressMarkerDTO> create(
            @PathVariable Long userId,
            @RequestBody ProgressMarkerRequestDTO req) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String label = req.label() != null ? req.label().trim() : "";
        if (label.isEmpty()) label = "marker";
        if (label.length() > 64) label = label.substring(0, 64);
        String color = req.color();
        if (color != null && !HEX_COLOR.matcher(color).matches()) color = null;
        ProgressMarker m = ProgressMarker.builder()
                .user(user)
                .date(req.date() != null ? req.date() : LocalDate.now())
                .label(label)
                .color(color)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(markerRepository.save(m)));
    }

    @DeleteMapping("/{userId}/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> delete(@PathVariable Long userId, @PathVariable Long id) {
        ProgressMarker m = markerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Marker not found"));
        markerRepository.delete(m);
        return ResponseEntity.noContent().build();
    }

    private ProgressMarkerDTO toDTO(ProgressMarker m) {
        return new ProgressMarkerDTO(m.getId(), m.getDate(), m.getLabel(), m.getColor());
    }
}
