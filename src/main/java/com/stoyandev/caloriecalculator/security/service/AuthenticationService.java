package com.stoyandev.caloriecalculator.security.service;

import com.stoyandev.caloriecalculator.entity.Goal;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.enums.Activity;
import com.stoyandev.caloriecalculator.entity.enums.Status;
import com.stoyandev.caloriecalculator.entity.enums.UserType;
import com.stoyandev.caloriecalculator.repository.GoalRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.security.auth.AuthenticationResponse;
import com.stoyandev.caloriecalculator.security.auth.LoginRequest;
import com.stoyandev.caloriecalculator.security.auth.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final GoalRepository goalRepository;
    private final JwtService jwtService;


    public AuthenticationResponse register(RegisterRequest request) {
        // Build the new user from the registration request.
        var user = Users.builder()
                .name(request.getName())
                .age(request.getAge())
                .genderType(request.getGender())
                .weight(request.getWeight())
                .height(request.getHeight())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .userType(UserType.USER)
                .status(Status.MAINTAINING)
                .activity(Activity.NORMAL)
                .build();

        // Persist the user.
        repository.save(user);

        // Initialise the user's daily goal with zeros; it is filled in later
        // either manually (POST /setGoal) or via auto-calculation (POST /autoSetGoal).
        Goal goal = new Goal();
        goal.setUser(user);
        goal.setCalories(0);
        goal.setProtein(0.0);
        goal.setCarbs(0.0);
        goal.setFat(0.0);
        goalRepository.save(goal);

        var jwtToken = jwtService.generateToken(user);

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .userId(user.getId())
                .build();
    }


    public AuthenticationResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        var user = repository.findByUsername(request.getUsername())
                .orElseThrow();
        var jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder().token(jwtToken).userId(user.getId()).build();
    }
}
