package com.mysticai.notification.tutorial.dto.mobile;

import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record TutorialConfigPublicTutorialDto(
        String tutorialId,
        String name,
        String screenKey,
        Integer version,
        Boolean isActive,
        TutorialPlatform platform,
        Integer priority,
        TutorialPresentationType presentationType,
        LocalDateTime startAt,
        LocalDateTime endAt,
        Object audienceRules,
        String minAppVersion,
        String maxAppVersion,
        String locale,
        String experimentKey,
        Integer rolloutPercentage,
        TutorialConfigStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<TutorialConfigPublicStepDto> steps
) {
}
