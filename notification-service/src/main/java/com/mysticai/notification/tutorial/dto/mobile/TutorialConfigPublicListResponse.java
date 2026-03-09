package com.mysticai.notification.tutorial.dto.mobile;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record TutorialConfigPublicListResponse(
        List<TutorialConfigPublicTutorialDto> tutorials,
        String configVersion,
        LocalDateTime fetchedAt
) {
}
