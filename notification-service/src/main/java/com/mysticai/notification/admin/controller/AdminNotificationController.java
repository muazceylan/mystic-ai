package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.AdminNotificationService;
import com.mysticai.notification.entity.AdminNotification;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final AdminNotificationService notifService;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<AdminNotification>> list(
            @RequestParam(required = false) AdminNotification.Status status,
            @RequestParam(required = false) Notification.NotificationCategory category,
            @RequestParam(required = false) Notification.DeliveryChannel channel,
            @RequestParam(required = false) AdminNotification.TargetAudience audience,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notifService.findAll(status, category, channel, audience, from, to,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminNotification> get(@PathVariable Long id) {
        return ResponseEntity.ok(notifService.findById(id));
    }

    @PostMapping
    public ResponseEntity<AdminNotification> create(@RequestBody AdminNotification notification,
                                                     Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(notifService.create(notification, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminNotification> update(@PathVariable Long id,
                                                     @RequestBody AdminNotification updates,
                                                     Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(notifService.update(id, updates, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/schedule")
    public ResponseEntity<?> schedule(@PathVariable Long id,
                                       @RequestBody Map<String, String> body,
                                       Authentication auth) {
        String scheduledAtStr = body.get("scheduledAt");
        if (scheduledAtStr == null || scheduledAtStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "scheduledAt is required (ISO-8601)"));
        }
        LocalDateTime scheduledAt;
        try {
            scheduledAt = LocalDateTime.parse(scheduledAtStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid scheduledAt format, expected ISO-8601 (e.g. 2026-03-10T09:00:00)"));
        }
        AdminUser admin = adminUser(auth);
        try {
            AdminNotification saved = notifService.schedule(id, scheduledAt, admin.getId(), admin.getEmail(), admin.getRole());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/test-send")
    public ResponseEntity<Map<String, Object>> testSend(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            Authentication auth) {
        AdminUser admin = adminUser(auth);
        Long targetUserId = body.get("targetUserId");
        if (targetUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "targetUserId required"));
        }
        notifService.testSend(id, targetUserId, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.ok(Map.of("message", "Test notification sent", "targetUserId", targetUserId));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, String>> cancel(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        notifService.cancel(id, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.ok(Map.of("message", "Notification cancelled"));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        notifService.deactivate(id, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.ok(Map.of("message", "Notification deactivated"));
    }

    private AdminUser adminUser(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
