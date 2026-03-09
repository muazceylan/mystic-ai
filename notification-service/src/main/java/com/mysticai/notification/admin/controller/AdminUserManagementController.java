package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.AdminUserManagementService;
import com.mysticai.notification.entity.AdminUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/admin-users")
@RequiredArgsConstructor
public class AdminUserManagementController {

    private final AdminUserManagementService userService;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<AdminUser>> list(
            @RequestParam(required = false) AdminUser.Role role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.findAll(role, active, search,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUser> get(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AdminUser user, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            AdminUser created = userService.create(user, actor.getId(), actor.getEmail(), actor.getRole());
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AdminUser updates, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            return ResponseEntity.ok(userService.update(id, updates, actor.getId(), actor.getEmail(), actor.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            userService.activate(id, actor.getId(), actor.getEmail(), actor.getRole());
            return ResponseEntity.ok(Map.of("message", "Admin user activated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivate(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            userService.deactivate(id, actor.getId(), actor.getEmail(), actor.getRole());
            return ResponseEntity.ok(Map.of("message", "Admin user deactivated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            String tempPassword = userService.resetPassword(id, actor.getId(), actor.getEmail(), actor.getRole());
            return ResponseEntity.ok(Map.of(
                    "message", "Password reset. Share this temporary password securely.",
                    "temporaryPassword", tempPassword
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private AdminUser actor(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
