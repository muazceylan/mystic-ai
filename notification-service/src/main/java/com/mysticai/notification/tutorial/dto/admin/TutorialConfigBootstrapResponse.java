package com.mysticai.notification.tutorial.dto.admin;

public record TutorialConfigBootstrapResponse(
        int createdCount,
        int skippedCount,
        int totalCount
) {
}
