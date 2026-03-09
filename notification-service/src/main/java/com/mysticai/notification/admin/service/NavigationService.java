package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppRouteRegistry;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.NavigationItem;
import com.mysticai.notification.repository.AppRouteRegistryRepository;
import com.mysticai.notification.repository.NavigationItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NavigationService implements ApplicationRunner {

    private final NavigationItemRepository navRepository;
    private final AppRouteRegistryRepository routeRepository;
    private final AuditLogService auditLogService;

    public Page<NavigationItem> findAll(Pageable pageable) {
        List<NavigationItem> all = navRepository.findAllByOrderBySortOrderAsc();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        return new PageImpl<>(all.subList(start, end), pageable, all.size());
    }

    public List<NavigationItem> findAllVisible() {
        return navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc();
    }

    public NavigationItem findById(Long id) {
        return navRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Navigation item not found: " + id));
    }

    @Transactional
    public NavigationItem create(NavigationItem item, Long adminId, String adminEmail, AdminUser.Role role) {
        if (navRepository.existsByNavKey(item.getNavKey())) {
            throw new IllegalArgumentException("navKey already exists: " + item.getNavKey());
        }
        validateRouteKey(item.getRouteKey());
        item.setCreatedBy(adminId);
        item.setUpdatedBy(adminId);
        NavigationItem saved = navRepository.save(item);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NAV_CREATED, AuditLog.EntityType.NAVIGATION,
                saved.getId().toString(), saved.getNavKey(), null, saved);
        return saved;
    }

    @Transactional
    public NavigationItem update(Long id, NavigationItem updates, Long adminId, String adminEmail, AdminUser.Role role) {
        NavigationItem existing = findById(id);
        if (navRepository.existsByNavKeyAndIdNot(updates.getNavKey(), id)) {
            throw new IllegalArgumentException("navKey already exists: " + updates.getNavKey());
        }
        validateRouteKey(updates.getRouteKey());
        NavigationItem snapshot = clone(existing);

        existing.setNavKey(updates.getNavKey());
        existing.setLabel(updates.getLabel());
        existing.setIcon(updates.getIcon());
        existing.setRouteKey(updates.getRouteKey());
        existing.setVisible(updates.isVisible());
        existing.setSortOrder(updates.getSortOrder());
        existing.setPlatform(updates.getPlatform());
        existing.setMinAppVersion(updates.getMinAppVersion());
        existing.setPremium(updates.isPremium());
        existing.setUpdatedBy(adminId);

        NavigationItem saved = navRepository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NAV_UPDATED, AuditLog.EntityType.NAVIGATION,
                saved.getId().toString(), saved.getNavKey(), snapshot, saved);
        return saved;
    }

    @Transactional
    public void show(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        NavigationItem item = findById(id);
        NavigationItem snapshot = clone(item);
        item.setVisible(true);
        item.setUpdatedBy(adminId);
        navRepository.save(item);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NAV_SHOWN, AuditLog.EntityType.NAVIGATION,
                id.toString(), item.getNavKey(), snapshot, item);
    }

    @Transactional
    public void hide(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        NavigationItem item = findById(id);
        NavigationItem snapshot = clone(item);
        item.setVisible(false);
        item.setUpdatedBy(adminId);
        navRepository.save(item);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NAV_HIDDEN, AuditLog.EntityType.NAVIGATION,
                id.toString(), item.getNavKey(), snapshot, item);
    }

    /**
     * Reorder: accepts a map of {id -> newSortOrder}.
     * Validates no duplicate sort orders among visible items.
     */
    @Transactional
    public void reorder(Map<Long, Integer> orderMap, Long adminId, String adminEmail, AdminUser.Role role) {
        orderMap.forEach((id, order) -> {
            NavigationItem item = findById(id);
            item.setSortOrder(order);
            item.setUpdatedBy(adminId);
            navRepository.save(item);
        });
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NAV_REORDERED, AuditLog.EntityType.NAVIGATION,
                null, "reorder-" + orderMap.size() + "-items", null, orderMap);
    }

    private void validateRouteKey(String routeKey) {
        AppRouteRegistry route = routeRepository.findByRouteKey(routeKey)
                .orElseThrow(() -> new IllegalArgumentException("Unknown routeKey: " + routeKey));
        if (!route.isActive()) throw new IllegalArgumentException("Route is inactive: " + routeKey);
        if (route.isDeprecated()) throw new IllegalArgumentException("Route is deprecated: " + routeKey);
    }

    /** Seed default tab bar navigation matching mobile app. */
    @Override
    public void run(ApplicationArguments args) {
        if (navRepository.count() == 0) {
            seedNav("home",            "Ana Sayfa",     "home",        "home",            true,  0);
            seedNav("dreams",          "Rüyalar",       "moon",        "dreams",          true,  1);
            seedNav("spiritual",       "Manevi",        "heart",       "spiritual",       true,  2);
            seedNav("calendar",        "Takvim",        "calendar",    "calendar",        true,  3);
            seedNav("compatibility",   "Uyumluluk",     "users",       "compatibility",   true,  4);
            seedNav("notifications",   "Bildirimler",   "bell",        "notifications",   true,  5);
            seedNav("profile",         "Profil",        "user",        "profile",         true,  6);
            log.info("[NAV] Seeded default navigation items");
        }
    }

    private void seedNav(String key, String label, String icon, String routeKey, boolean visible, int order) {
        try {
            NavigationItem item = NavigationItem.builder()
                    .navKey(key).label(label).icon(icon).routeKey(routeKey)
                    .isVisible(visible).sortOrder(order)
                    .platform(AppRouteRegistry.Platform.BOTH).build();
            navRepository.save(item);
        } catch (Exception e) {
            log.warn("[NAV] Skipping nav seed for '{}': {}", key, e.getMessage());
        }
    }

    private NavigationItem clone(NavigationItem n) {
        return NavigationItem.builder()
                .id(n.getId()).navKey(n.getNavKey()).label(n.getLabel()).icon(n.getIcon())
                .routeKey(n.getRouteKey()).isVisible(n.isVisible()).sortOrder(n.getSortOrder())
                .platform(n.getPlatform()).minAppVersion(n.getMinAppVersion()).isPremium(n.isPremium()).build();
    }
}
