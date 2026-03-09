package com.mysticai.notification.tutorial.dto.admin;

import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record TutorialConfigAdminStepResponse(
        Long id,
        String stepId,
        Integer orderIndex,
        String title,
        String body,
        String targetKey,
        String iconKey,
        TutorialPresentationType presentationType,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
