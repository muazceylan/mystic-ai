package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.RouteRegistrySyncService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppRouteRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/v1/routes")
@RequiredArgsConstructor
public class AdminRouteSyncController {

    private final RouteRegistrySyncService syncService;
    private final AdminAuthService authService;

    @PostMapping("/sync/dry-run")
    public ResponseEntity<RouteRegistrySyncService.SyncResult> dryRun(
            @RequestBody List<RouteRegistrySyncService.ManifestEntry> manifest) {
        return ResponseEntity.ok(syncService.dryRun(manifest));
    }

    @PostMapping("/sync/apply")
    public ResponseEntity<RouteRegistrySyncService.SyncResult> apply(
            @RequestBody List<RouteRegistrySyncService.ManifestEntry> manifest,
            Authentication auth) {
        AdminUser actor = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(syncService.apply(manifest, actor.getId(), actor.getEmail(), actor.getRole()));
    }

    @GetMapping("/discovered")
    public ResponseEntity<List<AppRouteRegistry>> discovered() {
        return ResponseEntity.ok(syncService.findDiscovered());
    }

    @GetMapping("/stale")
    public ResponseEntity<List<AppRouteRegistry>> stale() {
        return ResponseEntity.ok(syncService.findStale());
    }
}
