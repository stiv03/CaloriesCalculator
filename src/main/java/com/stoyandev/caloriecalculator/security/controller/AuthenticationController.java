package com.stoyandev.caloriecalculator.security.controller;

import com.stoyandev.caloriecalculator.security.auth.AuthenticationResponse;
import com.stoyandev.caloriecalculator.security.auth.LoginRequest;
import com.stoyandev.caloriecalculator.security.auth.RegisterRequest;
import com.stoyandev.caloriecalculator.security.service.AuthenticationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "https://calories.mazen.pro")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    @CrossOrigin(origins = "https://calories.mazen.pro/register")
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authenticationService.register(request));

    }

    @CrossOrigin(origins = "https://calories.mazen.pro/login")
    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authenticationService.authenticate(request));

    }
}
