package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminModuleRuleService {

    private final ModuleMonetizationRuleRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<ModuleMonetizationRule> findAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public ModuleMonetizationRule findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ModuleMonetizationRule not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<ModuleMonetizationRule> findByConfigVersion(int configVersion) {
        return repository.findAllByConfigVersionOrderByModuleKeyAsc(configVersion);
    }

    @Transactional
    public ModuleMonetizationRule create(ModuleMonetizationRule rule,
                                          Long adminId, String adminEmail, AdminUser.Role role) {
        if (rule.getModuleKey() == null || rule.getModuleKey().isBlank()) {
            throw new IllegalArgumentException("moduleKey is required");
        }

        rule.setCreatedByAdminId(adminId);
        rule.setUpdatedByAdminId(adminId);

        ModuleMonetizationRule saved = repository.save(rule);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_MODULE_RULE_CREATED,
                AuditLog.EntityType.MONETIZATION_MODULE_RULE,
                saved.getId().toString(), saved.getModuleKey(),
                null, saved);

        log.info("Module monetization rule created: moduleKey={}, adminId={}", saved.getModuleKey(), adminId);
        return saved;
    }

    @Transactional
    public ModuleMonetizationRule update(Long id, ModuleMonetizationRule updates,
                                          Long adminId, String adminEmail, AdminUser.Role role) {
        ModuleMonetizationRule existing = findById(id);

        existing.setEnabled(updates.isEnabled());
        existing.setAdsEnabled(updates.isAdsEnabled());
        existing.setGuruEnabled(updates.isGuruEnabled());
        existing.setGuruPurchaseEnabled(updates.isGuruPurchaseEnabled());
        existing.setAdStrategy(updates.getAdStrategy());
        existing.setAdProvider(updates.getAdProvider());
        existing.setAdFormats(updates.getAdFormats());
        existing.setFirstNEntriesWithoutAd(updates.getFirstNEntriesWithoutAd());
        existing.setAdOfferStartEntry(updates.getAdOfferStartEntry());
        existing.setAdOfferFrequencyMode(updates.getAdOfferFrequencyMode());
        existing.setMinimumSessionsBetweenOffers(updates.getMinimumSessionsBetweenOffers());
        existing.setMinimumHoursBetweenOffers(updates.getMinimumHoursBetweenOffers());
        existing.setDailyOfferCap(updates.getDailyOfferCap());
        existing.setWeeklyOfferCap(updates.getWeeklyOfferCap());
        existing.setOnlyUserTriggeredOffer(updates.isOnlyUserTriggeredOffer());
        existing.setShowOfferOnDetailClick(updates.isShowOfferOnDetailClick());
        existing.setShowOfferOnSecondEntry(updates.isShowOfferOnSecondEntry());
        existing.setGuruRewardAmountPerCompletedAd(updates.getGuruRewardAmountPerCompletedAd());
        existing.setGuruCostsByActionJson(updates.getGuruCostsByActionJson());
        existing.setAllowFreePreview(updates.isAllowFreePreview());
        existing.setPreviewDepthMode(updates.getPreviewDepthMode());
        existing.setRolloutStatus(updates.getRolloutStatus());
        existing.setPlatformOverridesJson(updates.getPlatformOverridesJson());
        existing.setLocaleOverridesJson(updates.getLocaleOverridesJson());
        existing.setUpdatedByAdminId(adminId);

        ModuleMonetizationRule saved = repository.save(existing);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_MODULE_RULE_UPDATED,
                AuditLog.EntityType.MONETIZATION_MODULE_RULE,
                saved.getId().toString(), saved.getModuleKey(),
                null, saved);

        return saved;
    }

    @Transactional
    public void delete(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ModuleMonetizationRule existing = findById(id);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_MODULE_RULE_DELETED,
                AuditLog.EntityType.MONETIZATION_MODULE_RULE,
                existing.getId().toString(), existing.getModuleKey(),
                existing, null);

        repository.delete(existing);
        log.info("Module monetization rule deleted: id={}, moduleKey={}", id, existing.getModuleKey());
    }
}
