package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.entity.AdminUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService authService;

    public record LoginRequest(String email, String password) {}

    @PostMapping("/login")
    public ResponseEntity<AdminAuthService.LoginResponse> login(@RequestBody LoginRequest req) {
        try {
            return ResponseEntity.ok(authService.login(req.email(), req.password()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        // JWT is stateless; client discards the token
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        Long adminId = (Long) auth.getPrincipal();
        AdminUser admin = authService.findById(adminId);
        return ResponseEntity.ok(Map.of(
                "id", admin.getId(),
                "email", admin.getEmail(),
                "role", admin.getRole().name()
        ));
    }
}
