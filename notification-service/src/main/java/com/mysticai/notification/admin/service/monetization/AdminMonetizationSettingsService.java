package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminMonetizationSettingsService {

    private final MonetizationSettingsRepository repository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<MonetizationSettings> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public MonetizationSettings findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("MonetizationSettings not found: " + id));
    }

    @Transactional(readOnly = true)
    public MonetizationSettings findLatest() {
        return repository.findFirstByOrderByConfigVersionDesc().orElse(null);
    }

    @Transactional(readOnly = true)
    public MonetizationSettings findActivePublished() {
        return repository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);
    }

    @Transactional
    public MonetizationSettings create(MonetizationSettings settings,
                                        Long adminId, String adminEmail, AdminUser.Role role) {
        if (settings.getSettingsKey() == null || settings.getSettingsKey().isBlank()) {
            settings.setSettingsKey("default");
        }

        MonetizationSettings latest = findLatest();
        int nextVersion = (latest != null) ? latest.getConfigVersion() + 1 : 1;
        settings.setConfigVersion(nextVersion);
        settings.setStatus(MonetizationSettings.Status.DRAFT);
        settings.setCreatedByAdminId(adminId);
        settings.setUpdatedByAdminId(adminId);

        MonetizationSettings saved = repository.save(settings);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_SETTINGS_CREATED,
                AuditLog.EntityType.MONETIZATION_SETTINGS,
                saved.getId().toString(), "v" + nextVersion,
                null, saved);

        log.info("Monetization settings created: version={}, adminId={}", nextVersion, adminId);
        return saved;
    }

    @Transactional
    public MonetizationSettings update(Long id, MonetizationSettings updates,
                                        Long adminId, String adminEmail, AdminUser.Role role) {
        MonetizationSettings existing = findById(id);
        MonetizationSettings old = cloneForAudit(existing);

        if (existing.getStatus() == MonetizationSettings.Status.ARCHIVED) {
            throw new IllegalStateException("Cannot update archived settings");
        }

        existing.setEnabled(updates.isEnabled());
        existing.setAdsEnabled(updates.isAdsEnabled());
        existing.setGuruEnabled(updates.isGuruEnabled());
        existing.setGuruPurchaseEnabled(updates.isGuruPurchaseEnabled());
        existing.setDefaultAdProvider(updates.getDefaultAdProvider());
        existing.setDefaultCurrency(updates.getDefaultCurrency());
        existing.setGlobalDailyAdCap(updates.getGlobalDailyAdCap());
        existing.setGlobalWeeklyAdCap(updates.getGlobalWeeklyAdCap());
        existing.setGlobalMinHoursBetweenOffers(updates.getGlobalMinHoursBetweenOffers());
        existing.setGlobalMinSessionsBetweenOffers(updates.getGlobalMinSessionsBetweenOffers());
        existing.setSignupBonusEnabled(updates.isSignupBonusEnabled());
        existing.setSignupBonusTokenAmount(Math.max(0, updates.getSignupBonusTokenAmount()));
        existing.setSignupBonusLedgerReason(updates.getSignupBonusLedgerReason());
        existing.setSignupBonusOneTimeOnly(updates.isSignupBonusOneTimeOnly());
        existing.setSignupBonusRegistrationSource(updates.getSignupBonusRegistrationSource());
        existing.setSignupBonusHelperText(updates.getSignupBonusHelperText());
        existing.setEnvironmentRulesJson(updates.getEnvironmentRulesJson());
        existing.setRolloutRulesJson(updates.getRolloutRulesJson());
        existing.setUpdatedByAdminId(adminId);

        MonetizationSettings saved = repository.save(existing);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_SETTINGS_UPDATED,
                AuditLog.EntityType.MONETIZATION_SETTINGS,
                saved.getId().toString(), "v" + saved.getConfigVersion(),
                old, saved);

        return saved;
    }

    /**
     * Atomik publish: settings + tüm ilişkili module rules aynı configVersion ile stamp'lenir.
     * Önceki published settings otomatik olarak archive edilir.
     * Mobile her zaman tek bir tutarlı active config version okur.
     */
    @Transactional
    public MonetizationSettings publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        MonetizationSettings settings = findById(id);

        if (settings.getStatus() == MonetizationSettings.Status.ARCHIVED) {
            throw new IllegalStateException("Cannot publish archived settings");
        }

        int publishVersion = settings.getConfigVersion();

        // Archive previously published settings
        repository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .ifPresent(prev -> {
                    prev.setStatus(MonetizationSettings.Status.ARCHIVED);
                    repository.save(prev);
                });

        // Stamp all module rules with 0 or mismatched version to this publish version
        List<ModuleMonetizationRule> unstampedRules = ruleRepository.findAll().stream()
                .filter(r -> r.getConfigVersion() == 0 || r.getConfigVersion() != publishVersion)
                .toList();
        for (ModuleMonetizationRule rule : unstampedRules) {
            // Only stamp rules that haven't been explicitly versioned yet (v0 = draft)
            if (rule.getConfigVersion() == 0) {
                rule.setConfigVersion(publishVersion);
                ruleRepository.save(rule);
            }
        }

        settings.setStatus(MonetizationSettings.Status.PUBLISHED);
        settings.setPublishedAt(LocalDateTime.now());
        settings.setPublishedByAdminId(adminId);

        MonetizationSettings saved = repository.save(settings);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_SETTINGS_PUBLISHED,
                AuditLog.EntityType.MONETIZATION_SETTINGS,
                saved.getId().toString(), "v" + publishVersion,
                null, saved);

        log.info("Monetization config published atomically: version={}, stampedRules={}, adminId={}",
                publishVersion, unstampedRules.size(), adminId);
        return saved;
    }

    @Transactional
    public MonetizationSettings archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        MonetizationSettings settings = findById(id);
        settings.setStatus(MonetizationSettings.Status.ARCHIVED);

        MonetizationSettings saved = repository.save(settings);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_SETTINGS_ARCHIVED,
                AuditLog.EntityType.MONETIZATION_SETTINGS,
                saved.getId().toString(), "v" + saved.getConfigVersion(),
                null, saved);

        return saved;
    }

    private MonetizationSettings cloneForAudit(MonetizationSettings s) {
        return MonetizationSettings.builder()
                .id(s.getId())
                .settingsKey(s.getSettingsKey())
                .isEnabled(s.isEnabled())
                .isAdsEnabled(s.isAdsEnabled())
                .isGuruEnabled(s.isGuruEnabled())
                .isGuruPurchaseEnabled(s.isGuruPurchaseEnabled())
                .defaultAdProvider(s.getDefaultAdProvider())
                .defaultCurrency(s.getDefaultCurrency())
                .globalDailyAdCap(s.getGlobalDailyAdCap())
                .globalWeeklyAdCap(s.getGlobalWeeklyAdCap())
                .globalMinHoursBetweenOffers(s.getGlobalMinHoursBetweenOffers())
                .globalMinSessionsBetweenOffers(s.getGlobalMinSessionsBetweenOffers())
                .isSignupBonusEnabled(s.isSignupBonusEnabled())
                .signupBonusTokenAmount(s.getSignupBonusTokenAmount())
                .signupBonusLedgerReason(s.getSignupBonusLedgerReason())
                .isSignupBonusOneTimeOnly(s.isSignupBonusOneTimeOnly())
                .signupBonusRegistrationSource(s.getSignupBonusRegistrationSource())
                .signupBonusHelperText(s.getSignupBonusHelperText())
                .configVersion(s.getConfigVersion())
                .status(s.getStatus())
                .build();
    }
}
