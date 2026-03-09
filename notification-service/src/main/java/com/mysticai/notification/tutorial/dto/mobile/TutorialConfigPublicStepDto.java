package com.mysticai.notification.tutorial.dto.mobile;

import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import lombok.Builder;

@Builder
public record TutorialConfigPublicStepDto(
        String stepId,
        Integer order,
        String title,
        String body,
        String targetKey,
        String iconKey,
        TutorialPresentationType presentationType,
        Boolean isActive
) {
}
