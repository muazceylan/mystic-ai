package com.mysticai.notification.tutorial.dto.admin;

import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record TutorialConfigAdminResponse(
        Long id,
        String tutorialId,
        String name,
        String screenKey,
        TutorialPlatform platform,
        Integer version,
        TutorialConfigStatus status,
        Boolean isActive,
        Integer priority,
        TutorialPresentationType presentationType,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String description,
        String audienceRules,
        String minAppVersion,
        String maxAppVersion,
        String locale,
        String experimentKey,
        Integer rolloutPercentage,
        String createdBy,
        String updatedBy,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<TutorialConfigAdminStepResponse> steps
) {
}
