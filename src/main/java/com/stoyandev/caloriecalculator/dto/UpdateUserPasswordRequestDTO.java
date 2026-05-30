package com.stoyandev.caloriecalculator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserPasswordRequestDTO(
        @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
        String newPassword) {
}
