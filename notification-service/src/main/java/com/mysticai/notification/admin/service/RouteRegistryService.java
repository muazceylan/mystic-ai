package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.AppRouteSpec;
import com.mysticai.notification.entity.AppRouteRegistry;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AppRouteRegistryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RouteRegistryService implements ApplicationRunner {

    private final AppRouteRegistryRepository routeRepository;
    private final AuditLogService auditLogService;

    public Page<AppRouteRegistry> findAll(Boolean active, Boolean deprecated,
                                          String moduleKey, AppRouteRegistry.Platform platform,
                                          Pageable pageable) {
        return routeRepository.findAll(AppRouteSpec.filter(active, deprecated, moduleKey, platform), pageable);
    }

    public AppRouteRegistry findById(Long id) {
        return routeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Route not found: " + id));
    }

    public AppRouteRegistry findByKey(String routeKey) {
        return routeRepository.findByRouteKey(routeKey)
                .orElseThrow(() -> new IllegalArgumentException("Route not found: " + routeKey));
    }

    public List<AppRouteRegistry> findAllActive() {
        return routeRepository.findAllByIsActiveTrueAndIsDeprecatedFalse();
    }

    @Transactional
    public AppRouteRegistry create(AppRouteRegistry route, Long adminId, String adminEmail,
                                   com.mysticai.notification.entity.AdminUser.Role role) {
        if (routeRepository.existsByRouteKey(route.getRouteKey())) {
            throw new IllegalArgumentException("routeKey already exists: " + route.getRouteKey());
        }
        route.setCreatedBy(adminId);
        route.setUpdatedBy(adminId);
        AppRouteRegistry saved = routeRepository.save(route);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.ROUTE_CREATE, AuditLog.EntityType.ROUTE,
                saved.getId().toString(), saved.getRouteKey(), null, saved);
        return saved;
    }

    @Transactional
    public AppRouteRegistry update(Long id, AppRouteRegistry updates, Long adminId, String adminEmail,
                                   com.mysticai.notification.entity.AdminUser.Role role) {
        AppRouteRegistry existing = findById(id);
        if (routeRepository.existsByRouteKeyAndIdNot(updates.getRouteKey(), id)) {
            throw new IllegalArgumentException("routeKey already exists: " + updates.getRouteKey());
        }
        AppRouteRegistry snapshot = clone(existing);

        existing.setRouteKey(updates.getRouteKey());
        existing.setDisplayName(updates.getDisplayName());
        existing.setPath(updates.getPath());
        existing.setDescription(updates.getDescription());
        existing.setModuleKey(updates.getModuleKey());
        existing.setRequiresAuth(updates.isRequiresAuth());
        existing.setFallbackRouteKey(updates.getFallbackRouteKey());
        existing.setActive(updates.isActive());
        existing.setDeprecated(updates.isDeprecated());
        existing.setSupportedPlatforms(updates.getSupportedPlatforms());
        existing.setUpdatedBy(adminId);

        AppRouteRegistry saved = routeRepository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.ROUTE_UPDATE, AuditLog.EntityType.ROUTE,
                saved.getId().toString(), saved.getRouteKey(), snapshot, saved);
        return saved;
    }

    @Transactional
    public void deactivate(Long id, Long adminId, String adminEmail,
                           com.mysticai.notification.entity.AdminUser.Role role) {
        AppRouteRegistry route = findById(id);
        AppRouteRegistry snapshot = clone(route);
        route.setActive(false);
        route.setUpdatedBy(adminId);
        routeRepository.save(route);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.ROUTE_DEACTIVATE, AuditLog.EntityType.ROUTE,
                id.toString(), route.getRouteKey(), snapshot, route);
    }

    @Transactional
    public void deprecate(Long id, Long adminId, String adminEmail,
                          com.mysticai.notification.entity.AdminUser.Role role) {
        AppRouteRegistry route = findById(id);
        AppRouteRegistry snapshot = clone(route);
        route.setDeprecated(true);
        route.setUpdatedBy(adminId);
        routeRepository.save(route);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.ROUTE_DEPRECATE, AuditLog.EntityType.ROUTE,
                id.toString(), route.getRouteKey(), snapshot, route);
    }

    private AppRouteRegistry clone(AppRouteRegistry r) {
        return AppRouteRegistry.builder()
                .id(r.getId()).routeKey(r.getRouteKey()).displayName(r.getDisplayName())
                .path(r.getPath()).description(r.getDescription()).moduleKey(r.getModuleKey())
                .requiresAuth(r.isRequiresAuth()).fallbackRouteKey(r.getFallbackRouteKey())
                .isActive(r.isActive()).isDeprecated(r.isDeprecated())
                .supportedPlatforms(r.getSupportedPlatforms()).build();
    }

    /**
     * Seed default routes matching the mobile app's existing tabs.
     */
    @Override
    public void run(ApplicationArguments args) {
        int created = 0;

        // ── Core Tabs ─────────────────────────────────────────────────────
        created += upsertSeedRoute("home",            "Ana Sayfa",          "/(tabs)/home",              "core",      false, "core",      AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("dreams",          "Rüya Günlüğü",       "/(tabs)/dreams",            "dream",     true,  "dream",     AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("spiritual",       "Manevi Alan",        "/(tabs)/spiritual",         "spiritual", true,  "spiritual", AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("calendar",        "Kozmik Takvim",      "/(tabs)/calendar",          "astrology", true,  "astrology", AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("compatibility",   "Uyumluluk",          "/(tabs)/compatibility",     "synastry",  true,  "synastry",  AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("weekly-analysis", "Haftalık Analiz",    "/(tabs)/weekly-analysis",   "astrology", true,  "astrology", AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("notifications",   "Bildirim Merkezi",   "/(tabs)/notifications",     "system",    true,  "system",    AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("profile",         "Profil",             "/(tabs)/profile",           "account",   true,  "account",   AppRouteRegistry.Platform.BOTH);

        // ── Dream Sub-Screens ─────────────────────────────────────────────
        created += upsertSeedRoute("dream-compose",   "Rüya Yaz",           "/(tabs)/dreams?tab=compose", "dream",    true,  "dream",     AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("dream-journal",   "Rüya Defteri",       "/(tabs)/dream-book",        "dream",     true,  "dream",     AppRouteRegistry.Platform.BOTH);

        // ── Spiritual Sub-Screens ─────────────────────────────────────────
        created += upsertSeedRoute("esma-list",       "Esma Listesi",       "/spiritual/asma",           "spiritual", true,  "spiritual", AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("counter",         "Zikir Sayacı",       "/spiritual/counter",        "spiritual", true,  "spiritual", AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("journal",         "Günlük",             "/spiritual/journal",        "spiritual", true,  "spiritual", AppRouteRegistry.Platform.BOTH);

        // ── Settings ─────────────────────────────────────────────────────
        created += upsertSeedRoute("notifications-settings", "Bildirim Ayarları", "/notifications-settings", "system", true, "system",   AppRouteRegistry.Platform.BOTH);
        created += upsertSeedRoute("edit-profile",    "Profil Düzenle",     "/edit-profile",             "account",   true,  "account",   AppRouteRegistry.Platform.BOTH);

        if (created > 0) {
            log.info("[ROUTE_REGISTRY] Added {} missing default route(s).", created);
        } else {
            log.info("[ROUTE_REGISTRY] Default route set already present; no missing route added.");
        }
    }

    private int upsertSeedRoute(String key, String name, String path, String description,
                                boolean requiresAuth, String moduleKey, AppRouteRegistry.Platform platform) {
        if (routeRepository.existsByRouteKey(key)) {
            return 0;
        }

        AppRouteRegistry route = AppRouteRegistry.builder()
                .routeKey(key).displayName(name).path(path)
                .description(description).moduleKey(moduleKey).requiresAuth(requiresAuth)
                .isActive(true).isDeprecated(false)
                .supportedPlatforms(platform)
                .build();
        routeRepository.save(route);
        return 1;
    }
}
