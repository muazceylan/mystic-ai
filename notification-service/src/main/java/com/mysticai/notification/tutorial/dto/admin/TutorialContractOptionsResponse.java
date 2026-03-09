package com.mysticai.notification.tutorial.dto.admin;

import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import lombok.Builder;

import java.util.List;
import java.util.Map;

@Builder
public record TutorialContractOptionsResponse(
        List<String> screenKeys,
        Map<String, List<String>> targetKeysByScreen,
        List<TutorialPlatform> platformOptions,
        List<TutorialPresentationType> presentationTypeOptions,
        List<TutorialConfigStatus> statusOptions
) {
}
