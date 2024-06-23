package com.stoyandev.caloriecalculator.security.service;

import com.stoyandev.caloriecalculator.entity.enums.UserType;
import com.stoyandev.caloriecalculator.entity.Users;
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


    public AuthenticationResponse register(RegisterRequest request) {
        var user = Users.builder()
                .name(request.getName())
                .age(request.getAge())
                .weight(request.getWeight())
                .height(request.getHeight())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .userType(UserType.USER)
                .build();
        repository.save(user);
          var jwtToken = JwtService.generateToken(user);
          return AuthenticationResponse.builder().token(jwtToken).build();
    }

    public AuthenticationResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        var user = repository.findByUsername(request.getUsername())
                .orElseThrow();
        var jwtToken = JwtService.generateToken(user);
        return AuthenticationResponse.builder().token(jwtToken).build();
    }
}
