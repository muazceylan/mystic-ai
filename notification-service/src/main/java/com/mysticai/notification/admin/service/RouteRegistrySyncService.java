package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppRouteRegistry;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AppRouteRegistryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RouteRegistrySyncService {

    private final AppRouteRegistryRepository routeRepository;
    private final AuditLogService auditLogService;

    /**
     * Route manifest entry — sent by the admin panel after scanning the mobile codebase.
     * The admin can POST a manifest JSON with discovered routes.
     */
    public record ManifestEntry(
            String routeKey,
            String path,
            String displayName,
            String moduleKey,
            boolean requiresAuth,
            String platform,   // IOS, ANDROID, BOTH
            String source      // e.g. "expo-router-scan", "manual"
    ) {}

    public record SyncResult(
            List<String> newRoutes,
            List<String> updatedRoutes,
            List<String> staleRoutes,
            List<String> conflicts,
            boolean dryRun
    ) {}

    /** Dry-run: report what would change without writing to DB. */
    public SyncResult dryRun(List<ManifestEntry> manifest) {
        return process(manifest, true, null, null, null);
    }

    /** Apply: write changes to DB. */
    @Transactional
    public SyncResult apply(List<ManifestEntry> manifest, Long adminId, String adminEmail, AdminUser.Role role) {
        SyncResult result = process(manifest, false, adminId, adminEmail, role);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.ROUTE_SYNC_APPLIED, AuditLog.EntityType.ROUTE,
                null, "sync-applied",
                null, Map.of("new", result.newRoutes().size(),
                             "stale", result.staleRoutes().size(),
                             "conflicts", result.conflicts().size()));
        return result;
    }

    private SyncResult process(List<ManifestEntry> manifest, boolean dryRun,
                                Long adminId, String adminEmail, AdminUser.Role role) {
        Set<String> manifestKeys = manifest.stream()
                .map(ManifestEntry::routeKey)
                .collect(Collectors.toSet());

        List<AppRouteRegistry> existingRoutes = routeRepository.findAll();
        Map<String, AppRouteRegistry> existingByKey = existingRoutes.stream()
                .collect(Collectors.toMap(AppRouteRegistry::getRouteKey, r -> r));

        List<String> newRoutes = new ArrayList<>();
        List<String> updatedRoutes = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();
        List<String> staleRoutes = new ArrayList<>();

        // Phase 1: process manifest entries
        for (ManifestEntry entry : manifest) {
            AppRouteRegistry existing = existingByKey.get(entry.routeKey());

            if (existing == null) {
                // New route — create as DISCOVERED
                if (!dryRun) {
                    AppRouteRegistry.Platform platform;
                    try {
                        platform = AppRouteRegistry.Platform.valueOf(
                                entry.platform() != null ? entry.platform().toUpperCase() : "BOTH");
                    } catch (IllegalArgumentException e) {
                        platform = AppRouteRegistry.Platform.BOTH;
                    }
                    AppRouteRegistry route = AppRouteRegistry.builder()
                            .routeKey(entry.routeKey())
                            .displayName(entry.displayName() != null ? entry.displayName() : entry.routeKey())
                            .path(entry.path())
                            .moduleKey(entry.moduleKey())
                            .requiresAuth(entry.requiresAuth())
                            .supportedPlatforms(platform)
                            .isActive(true)
                            .isDeprecated(false)
                            .syncStatus(AppRouteRegistry.SyncStatus.DISCOVERED)
                            .discoverySource(entry.source())
                            .lastDiscoveredAt(LocalDateTime.now())
                            .build();
                    routeRepository.save(route);
                    if (role != null) {
                        auditLogService.log(adminId, adminEmail, role,
                                AuditLog.ActionType.ROUTE_DISCOVERED, AuditLog.EntityType.ROUTE,
                                entry.routeKey(), entry.routeKey(), null,
                                Map.of("path", entry.path(), "source", entry.source() != null ? entry.source() : "unknown"));
                    }
                }
                newRoutes.add(entry.routeKey());
            } else {
                // Existing route — update lastDiscoveredAt and syncStatus, but preserve manual fields
                if (existing.isDeprecated()) {
                    // Deprecated routes are not re-activated by auto-sync
                    conflicts.add(entry.routeKey() + " (deprecated — skipped)");
                    continue;
                }
                if (!dryRun) {
                    existing.setLastDiscoveredAt(LocalDateTime.now());
                    existing.setDiscoverySource(entry.source());
                    existing.setStale(false);
                    if (existing.getSyncStatus() == AppRouteRegistry.SyncStatus.REGISTERED) {
                        existing.setSyncStatus(AppRouteRegistry.SyncStatus.DISCOVERED);
                    }
                    // Update path if changed — but preserve displayName, fallback, description (manual overrides)
                    if (!Objects.equals(existing.getPath(), entry.path())) {
                        existing.setPath(entry.path());
                        updatedRoutes.add(entry.routeKey() + " (path changed)");
                    }
                    routeRepository.save(existing);
                } else {
                    if (!Objects.equals(existing.getPath(), entry.path())) {
                        updatedRoutes.add(entry.routeKey() + " (path changed)");
                    }
                }
            }
        }

        // Phase 2: mark routes in registry but NOT in manifest as stale
        for (AppRouteRegistry existing : existingRoutes) {
            if (!manifestKeys.contains(existing.getRouteKey()) && !existing.isDeprecated()) {
                staleRoutes.add(existing.getRouteKey());
                if (!dryRun) {
                    existing.setStale(true);
                    existing.setSyncStatus(AppRouteRegistry.SyncStatus.STALE);
                    routeRepository.save(existing);
                    if (role != null) {
                        auditLogService.log(adminId, adminEmail, role,
                                AuditLog.ActionType.ROUTE_MARKED_STALE, AuditLog.EntityType.ROUTE,
                                existing.getId().toString(), existing.getRouteKey(), null, null);
                    }
                }
            }
        }

        if (dryRun && role != null) {
            auditLogService.log(adminId, adminEmail, role,
                    AuditLog.ActionType.ROUTE_SYNC_DRY_RUN, AuditLog.EntityType.ROUTE,
                    null, "dry-run",
                    null, Map.of("new", newRoutes.size(), "stale", staleRoutes.size(), "conflicts", conflicts.size()));
        }

        return new SyncResult(newRoutes, updatedRoutes, staleRoutes, conflicts, dryRun);
    }

    public List<AppRouteRegistry> findDiscovered() {
        return routeRepository.findAllBySyncStatus(AppRouteRegistry.SyncStatus.DISCOVERED);
    }

    public List<AppRouteRegistry> findStale() {
        return routeRepository.findAllByIsStaleTrue();
    }
}
