package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.NotificationTriggerSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.repository.NotificationTriggerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationTriggerService {

    private final NotificationTriggerRepository repository;
    private final AuditLogService auditLogService;

    public Page<NotificationTrigger> findAll(
            NotificationTrigger.CadenceType cadenceType,
            NotificationTrigger.SourceType sourceType,
            NotificationTrigger.RunStatus lastRunStatus,
            Boolean isActive,
            String ownerModule,
            Pageable pageable) {
        return repository.findAll(
                NotificationTriggerSpec.filter(cadenceType, sourceType, lastRunStatus, isActive, ownerModule),
                pageable);
    }

    public NotificationTrigger findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("NotificationTrigger not found: " + id));
    }

    @Transactional
    public NotificationTrigger enable(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        NotificationTrigger trigger = findById(id);
        if (trigger.isSystemCritical()) {
            throw new IllegalStateException("Cannot enable/disable a system-critical trigger");
        }
        if (!trigger.isPausable()) {
            throw new IllegalStateException("This trigger is not pausable");
        }
        trigger.setActive(true);
        NotificationTrigger saved = repository.save(trigger);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_TRIGGER_ENABLED, AuditLog.EntityType.NOTIFICATION_TRIGGER,
                saved.getId().toString(), saved.getTriggerKey(), null, null);
        return saved;
    }

    @Transactional
    public NotificationTrigger disable(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        NotificationTrigger trigger = findById(id);
        if (trigger.isSystemCritical()) {
            throw new IllegalStateException("Cannot disable a system-critical trigger");
        }
        if (!trigger.isPausable()) {
            throw new IllegalStateException("This trigger is not pausable");
        }
        trigger.setActive(false);
        NotificationTrigger saved = repository.save(trigger);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_TRIGGER_DISABLED, AuditLog.EntityType.NOTIFICATION_TRIGGER,
                saved.getId().toString(), saved.getTriggerKey(), null, null);
        return saved;
    }

    /**
     * Called by scheduler methods before executing a job to check if trigger is active.
     * Returns false if the trigger is disabled (caller should skip execution).
     */
    public boolean isActive(String triggerKey) {
        return repository.findByTriggerKey(triggerKey)
                .map(NotificationTrigger::isActive)
                .orElse(true); // default to active if not registered yet
    }

    /**
     * Called by scheduler methods after each run to record runtime stats.
     * Fire-and-forget: errors are logged but not propagated.
     */
    @Transactional
    public void recordRun(String triggerKey, NotificationTrigger.RunStatus status,
                          int producedCount, String message) {
        try {
            repository.findByTriggerKey(triggerKey).ifPresent(trigger -> {
                trigger.setLastRunAt(LocalDateTime.now());
                trigger.setLastRunStatus(status);
                trigger.setLastProducedCount(producedCount);
                if (message != null) {
                    trigger.setLastRunMessage(message.length() > 500 ? message.substring(0, 497) + "..." : message);
                } else {
                    trigger.setLastRunMessage(null);
                }
                repository.save(trigger);
            });
        } catch (Exception e) {
            log.warn("[TriggerMonitor] Failed to record run for {}: {}", triggerKey, e.getMessage());
        }
    }

    /** Called by TriggerRegistrar on startup — upsert by triggerKey. */
    @Transactional
    public void upsert(NotificationTrigger trigger) {
        repository.findByTriggerKey(trigger.getTriggerKey()).ifPresentOrElse(
                existing -> {
                    // Update metadata but preserve runtime status fields and admin-toggled isActive
                    existing.setDisplayName(trigger.getDisplayName());
                    existing.setDescription(trigger.getDescription());
                    existing.setDefinitionKey(trigger.getDefinitionKey());
                    existing.setCadenceType(trigger.getCadenceType());
                    existing.setSourceType(trigger.getSourceType());
                    existing.setCronExpression(trigger.getCronExpression());
                    existing.setFixedDelayMs(trigger.getFixedDelayMs());
                    existing.setTimezone(trigger.getTimezone());
                    existing.setPausable(trigger.isPausable());
                    existing.setSystemCritical(trigger.isSystemCritical());
                    existing.setOwnerModule(trigger.getOwnerModule());
                    existing.setCodeReference(trigger.getCodeReference());
                    repository.save(existing);
                    log.debug("[TriggerRegistrar] Updated trigger: {}", trigger.getTriggerKey());
                },
                () -> {
                    repository.save(trigger);
                    log.info("[TriggerRegistrar] Registered new trigger: {}", trigger.getTriggerKey());
                }
        );
    }
}
