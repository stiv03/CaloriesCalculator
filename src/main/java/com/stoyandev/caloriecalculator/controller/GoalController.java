package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.GoalDTO;
import com.stoyandev.caloriecalculator.service.implementations.GoalServiceImp;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@AllArgsConstructor
public class GoalController {

    private GoalServiceImp goalService;

    @PostMapping("/user/{userId}/setGoal")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<GoalDTO> setUserGoal(@PathVariable Long userId, @RequestBody GoalDTO goal) {
        GoalDTO savedGoal = goalService.setUserGoal(userId, goal);
        return ResponseEntity.ok(savedGoal);
    }

    @GetMapping("/user/{userId}/getGoal")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<GoalDTO> getUserGoal(@PathVariable Long userId) {
        GoalDTO goal = goalService.getUserGoal(userId);
        return ResponseEntity.ok(goal);
    }

    @PostMapping("/user/{userId}/autoSetGoal")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<GoalDTO> autoUserGoal(@PathVariable Long userId) {
        GoalDTO savedGoal = goalService.autoSetGoal(userId);
        return ResponseEntity.ok(savedGoal);
    }
}
