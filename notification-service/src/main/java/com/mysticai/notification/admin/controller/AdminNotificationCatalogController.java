package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.NotificationDefinitionService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.NotificationDefinition;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/notification-catalog")
@RequiredArgsConstructor
public class AdminNotificationCatalogController {

    private final NotificationDefinitionService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<NotificationDefinition>> list(
            @RequestParam(required = false) NotificationDefinition.CadenceType cadenceType,
            @RequestParam(required = false) NotificationDefinition.ChannelType channelType,
            @RequestParam(required = false) NotificationDefinition.SourceType sourceType,
            @RequestParam(required = false) NotificationDefinition.TriggerType triggerType,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String ownerModule,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(
                service.findAll(cadenceType, channelType, sourceType, triggerType, isActive, ownerModule,
                        PageRequest.of(page, size, Sort.by("id").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationDefinition> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationDefinition> update(
            @PathVariable Long id,
            @RequestBody NotificationDefinition updates,
            Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.update(id, updates, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<NotificationDefinition> activate(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.activate(id, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).build();
        }
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<NotificationDefinition> deactivate(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.deactivate(id, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).build();
        }
    }

    private AdminUser adminUser(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
