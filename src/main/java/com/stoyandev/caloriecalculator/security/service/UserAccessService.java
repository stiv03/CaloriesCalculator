package com.stoyandev.caloriecalculator.security.service;

import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
public class UserAccessService {

    private final UserRepository userRepository;

    public boolean hasAccess(final Long userId) {
        final var currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        final var authenticatedUser = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return currentUsername.equals(authenticatedUser.getUsername());
    }
}