package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.monetization.AdminMonetizationSettingsService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/v1/monetization/settings")
@RequiredArgsConstructor
public class AdminMonetizationSettingsController {

    private final AdminMonetizationSettingsService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<List<MonetizationSettings>> list() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MonetizationSettings> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/active")
    public ResponseEntity<MonetizationSettings> getActive() {
        MonetizationSettings active = service.findActivePublished();
        return active != null ? ResponseEntity.ok(active) : ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<MonetizationSettings> create(@RequestBody MonetizationSettings settings,
                                                        Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.create(settings, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MonetizationSettings> update(@PathVariable Long id,
                                                        @RequestBody MonetizationSettings settings,
                                                        Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.update(id, settings, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<MonetizationSettings> publish(@PathVariable Long id, Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.publish(id, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<MonetizationSettings> archive(@PathVariable Long id, Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.archive(id, admin.getId(), admin.getEmail(), admin.getRole()));
    }
}
