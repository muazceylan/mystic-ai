package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.NotificationTriggerService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/notification-triggers")
@RequiredArgsConstructor
public class AdminNotificationTriggerController {

    private final NotificationTriggerService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<NotificationTrigger>> list(
            @RequestParam(required = false) NotificationTrigger.CadenceType cadenceType,
            @RequestParam(required = false) NotificationTrigger.SourceType sourceType,
            @RequestParam(required = false) NotificationTrigger.RunStatus lastRunStatus,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String ownerModule,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(
                service.findAll(cadenceType, sourceType, lastRunStatus, isActive, ownerModule,
                        PageRequest.of(page, size, Sort.by("id").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationTrigger> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<?> enable(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.enable(id, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<?> disable(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.disable(id, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }

    private AdminUser adminUser(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
