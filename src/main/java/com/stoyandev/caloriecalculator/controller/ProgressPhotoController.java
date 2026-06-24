package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.ProgressPhotoDTO;
import com.stoyandev.caloriecalculator.dto.ProgressPhotoRequestDTO;
import com.stoyandev.caloriecalculator.entity.ProgressPhoto;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.ProgressPhotoRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/progress-photos")
@AllArgsConstructor
public class ProgressPhotoController {

    private final ProgressPhotoRepository photoRepository;
    private final UserRepository userRepository;

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<List<ProgressPhotoDTO>> list(@PathVariable Long userId) {
        List<ProgressPhotoDTO> result = photoRepository.findByUserIdOrderByDateDescIdDesc(userId).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{userId}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<ProgressPhotoDTO> create(
            @PathVariable Long userId,
            @RequestBody ProgressPhotoRequestDTO req) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        ProgressPhoto p = ProgressPhoto.builder()
                .user(user)
                .driveFileId(req.driveFileId())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .weight(req.weight())
                .notes(req.notes())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(photoRepository.save(p)));
    }

    @DeleteMapping("/{userId}/{id}")
    @PreAuthorize("@userAccessService.hasAccess(#userId)")
    public ResponseEntity<Void> delete(@PathVariable Long userId, @PathVariable Long id) {
        ProgressPhoto p = photoRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        photoRepository.delete(p);
        return ResponseEntity.noContent().build();
    }

    private ProgressPhotoDTO toDTO(ProgressPhoto p) {
        return new ProgressPhotoDTO(p.getId(), p.getDriveFileId(), p.getDate(), p.getWeight(), p.getNotes());
    }
}
