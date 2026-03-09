package com.mysticai.notification.tutorial.service;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.tutorial.contract.TutorialContractCatalog;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminResponse;
import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.mapper.TutorialConfigMapper;
import com.mysticai.notification.tutorial.repository.TutorialConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TutorialConfigPublishService {

    private final TutorialConfigRepository repository;
    private final TutorialConfigMapper mapper;
    private final TutorialConfigAdminService adminService;
    private final AuditLogService auditLogService;

    @Transactional
    public TutorialConfigAdminResponse publish(
            Long id,
            Long adminId,
            String adminEmail,
            AdminUser.Role role
    ) {
        TutorialConfig config = adminService.requireEntity(id);

        if (config.getStatus() == TutorialConfigStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Archived tutorial cannot be published");
        }

        if (config.getStatus() == TutorialConfigStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tutorial is already published");
        }

        validatePublishable(config);

        config.setStatus(TutorialConfigStatus.PUBLISHED);
        config.setActive(true);
        config.setPublishedAt(LocalDateTime.now());
        config.setUpdatedBy(resolveActor(adminId, adminEmail));

        TutorialConfig saved = repository.save(config);

        auditLogService.log(
                adminId,
                adminEmail,
                role,
                AuditLog.ActionType.TUTORIAL_CONFIG_PUBLISHED,
                AuditLog.EntityType.TUTORIAL_CONFIG,
                String.valueOf(saved.getId()),
                saved.getTutorialId(),
                null,
                null
        );

        return mapper.toAdminResponse(saved);
    }

    @Transactional
    public TutorialConfigAdminResponse archive(
            Long id,
            Long adminId,
            String adminEmail,
            AdminUser.Role role
    ) {
        TutorialConfig config = adminService.requireEntity(id);

        config.setStatus(TutorialConfigStatus.ARCHIVED);
        config.setActive(false);
        config.setUpdatedBy(resolveActor(adminId, adminEmail));

        TutorialConfig saved = repository.save(config);

        auditLogService.log(
                adminId,
                adminEmail,
                role,
                AuditLog.ActionType.TUTORIAL_CONFIG_ARCHIVED,
                AuditLog.EntityType.TUTORIAL_CONFIG,
                String.valueOf(saved.getId()),
                saved.getTutorialId(),
                null,
                null
        );

        return mapper.toAdminResponse(saved);
    }

    private void validatePublishable(TutorialConfig config) {
        if (config.getTutorialId() == null || config.getTutorialId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "tutorialId is required");
        }

        if (config.getName() == null || config.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "name is required");
        }

        if (config.getScreenKey() == null || config.getScreenKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "screenKey is required");
        }

        if (!TutorialContractCatalog.isSupportedScreenKey(config.getScreenKey())) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Unsupported screenKey: " + config.getScreenKey()
            );
        }

        if (config.getVersion() < 1) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "version must be >= 1");
        }

        if (config.getStartAt() != null && config.getEndAt() != null && config.getStartAt().isAfter(config.getEndAt())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "startAt cannot be after endAt");
        }

        if (config.getRolloutPercentage() != null
                && (config.getRolloutPercentage() < 0 || config.getRolloutPercentage() > 100)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "rolloutPercentage must be between 0 and 100");
        }

        if (config.getSteps().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "At least one step is required");
        }

        boolean hasActiveStep = config.getSteps().stream().anyMatch(step -> step.isActive());
        if (!hasActiveStep) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "At least one active step is required");
        }

        Set<Integer> orderIndexSet = new HashSet<>();
        Set<String> stepIdSet = new HashSet<>();

        config.getSteps().forEach(step -> {
            if (step.getTitle() == null || step.getTitle().isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "step title is required");
            }
            if (step.getBody() == null || step.getBody().isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "step body is required");
            }
            if (step.getTargetKey() == null || step.getTargetKey().isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "step targetKey is required");
            }

            if (!TutorialContractCatalog.isSupportedTargetKey(config.getScreenKey(), step.getTargetKey())) {
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Unsupported targetKey for screen `" + config.getScreenKey() + "`: " + step.getTargetKey()
                );
            }

            if (!orderIndexSet.add(step.getOrderIndex())) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Duplicate step orderIndex: " + step.getOrderIndex());
            }

            if (!stepIdSet.add(step.getStepId())) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Duplicate stepId: " + step.getStepId());
            }
        });
    }

    private String resolveActor(Long adminId, String adminEmail) {
        if (adminEmail != null && !adminEmail.isBlank()) {
            return adminEmail.trim();
        }
        return adminId != null ? "admin:" + adminId : null;
    }
}
