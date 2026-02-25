package com.mysticai.astrology.dto;

import java.time.LocalDateTime;

public record StarMateActionResponse(
        boolean accepted,
        String actionType,
        Long targetUserId,
        boolean mutualMatch,
        Long matchId,
        Integer compatibilityScore,
        boolean notificationTriggered,
        LocalDateTime processedAt
) {}
