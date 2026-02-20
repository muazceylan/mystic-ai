package com.mysticai.auth.controller;

import com.mysticai.auth.dto.*;
import com.mysticai.auth.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserDTO> register(@Valid @RequestBody RegisterRequest request) {
        UserDTO user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/check-email")
    public ResponseEntity<CheckEmailResponse> checkEmail(@Valid @RequestBody CheckEmailRequest request) {
        boolean available = authService.isEmailAvailable(request.email());
        return ResponseEntity.ok(new CheckEmailResponse(available,
                available ? "Email is available" : "Email already exists"));
    }

    @GetMapping("/check-email")
    public ResponseEntity<CheckEmailResponse> checkEmailGet(@RequestParam @Email String email) {
        boolean available = authService.isEmailAvailable(email);
        return ResponseEntity.ok(new CheckEmailResponse(available,
                available ? "Email is available" : "Email already exists"));
    }

    @PostMapping("/social-login")
    public ResponseEntity<LoginResponse> socialLogin(@Valid @RequestBody SocialLoginRequest request) {
        LoginResponse response = authService.socialLogin(request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody UpdateProfileRequest request) {
        UserDTO updated = authService.updateProfile(userId, request);
        return ResponseEntity.ok(updated);
    }
}
