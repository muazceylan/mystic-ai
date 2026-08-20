package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.dto.AppVersionPolicyRequest;
import com.mysticai.notification.admin.dto.AppVersionPolicyResponse;
import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.AppVersionPolicyService;
import com.mysticai.notification.entity.AdminUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Mobile app version management. Reads and writes the same {@code app_version_config} rows the
 * public {@code /api/v1/app-version} check serves, so a save is live on the next check.
 */
@RestController
@RequestMapping("/api/admin/v1/app-version")
@RequiredArgsConstructor
public class AdminAppVersionController {

    private final AppVersionPolicyService policyService;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<List<AppVersionPolicyResponse>> list() {
        return ResponseEntity.ok(policyService.findAll());
    }

    @GetMapping("/{platform}")
    public ResponseEntity<?> get(@PathVariable String platform) {
        try {
            return ResponseEntity.ok(policyService.findByPlatform(platform));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{platform}")
    public ResponseEntity<?> upsert(@PathVariable String platform,
                                    @Valid @RequestBody AppVersionPolicyRequest request,
                                    Authentication auth) {
        AdminUser actor = authService.findById((Long) auth.getPrincipal());
        try {
            return ResponseEntity.ok(policyService.upsert(
                    platform, request, actor.getId(), actor.getEmail(), actor.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
