package com.mysticai.astrology.event;

import java.time.LocalDateTime;

public record StarMateMatchEvent(
        Long matchId,
        Long userAId,
        Long userBId,
        Integer compatibilityScore,
        String compatibilitySummary,
        LocalDateTime occurredAt
) {}
