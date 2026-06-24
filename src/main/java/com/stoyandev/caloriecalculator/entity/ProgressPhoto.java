package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "progress_photo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProgressPhoto {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    /** Google Drive file ID — the only piece of the actual image we store. */
    @Column(name = "drive_file_id", nullable = false, length = 128)
    private String driveFileId;

    @Column(nullable = false)
    private LocalDate date;

    /** Optional snapshot of the user's weight at the time of the photo. */
    @Column
    private Double weight;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
