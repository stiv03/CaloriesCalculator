package com.stoyandev.caloriecalculator.security.service;

import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
public class UserAccessService {

    private final UserRepository userRepository;
    private final MealsRepository mealsRepository;

    public boolean hasAccess(final Long userId) {
        final var currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        final var authenticatedUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return currentUsername.equals(authenticatedUser.getUsername());
    }

    /**
     * Authorise an action that targets a specific meal. The meal must belong to the
     * currently-authenticated user. Used by endpoints that take {mealId} in the path
     * but no {userId}, where {@link #hasAccess(Long)} cannot help.
     */
    public boolean hasAccessToMeal(final Long mealId) {
        final var currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        final var meal = mealsRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found: " + mealId));
        return currentUsername.equals(meal.getUser().getUsername());
    }
}
