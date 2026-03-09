package com.mysticai.notification.tutorial.dto.admin;

import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record TutorialConfigAdminSummaryResponse(
        Long id,
        String tutorialId,
        String name,
        String screenKey,
        TutorialPlatform platform,
        Integer version,
        TutorialConfigStatus status,
        Boolean isActive,
        Integer priority,
        String updatedBy,
        LocalDateTime updatedAt
) {
}
