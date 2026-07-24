package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.WaterRecordDTO;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.WaterRecord;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.WaterRecordRepository;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/water")
@AllArgsConstructor
public class WaterController {

    private final WaterRecordRepository waterRepository;
    private final UserRepository userRepository;

    /** Water logged on a given day; 0 if nothing recorded yet. */
    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WaterRecordDTO> getWater(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        int amount = waterRepository.findByUserIdAndDate(userId, date)
                .map(WaterRecord::getAmountMl)
                .orElse(0);
        return ResponseEntity.ok(new WaterRecordDTO(date, amount));
    }

    /**
     * Set the day's total water (absolute, not incremental) — idempotent, so a
     * retried request can't double-count. Negative values are clamped to 0.
     */
    @PutMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<WaterRecordDTO> setWater(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Map<String, Integer> body) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        int amount = Math.max(0, body.getOrDefault("amountMl", 0));
        WaterRecord record = waterRepository.findByUserIdAndDate(userId, date)
                .orElse(WaterRecord.builder().user(user).date(date).build());
        record.setAmountMl(amount);
        waterRepository.save(record);
        return ResponseEntity.ok(new WaterRecordDTO(date, amount));
    }
}
