package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.RouteRegistryService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppRouteRegistry;
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
@RequestMapping("/api/admin/v1/routes")
@RequiredArgsConstructor
public class AdminRouteController {

    private final RouteRegistryService routeService;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<AppRouteRegistry>> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean deprecated,
            @RequestParam(required = false) String moduleKey,
            @RequestParam(required = false) AppRouteRegistry.Platform platform,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(routeService.findAll(active, deprecated, moduleKey, platform,
                PageRequest.of(page, size, Sort.by("updatedAt").descending())));
    }

    @GetMapping("/active")
    public ResponseEntity<List<AppRouteRegistry>> listActive() {
        return ResponseEntity.ok(routeService.findAllActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppRouteRegistry> get(@PathVariable Long id) {
        return ResponseEntity.ok(routeService.findById(id));
    }

    @GetMapping("/key/{routeKey}")
    public ResponseEntity<AppRouteRegistry> getByKey(@PathVariable String routeKey) {
        return ResponseEntity.ok(routeService.findByKey(routeKey));
    }

    @PostMapping
    public ResponseEntity<AppRouteRegistry> create(@RequestBody AppRouteRegistry route,
                                                    Authentication auth) {
        AdminUser admin = adminUser(auth);
        return ResponseEntity.ok(routeService.create(route, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppRouteRegistry> update(@PathVariable Long id,
                                                    @RequestBody AppRouteRegistry updates,
                                                    Authentication auth) {
        AdminUser admin = adminUser(auth);
        return ResponseEntity.ok(routeService.update(id, updates, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        routeService.deactivate(id, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.ok(Map.of("message", "Route deactivated"));
    }

    @PostMapping("/{id}/deprecate")
    public ResponseEntity<Map<String, String>> deprecate(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        routeService.deprecate(id, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.ok(Map.of("message", "Route deprecated"));
    }

    private AdminUser adminUser(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
