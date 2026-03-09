package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.NotificationDefinitionSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.NotificationDefinition;
import com.mysticai.notification.repository.NotificationDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDefinitionService {

    private final NotificationDefinitionRepository repository;
    private final AuditLogService auditLogService;

    public Page<NotificationDefinition> findAll(
            NotificationDefinition.CadenceType cadenceType,
            NotificationDefinition.ChannelType channelType,
            NotificationDefinition.SourceType sourceType,
            NotificationDefinition.TriggerType triggerType,
            Boolean isActive,
            String ownerModule,
            Pageable pageable) {
        return repository.findAll(
                NotificationDefinitionSpec.filter(cadenceType, channelType, sourceType, triggerType, isActive, ownerModule),
                pageable);
    }

    public NotificationDefinition findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("NotificationDefinition not found: " + id));
    }

    public NotificationDefinition findByKey(String definitionKey) {
        return repository.findByDefinitionKey(definitionKey)
                .orElseThrow(() -> new IllegalArgumentException("NotificationDefinition not found: " + definitionKey));
    }

    @Transactional
    public NotificationDefinition activate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        NotificationDefinition def = findById(id);
        if (def.isSystemCritical()) {
            throw new IllegalStateException("Cannot deactivate/activate a system-critical definition from the admin panel");
        }
        def.setActive(true);
        NotificationDefinition saved = repository.save(def);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_DEFINITION_UPDATED, AuditLog.EntityType.NOTIFICATION_DEFINITION,
                saved.getId().toString(), saved.getDefinitionKey(), null, saved);
        return saved;
    }

    @Transactional
    public NotificationDefinition deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        NotificationDefinition def = findById(id);
        if (def.isSystemCritical()) {
            throw new IllegalStateException("Cannot deactivate a system-critical definition");
        }
        def.setActive(false);
        NotificationDefinition saved = repository.save(def);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_DEFINITION_UPDATED, AuditLog.EntityType.NOTIFICATION_DEFINITION,
                saved.getId().toString(), saved.getDefinitionKey(), null, saved);
        return saved;
    }

    @Transactional
    public NotificationDefinition update(Long id, NotificationDefinition updates,
                                          Long adminId, String adminEmail, AdminUser.Role role) {
        NotificationDefinition def = findById(id);
        if (!def.isEditable()) {
            throw new IllegalStateException("This definition is not editable");
        }
        if (updates.getDisplayName() != null) def.setDisplayName(updates.getDisplayName());
        if (updates.getDescription() != null) def.setDescription(updates.getDescription());
        if (updates.getDefaultRouteKey() != null) def.setDefaultRouteKey(updates.getDefaultRouteKey());
        if (updates.getDefaultFallbackRouteKey() != null) def.setDefaultFallbackRouteKey(updates.getDefaultFallbackRouteKey());
        if (updates.getChannelType() != null) def.setChannelType(updates.getChannelType());
        NotificationDefinition saved = repository.save(def);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_DEFINITION_UPDATED, AuditLog.EntityType.NOTIFICATION_DEFINITION,
                saved.getId().toString(), saved.getDefinitionKey(), null, saved);
        return saved;
    }

    /** Called by TriggerRegistrar on startup — upsert by definitionKey. */
    @Transactional
    public void upsert(NotificationDefinition def) {
        repository.findByDefinitionKey(def.getDefinitionKey()).ifPresentOrElse(
                existing -> {
                    // Only update metadata fields, never override isActive (admin may have toggled it)
                    existing.setDisplayName(def.getDisplayName());
                    existing.setDescription(def.getDescription());
                    existing.setOwnerModule(def.getOwnerModule());
                    existing.setCodeReference(def.getCodeReference());
                    existing.setCadenceType(def.getCadenceType());
                    existing.setChannelType(def.getChannelType());
                    existing.setSourceType(def.getSourceType());
                    existing.setTriggerType(def.getTriggerType());
                    existing.setSystemCritical(def.isSystemCritical());
                    existing.setEditable(def.isEditable());
                    existing.setDefaultRouteKey(def.getDefaultRouteKey());
                    repository.save(existing);
                },
                () -> repository.save(def)
        );
    }
}
