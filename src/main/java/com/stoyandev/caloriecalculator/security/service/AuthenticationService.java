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



    public AuthenticationResponse register(RegisterRequest request) {
        // Създаваме нов потребител
        var user = Users.builder()
                .name(request.getName())
                .age(request.getAge())
                .weight(request.getWeight())
                .height(request.getHeight())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .userType(UserType.USER)
                .status(Status.MAINTAINING)
                .activity(Activity.NORMAL)
                .build();

        // Запазваме потребителя в базата
        repository.save(user);

        // Създаваме нов Goal със стойности 0 и го свързваме с потребителя
        Goal goal = new Goal();
        goal.setUser(user);
        goal.setCalories(0);
        goal.setProtein(0.0);
        goal.setCarbs(0.0);
        goal.setFat(0.0);

        // Запазваме Goal в базата
        goalRepository.save(goal);

        // Генерираме JWT токен
        var jwtToken = JwtService.generateToken(user);

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
        var jwtToken = JwtService.generateToken(user);
        return AuthenticationResponse.builder().token(jwtToken).userId(user.getId()).build();
    }
}
