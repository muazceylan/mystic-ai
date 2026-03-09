package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.AppModuleService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppModule;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/modules")
@RequiredArgsConstructor
public class AdminModuleController {

    private final AppModuleService moduleService;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<AppModule>> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean premium,
            @RequestParam(required = false) Boolean showOnHome,
            @RequestParam(required = false) Boolean showOnExplore,
            @RequestParam(required = false) Boolean showInTabBar,
            @RequestParam(required = false) Boolean maintenance,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(moduleService.findAll(active, premium, showOnHome, showOnExplore,
                showInTabBar, maintenance, PageRequest.of(page, size, Sort.by("sortOrder"))));
    }

    @GetMapping("/active")
    public ResponseEntity<List<AppModule>> listActive() {
        return ResponseEntity.ok(moduleService.findAllActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppModule> get(@PathVariable Long id) {
        return ResponseEntity.ok(moduleService.findById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AppModule module, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            return ResponseEntity.ok(moduleService.create(module, actor.getId(), actor.getEmail(), actor.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AppModule updates, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            return ResponseEntity.ok(moduleService.update(id, updates, actor.getId(), actor.getEmail(), actor.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<Map<String, String>> activate(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        moduleService.activate(id, actor.getId(), actor.getEmail(), actor.getRole());
        return ResponseEntity.ok(Map.of("message", "Module activated"));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        moduleService.deactivate(id, actor.getId(), actor.getEmail(), actor.getRole());
        return ResponseEntity.ok(Map.of("message", "Module deactivated"));
    }

    @PostMapping("/{id}/maintenance-enable")
    public ResponseEntity<Map<String, String>> maintenanceOn(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        moduleService.enableMaintenance(id, actor.getId(), actor.getEmail(), actor.getRole());
        return ResponseEntity.ok(Map.of("message", "Maintenance mode enabled"));
    }

    @PostMapping("/{id}/maintenance-disable")
    public ResponseEntity<Map<String, String>> maintenanceOff(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        moduleService.disableMaintenance(id, actor.getId(), actor.getEmail(), actor.getRole());
        return ResponseEntity.ok(Map.of("message", "Maintenance mode disabled"));
    }

    private AdminUser actor(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
