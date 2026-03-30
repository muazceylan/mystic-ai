package com.mysticai.notification.tutorial.mapper;

import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminStepRequest;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminStepResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminSummaryResponse;
import com.mysticai.notification.tutorial.dto.mobile.TutorialConfigPublicListResponse;
import com.mysticai.notification.tutorial.dto.mobile.TutorialConfigPublicStepDto;
import com.mysticai.notification.tutorial.dto.mobile.TutorialConfigPublicTutorialDto;
import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStep;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class TutorialConfigMapper {

    private final ObjectMapper objectMapper;

    public TutorialConfigAdminSummaryResponse toAdminSummary(TutorialConfig entity) {
        return TutorialConfigAdminSummaryResponse.builder()
                .id(entity.getId())
                .tutorialId(entity.getTutorialId())
                .name(entity.getName())
                .screenKey(entity.getScreenKey())
                .locale(entity.getLocale())
                .platform(entity.getPlatform())
                .version(entity.getVersion())
                .status(entity.getStatus())
                .isActive(entity.isActive())
                .priority(entity.getPriority())
                .updatedBy(entity.getUpdatedBy())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public TutorialConfigAdminResponse toAdminResponse(TutorialConfig entity) {
        return TutorialConfigAdminResponse.builder()
                .id(entity.getId())
                .tutorialId(entity.getTutorialId())
                .name(entity.getName())
                .screenKey(entity.getScreenKey())
                .platform(entity.getPlatform())
                .version(entity.getVersion())
                .status(entity.getStatus())
                .isActive(entity.isActive())
                .priority(entity.getPriority())
                .presentationType(entity.getPresentationType())
                .startAt(entity.getStartAt())
                .endAt(entity.getEndAt())
                .description(entity.getDescription())
                .audienceRules(entity.getAudienceRules())
                .minAppVersion(entity.getMinAppVersion())
                .maxAppVersion(entity.getMaxAppVersion())
                .locale(entity.getLocale())
                .experimentKey(entity.getExperimentKey())
                .rolloutPercentage(entity.getRolloutPercentage())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .publishedAt(entity.getPublishedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .steps(entity.getSteps().stream()
                        .sorted(Comparator.comparingInt(TutorialConfigStep::getOrderIndex))
                        .map(this::toAdminStepResponse)
                        .toList())
                .build();
    }

    public TutorialConfigPublicTutorialDto toPublicTutorialDto(TutorialConfig entity) {
        return TutorialConfigPublicTutorialDto.builder()
                .tutorialId(entity.getTutorialId())
                .name(entity.getName())
                .screenKey(entity.getScreenKey())
                .version(entity.getVersion())
                .isActive(entity.isActive())
                .platform(entity.getPlatform())
                .priority(entity.getPriority())
                .presentationType(entity.getPresentationType())
                .startAt(entity.getStartAt())
                .endAt(entity.getEndAt())
                .audienceRules(parseAudienceRules(entity.getAudienceRules()))
                .minAppVersion(entity.getMinAppVersion())
                .maxAppVersion(entity.getMaxAppVersion())
                .locale(entity.getLocale())
                .experimentKey(entity.getExperimentKey())
                .rolloutPercentage(entity.getRolloutPercentage())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .steps(entity.getSteps().stream()
                        .filter(TutorialConfigStep::isActive)
                        .sorted(Comparator.comparingInt(TutorialConfigStep::getOrderIndex))
                        .map(step -> toPublicStepDto(step, entity.getPresentationType()))
                        .toList())
                .build();
    }

    public TutorialConfigPublicListResponse toPublicListResponse(
            List<TutorialConfigPublicTutorialDto> tutorials,
            String configVersion,
            LocalDateTime fetchedAt
    ) {
        return TutorialConfigPublicListResponse.builder()
                .tutorials(tutorials)
                .configVersion(configVersion)
                .fetchedAt(fetchedAt)
                .build();
    }

    public List<TutorialConfigStep> toStepEntities(
            List<TutorialConfigAdminStepRequest> requestSteps,
            TutorialPresentationType parentPresentationType
    ) {
        return requestSteps.stream()
                .map(step -> toStepEntity(step, parentPresentationType))
                .toList();
    }

    private TutorialConfigStep toStepEntity(
            TutorialConfigAdminStepRequest request,
            TutorialPresentationType parentPresentationType
    ) {
        return TutorialConfigStep.builder()
                .stepId(request.getStepId())
                .orderIndex(request.getOrderIndex())
                .title(request.getTitle())
                .body(request.getBody())
                .targetKey(request.getTargetKey())
                .iconKey(request.getIconKey())
                .presentationType(request.getPresentationType() != null
                        ? request.getPresentationType()
                        : parentPresentationType)
                .isActive(Boolean.TRUE.equals(request.getIsActive()))
                .build();
    }

    private Object parseAudienceRules(String audienceRules) {
        if (audienceRules == null || audienceRules.isBlank()) {
            return null;
        }

        try {
            return objectMapper.readValue(audienceRules, new TypeReference<java.util.Map<String, Object>>() {});
        } catch (Exception ignored) {
            return null;
        }
    }

    private TutorialConfigAdminStepResponse toAdminStepResponse(TutorialConfigStep step) {
        return TutorialConfigAdminStepResponse.builder()
                .id(step.getId())
                .stepId(step.getStepId())
                .orderIndex(step.getOrderIndex())
                .title(step.getTitle())
                .body(step.getBody())
                .targetKey(step.getTargetKey())
                .iconKey(step.getIconKey())
                .presentationType(step.getPresentationType())
                .isActive(step.isActive())
                .createdAt(step.getCreatedAt())
                .updatedAt(step.getUpdatedAt())
                .build();
    }

    private TutorialConfigPublicStepDto toPublicStepDto(
            TutorialConfigStep step,
            TutorialPresentationType defaultPresentationType
    ) {
        return TutorialConfigPublicStepDto.builder()
                .stepId(step.getStepId())
                .order(step.getOrderIndex())
                .title(step.getTitle())
                .body(step.getBody())
                .targetKey(step.getTargetKey())
                .iconKey(step.getIconKey())
                .presentationType(step.getPresentationType() != null
                        ? step.getPresentationType()
                        : defaultPresentationType)
                .isActive(step.isActive())
                .build();
    }
}
