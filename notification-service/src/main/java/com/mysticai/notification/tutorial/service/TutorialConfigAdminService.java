package com.mysticai.notification.tutorial.service;

import com.mysticai.notification.admin.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.tutorial.contract.TutorialContractCatalog;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminStepRequest;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminSummaryResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminUpsertRequest;
import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.mapper.TutorialConfigMapper;
import com.mysticai.notification.tutorial.repository.TutorialConfigRepository;
import com.mysticai.notification.tutorial.spec.TutorialConfigSpec;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TutorialConfigAdminService {

    private final TutorialConfigRepository repository;
    private final TutorialConfigMapper mapper;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public Page<TutorialConfigAdminSummaryResponse> findAll(
            String screenKey,
            TutorialConfigStatus status,
            Boolean isActive,
            TutorialPlatform platform,
            Pageable pageable
    ) {
        return repository
                .findAll(TutorialConfigSpec.filter(screenKey, status, isActive, platform), pageable)
                .map(mapper::toAdminSummary);
    }

    public TutorialConfigAdminResponse findById(Long id) {
        return mapper.toAdminResponse(requireEntity(id));
    }

    @Transactional
    public TutorialConfigAdminResponse create(
            TutorialConfigAdminUpsertRequest request,
            Long adminId,
            String adminEmail,
            AdminUser.Role role
    ) {
        String tutorialId = normalizeRequired(request.getTutorialId(), "tutorialId");
        validateDateWindow(request);
        validateAudienceRulesPayload(request.getAudienceRules());
        validateStepIntegrity(request.getSteps());
        String screenKey = normalizeRequired(request.getScreenKey(), "screenKey");
        validateContractKeys(screenKey, request.getSteps());

        if (repository.existsByTutorialId(tutorialId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "tutorialId already exists: " + tutorialId);
        }

        TutorialConfigStatus nextStatus = request.getStatus() != null
                ? request.getStatus()
                : TutorialConfigStatus.DRAFT;

        if (nextStatus == TutorialConfigStatus.PUBLISHED) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Use publish endpoint after creating draft"
            );
        }

        TutorialConfig entity = TutorialConfig.builder()
                .tutorialId(tutorialId)
                .name(normalizeRequired(request.getName(), "name"))
                .screenKey(screenKey)
                .platform(request.getPlatform())
                .version(request.getVersion())
                .status(nextStatus)
                .isActive(Boolean.TRUE.equals(request.getIsActive()))
                .priority(request.getPriority())
                .presentationType(request.getPresentationType())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .description(normalizeNullable(request.getDescription()))
                .audienceRules(normalizeNullable(request.getAudienceRules()))
                .minAppVersion(normalizeNullable(request.getMinAppVersion()))
                .maxAppVersion(normalizeNullable(request.getMaxAppVersion()))
                .locale(normalizeNullable(request.getLocale()))
                .experimentKey(normalizeNullable(request.getExperimentKey()))
                .rolloutPercentage(request.getRolloutPercentage())
                .createdBy(resolveActor(adminId, adminEmail))
                .updatedBy(resolveActor(adminId, adminEmail))
                .build();

        if (nextStatus == TutorialConfigStatus.ARCHIVED) {
            entity.setActive(false);
        }

        entity.replaceSteps(mapper.toStepEntities(request.getSteps(), request.getPresentationType()));

        TutorialConfig saved = repository.save(entity);
        auditLogService.log(
                adminId,
                adminEmail,
                role,
                AuditLog.ActionType.TUTORIAL_CONFIG_CREATED,
                AuditLog.EntityType.TUTORIAL_CONFIG,
                String.valueOf(saved.getId()),
                saved.getTutorialId(),
                null,
                mapper.toAdminResponse(saved)
        );

        return mapper.toAdminResponse(saved);
    }

    @Transactional
    public TutorialConfigAdminResponse update(
            Long id,
            TutorialConfigAdminUpsertRequest request,
            Long adminId,
            String adminEmail,
            AdminUser.Role role
    ) {
        TutorialConfig existing = requireEntity(id);
        validateDateWindow(request);
        validateAudienceRulesPayload(request.getAudienceRules());
        validateStepIntegrity(request.getSteps());
        String screenKey = normalizeRequired(request.getScreenKey(), "screenKey");
        validateContractKeys(screenKey, request.getSteps());

        String tutorialId = normalizeRequired(request.getTutorialId(), "tutorialId");
        if (repository.existsByTutorialIdAndIdNot(tutorialId, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "tutorialId already exists: " + tutorialId);
        }

        if (request.getStatus() == TutorialConfigStatus.PUBLISHED) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Use publish endpoint to move config into PUBLISHED"
            );
        }

        TutorialConfigStatus nextStatus = request.getStatus() != null
                ? request.getStatus()
                : existing.getStatus();

        String oldSnapshot = mapper.toAdminResponse(existing).toString();

        existing.setTutorialId(tutorialId);
        existing.setName(normalizeRequired(request.getName(), "name"));
        existing.setScreenKey(screenKey);
        existing.setPlatform(request.getPlatform());
        existing.setVersion(request.getVersion());
        existing.setPriority(request.getPriority());
        existing.setPresentationType(request.getPresentationType());
        existing.setStartAt(request.getStartAt());
        existing.setEndAt(request.getEndAt());
        existing.setDescription(normalizeNullable(request.getDescription()));
        existing.setAudienceRules(normalizeNullable(request.getAudienceRules()));
        existing.setMinAppVersion(normalizeNullable(request.getMinAppVersion()));
        existing.setMaxAppVersion(normalizeNullable(request.getMaxAppVersion()));
        existing.setLocale(normalizeNullable(request.getLocale()));
        existing.setExperimentKey(normalizeNullable(request.getExperimentKey()));
        existing.setRolloutPercentage(request.getRolloutPercentage());
        existing.setStatus(nextStatus);
        existing.setActive(Boolean.TRUE.equals(request.getIsActive()));
        existing.setUpdatedBy(resolveActor(adminId, adminEmail));

        if (nextStatus == TutorialConfigStatus.ARCHIVED) {
            existing.setActive(false);
        }

        // Two-phase replacement avoids unique constraint collisions on (tutorial_config_id, step_id)
        // when Hibernate schedules inserts before orphan removals within the same flush cycle.
        var nextSteps = mapper.toStepEntities(request.getSteps(), request.getPresentationType());
        existing.replaceSteps(java.util.Collections.emptyList());
        repository.saveAndFlush(existing);
        existing.replaceSteps(nextSteps);

        TutorialConfig saved = repository.save(existing);

        auditLogService.log(
                adminId,
                adminEmail,
                role,
                AuditLog.ActionType.TUTORIAL_CONFIG_UPDATED,
                AuditLog.EntityType.TUTORIAL_CONFIG,
                String.valueOf(saved.getId()),
                saved.getTutorialId(),
                oldSnapshot,
                mapper.toAdminResponse(saved)
        );

        return mapper.toAdminResponse(saved);
    }

    @Transactional
    public TutorialConfigAdminResponse activate(
            Long id,
            Long adminId,
            String adminEmail,
            AdminUser.Role role
    ) {
        TutorialConfig existing = requireEntity(id);

        if (existing.getStatus() == TutorialConfigStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Archived tutorial cannot be activated");
        }

        existing.setActive(true);
        existing.setUpdatedBy(resolveActor(adminId, adminEmail));
        TutorialConfig saved = repository.save(existing);

        auditLogService.log(
                adminId,
                adminEmail,
                role,
                AuditLog.ActionType.TUTORIAL_CONFIG_ACTIVATED,
                AuditLog.EntityType.TUTORIAL_CONFIG,
                String.valueOf(saved.getId()),
                saved.getTutorialId(),
                null,
                null
        );

        return mapper.toAdminResponse(saved);
    }

    @Transactional
    public TutorialConfigAdminResponse deactivate(
            Long id,
            Long adminId,
            String adminEmail,
            AdminUser.Role role
    ) {
        TutorialConfig existing = requireEntity(id);

        existing.setActive(false);
        existing.setUpdatedBy(resolveActor(adminId, adminEmail));
        TutorialConfig saved = repository.save(existing);

        auditLogService.log(
                adminId,
                adminEmail,
                role,
                AuditLog.ActionType.TUTORIAL_CONFIG_DEACTIVATED,
                AuditLog.EntityType.TUTORIAL_CONFIG,
                String.valueOf(saved.getId()),
                saved.getTutorialId(),
                null,
                null
        );

        return mapper.toAdminResponse(saved);
    }

    TutorialConfig requireEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tutorial config not found: " + id));
    }

    private void validateDateWindow(TutorialConfigAdminUpsertRequest request) {
        if (request.getStartAt() != null && request.getEndAt() != null
                && request.getStartAt().isAfter(request.getEndAt())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "startAt cannot be after endAt");
        }
    }

    private void validateStepIntegrity(java.util.List<TutorialConfigAdminStepRequest> steps) {
        if (steps == null || steps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "At least one step is required");
        }

        Set<String> stepIds = new HashSet<>();
        Set<Integer> orderIndices = new HashSet<>();

        boolean hasActiveStep = false;

        for (TutorialConfigAdminStepRequest step : steps) {
            String normalizedStepId = normalizeRequired(step.getStepId(), "step.stepId");
            if (!stepIds.add(normalizedStepId)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Duplicate stepId: " + normalizedStepId);
            }

            Integer orderIndex = step.getOrderIndex();
            if (!orderIndices.add(orderIndex)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Duplicate orderIndex: " + orderIndex);
            }

            if (Boolean.TRUE.equals(step.getIsActive())) {
                hasActiveStep = true;
            }
        }

        if (!hasActiveStep) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "At least one active step is required"
            );
        }
    }

    private void validateContractKeys(String screenKey, java.util.List<TutorialConfigAdminStepRequest> steps) {
        if (!TutorialContractCatalog.isSupportedScreenKey(screenKey)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Unsupported screenKey: " + screenKey);
        }

        for (TutorialConfigAdminStepRequest step : steps) {
            String targetKey = normalizeRequired(step.getTargetKey(), "step.targetKey");
            if (!TutorialContractCatalog.isSupportedTargetKey(screenKey, targetKey)) {
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Unsupported targetKey for screen `" + screenKey + "`: " + targetKey
                );
            }
        }
    }

    private void validateAudienceRulesPayload(String audienceRules) {
        String normalized = normalizeNullable(audienceRules);
        if (normalized == null) {
            return;
        }

        try {
            var jsonNode = objectMapper.readTree(normalized);
            if (!jsonNode.isObject()) {
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "audienceRules must be valid JSON object"
                );
            }
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "audienceRules must be valid JSON object"
            );
        }
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = normalizeNullable(value);
        if (normalized == null || normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String resolveActor(Long adminId, String adminEmail) {
        if (adminEmail != null && !adminEmail.isBlank()) {
            return adminEmail.trim();
        }
        return adminId != null ? "admin:" + adminId : null;
    }
}
