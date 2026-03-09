package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.AppModuleSpec;
import com.mysticai.notification.entity.AppModule;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AppModuleRepository;
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
public class AppModuleService implements ApplicationRunner {

    private final AppModuleRepository moduleRepository;
    private final AuditLogService auditLogService;

    public Page<AppModule> findAll(Boolean active, Boolean premium,
                                   Boolean showOnHome, Boolean showOnExplore,
                                   Boolean showInTabBar, Boolean maintenance,
                                   Pageable pageable) {
        return moduleRepository.findAll(
                AppModuleSpec.filter(active, premium, showOnHome, showOnExplore, showInTabBar, maintenance),
                pageable);
    }

    public List<AppModule> findAllActive() {
        return moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc();
    }

    public AppModule findById(Long id) {
        return moduleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Module not found: " + id));
    }

    @Transactional
    public AppModule create(AppModule module, Long adminId, String adminEmail, AdminUser.Role role) {
        if (moduleRepository.existsByModuleKey(module.getModuleKey())) {
            throw new IllegalArgumentException("moduleKey already exists: " + module.getModuleKey());
        }
        if (module.getSortOrder() < 0) throw new IllegalArgumentException("sortOrder cannot be negative");
        if (module.getStartDate() != null && module.getEndDate() != null
                && module.getStartDate().isAfter(module.getEndDate())) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }
        module.setCreatedBy(adminId);
        module.setUpdatedBy(adminId);
        AppModule saved = moduleRepository.save(module);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MODULE_CREATED, AuditLog.EntityType.MODULE,
                saved.getId().toString(), saved.getModuleKey(), null, saved);
        return saved;
    }

    @Transactional
    public AppModule update(Long id, AppModule updates, Long adminId, String adminEmail, AdminUser.Role role) {
        AppModule existing = findById(id);
        if (moduleRepository.existsByModuleKeyAndIdNot(updates.getModuleKey(), id)) {
            throw new IllegalArgumentException("moduleKey already exists: " + updates.getModuleKey());
        }
        if (updates.getSortOrder() < 0) throw new IllegalArgumentException("sortOrder cannot be negative");
        if (updates.getStartDate() != null && updates.getEndDate() != null
                && updates.getStartDate().isAfter(updates.getEndDate())) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }
        AppModule snapshot = clone(existing);

        existing.setModuleKey(updates.getModuleKey());
        existing.setDisplayName(updates.getDisplayName());
        existing.setDescription(updates.getDescription());
        existing.setIcon(updates.getIcon());
        existing.setActive(updates.isActive());
        existing.setPremium(updates.isPremium());
        existing.setShowOnHome(updates.isShowOnHome());
        existing.setShowOnExplore(updates.isShowOnExplore());
        existing.setShowInTabBar(updates.isShowInTabBar());
        existing.setSortOrder(updates.getSortOrder());
        existing.setStartDate(updates.getStartDate());
        existing.setEndDate(updates.getEndDate());
        existing.setBadgeLabel(updates.getBadgeLabel());
        existing.setMaintenanceMode(updates.isMaintenanceMode());
        existing.setHiddenButDeepLinkable(updates.isHiddenButDeepLinkable());
        existing.setUpdatedBy(adminId);

        AppModule saved = moduleRepository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MODULE_UPDATED, AuditLog.EntityType.MODULE,
                saved.getId().toString(), saved.getModuleKey(), snapshot, saved);
        return saved;
    }

    @Transactional
    public void activate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        AppModule module = findById(id);
        AppModule snapshot = clone(module);
        module.setActive(true);
        module.setUpdatedBy(adminId);
        moduleRepository.save(module);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MODULE_ACTIVATED, AuditLog.EntityType.MODULE,
                id.toString(), module.getModuleKey(), snapshot, module);
    }

    @Transactional
    public void deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        AppModule module = findById(id);
        AppModule snapshot = clone(module);
        module.setActive(false);
        module.setUpdatedBy(adminId);
        moduleRepository.save(module);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MODULE_DEACTIVATED, AuditLog.EntityType.MODULE,
                id.toString(), module.getModuleKey(), snapshot, module);
    }

    @Transactional
    public void enableMaintenance(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        AppModule module = findById(id);
        AppModule snapshot = clone(module);
        module.setMaintenanceMode(true);
        module.setUpdatedBy(adminId);
        moduleRepository.save(module);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MODULE_MAINTENANCE_ENABLED, AuditLog.EntityType.MODULE,
                id.toString(), module.getModuleKey(), snapshot, module);
    }

    @Transactional
    public void disableMaintenance(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        AppModule module = findById(id);
        AppModule snapshot = clone(module);
        module.setMaintenanceMode(false);
        module.setUpdatedBy(adminId);
        moduleRepository.save(module);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MODULE_MAINTENANCE_DISABLED, AuditLog.EntityType.MODULE,
                id.toString(), module.getModuleKey(), snapshot, module);
    }

    /** Seed default modules matching the mobile app's feature set. */
    @Override
    public void run(ApplicationArguments args) {
        if (moduleRepository.count() == 0) {
            seed("home",              "Ana Sayfa",          "home",           "home-icon",         true,  false, true,  false, true,  0);
            seed("daily_transits",    "Günlük Transitler",  "astrology",      "sun-icon",          true,  false, true,  true,  false, 1);
            seed("weekly_horoscope",  "Haftalık Burç",      "astrology",      "stars-icon",        true,  false, true,  true,  false, 2);
            seed("dream_analysis",    "Rüya Analizi",       "dream",          "moon-icon",         true,  false, true,  true,  true,  3);
            seed("spiritual",         "Manevi Alan",        "spiritual",      "heart-icon",        true,  false, true,  true,  true,  4);
            seed("compatibility",     "Uyumluluk",          "synastry",       "link-icon",         true,  false, true,  true,  true,  5);
            seed("numerology",        "Numeroloji",         "astrology",      "hash-icon",         true,  true,  false, true,  false, 6);
            seed("meditation",        "Meditasyon",         "spiritual",      "wind-icon",         true,  false, false, true,  false, 7);
            seed("prayer_module",     "Dua & Zikir",        "spiritual",      "book-icon",         true,  false, false, true,  false, 8);
            seed("notifications",     "Bildirimler",        "system",         "bell-icon",         true,  false, false, false, true,  9);
            seed("profile",           "Profil",             "account",        "user-icon",         true,  false, false, false, true,  10);
            log.info("[MODULES] Seeded {} default app modules", 11);
        }
    }

    private void seed(String key, String name, String module, String icon,
                      boolean active, boolean premium,
                      boolean showHome, boolean showExplore, boolean showTab, int order) {
        AppModule m = AppModule.builder()
                .moduleKey(key).displayName(name)
                .description(module).icon(icon)
                .isActive(active).isPremium(premium)
                .showOnHome(showHome).showOnExplore(showExplore).showInTabBar(showTab)
                .sortOrder(order).build();
        moduleRepository.save(m);
    }

    private AppModule clone(AppModule m) {
        return AppModule.builder()
                .id(m.getId()).moduleKey(m.getModuleKey()).displayName(m.getDisplayName())
                .description(m.getDescription()).icon(m.getIcon())
                .isActive(m.isActive()).isPremium(m.isPremium())
                .showOnHome(m.isShowOnHome()).showOnExplore(m.isShowOnExplore()).showInTabBar(m.isShowInTabBar())
                .sortOrder(m.getSortOrder()).startDate(m.getStartDate()).endDate(m.getEndDate())
                .badgeLabel(m.getBadgeLabel()).maintenanceMode(m.isMaintenanceMode())
                .hiddenButDeepLinkable(m.isHiddenButDeepLinkable()).build();
    }
}
