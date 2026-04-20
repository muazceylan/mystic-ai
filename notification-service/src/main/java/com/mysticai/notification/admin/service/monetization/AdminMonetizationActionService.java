package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.repository.MonetizationActionRepository;
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
public class AdminMonetizationActionService {

    private final MonetizationActionRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<MonetizationAction> findAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public MonetizationAction findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("MonetizationAction not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<MonetizationAction> findByModuleKey(String moduleKey) {
        return repository.findAllByModuleKeyOrderByDisplayPriorityAsc(moduleKey);
    }

    @Transactional
    public MonetizationAction create(MonetizationAction action,
                                      Long adminId, String adminEmail, AdminUser.Role role) {
        if (repository.existsByActionKeyAndModuleKey(action.getActionKey(), action.getModuleKey())) {
            throw new IllegalStateException("Action already exists: " +
                    action.getActionKey() + " in module " + action.getModuleKey());
        }

        action.setCreatedByAdminId(adminId);
        action.setUpdatedByAdminId(adminId);

        MonetizationAction saved = repository.save(action);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_ACTION_CREATED,
                AuditLog.EntityType.MONETIZATION_ACTION,
                saved.getId().toString(), saved.getActionKey(),
                null, saved);

        log.info("Monetization action created: actionKey={}, moduleKey={}", saved.getActionKey(), saved.getModuleKey());
        return saved;
    }

    @Transactional
    public MonetizationAction update(Long id, MonetizationAction updates,
                                      Long adminId, String adminEmail, AdminUser.Role role) {
        MonetizationAction existing = findById(id);

        if ((!existing.getActionKey().equals(updates.getActionKey())
                || !existing.getModuleKey().equals(updates.getModuleKey()))
                && repository.existsByActionKeyAndModuleKey(updates.getActionKey(), updates.getModuleKey())) {
            throw new IllegalStateException("Action already exists: "
                    + updates.getActionKey() + " in module " + updates.getModuleKey());
        }

        existing.setActionKey(updates.getActionKey());
        existing.setModuleKey(updates.getModuleKey());
        existing.setDisplayName(updates.getDisplayName());
        existing.setDescription(updates.getDescription());
        existing.setDialogTitle(updates.getDialogTitle());
        existing.setDialogDescription(updates.getDialogDescription());
        existing.setPrimaryCtaLabel(updates.getPrimaryCtaLabel());
        existing.setSecondaryCtaLabel(updates.getSecondaryCtaLabel());
        existing.setAnalyticsKey(updates.getAnalyticsKey());
        existing.setUnlockType(updates.getUnlockType());
        existing.setGuruCost(Math.max(0, updates.getGuruCost()));
        existing.setRewardAmount(Math.max(0, updates.getRewardAmount()));
        existing.setRewardFallbackEnabled(updates.isRewardFallbackEnabled());
        existing.setAdRequired(updates.isAdRequired());
        existing.setPurchaseRequired(updates.isPurchaseRequired());
        existing.setPreviewAllowed(updates.isPreviewAllowed());
        existing.setEnabled(updates.isEnabled());
        existing.setDisplayPriority(Math.max(0, updates.getDisplayPriority()));
        existing.setDailyLimit(Math.max(0, updates.getDailyLimit()));
        existing.setWeeklyLimit(Math.max(0, updates.getWeeklyLimit()));
        existing.setUpdatedByAdminId(adminId);

        MonetizationAction saved = repository.save(existing);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_ACTION_UPDATED,
                AuditLog.EntityType.MONETIZATION_ACTION,
                saved.getId().toString(), saved.getActionKey(),
                null, saved);

        return saved;
    }

    @Transactional
    public void delete(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        MonetizationAction existing = findById(id);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.MONETIZATION_ACTION_DELETED,
                AuditLog.EntityType.MONETIZATION_ACTION,
                existing.getId().toString(), existing.getActionKey(),
                existing, null);

        repository.delete(existing);
    }
}
