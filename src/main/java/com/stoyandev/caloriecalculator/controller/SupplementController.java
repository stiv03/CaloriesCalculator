package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.SupplementDTO;
import com.stoyandev.caloriecalculator.dto.SupplementIntakeDTO;
import com.stoyandev.caloriecalculator.service.SupplementService;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/supplements")
@AllArgsConstructor
public class SupplementController {

    private final SupplementService supplementService;

    public record SupplementRequest(String name, String dosage, String category) {}
    public record IntakeRequest(Long supplementId, LocalDate date, boolean taken) {}
    public record ReorderRequest(List<Long> orderedIds) {}

    @PutMapping("/{userId}/reorder")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> reorder(@PathVariable Long userId, @RequestBody ReorderRequest req) {
        supplementService.reorder(userId, req.orderedIds());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<SupplementDTO>> list(@PathVariable Long userId) {
        return ResponseEntity.ok(supplementService.listSupplements(userId));
    }

    @PostMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<SupplementDTO> create(@PathVariable Long userId, @RequestBody SupplementRequest req) {
        var dto = supplementService.createSupplement(userId, req.name(), req.dosage(), req.category());
        return new ResponseEntity<>(dto, HttpStatus.CREATED);
    }

    @PutMapping("/{userId}/{supplementId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<SupplementDTO> update(@PathVariable Long userId, @PathVariable Long supplementId,
                                                @RequestBody SupplementRequest req) {
        return ResponseEntity.ok(supplementService.updateSupplement(userId, supplementId, req.name(), req.dosage(), req.category()));
    }

    @DeleteMapping("/{userId}/{supplementId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> delete(@PathVariable Long userId, @PathVariable Long supplementId) {
        supplementService.deleteSupplement(userId, supplementId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/intakes")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<SupplementIntakeDTO>> listIntakes(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(supplementService.listIntakes(userId, from, to));
    }

    @PutMapping("/{userId}/intakes")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<SupplementIntakeDTO> setIntake(@PathVariable Long userId,
                                                         @RequestBody IntakeRequest req) {
        var dto = supplementService.setIntake(userId, req.supplementId(), req.date(), req.taken());
        return ResponseEntity.ok(dto);
    }
}
