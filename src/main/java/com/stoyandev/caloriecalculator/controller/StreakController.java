package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.StreaksDTO;
import com.stoyandev.caloriecalculator.service.StreakService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/streaks")
@AllArgsConstructor
public class StreakController {

    private final StreakService streakService;

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<StreaksDTO> getStreaks(@PathVariable Long userId) {
        return ResponseEntity.ok(streakService.getStreaks(userId));
    }
}
