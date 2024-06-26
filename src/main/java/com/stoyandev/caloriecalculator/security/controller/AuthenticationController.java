package com.stoyandev.caloriecalculator.security.controller;

import com.stoyandev.caloriecalculator.security.auth.AuthenticationResponse;
import com.stoyandev.caloriecalculator.security.service.AuthenticationService;
import com.stoyandev.caloriecalculator.security.auth.LoginRequest;
import com.stoyandev.caloriecalculator.security.auth.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    @CrossOrigin(origins = "http://localhost:3000/register")
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authenticationService.register(request));

    }
    @CrossOrigin(origins = "http://localhost:3000/login")
    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authenticationService.authenticate(request));

    }
}
