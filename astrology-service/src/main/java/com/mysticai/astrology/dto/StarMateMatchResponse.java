package com.mysticai.astrology.dto;

import java.time.LocalDateTime;
import java.util.List;

public record StarMateMatchResponse(
        Long matchId,
        Long partnerUserId,
        String partnerName,
        Integer partnerAge,
        String partnerGender,
        String partnerSunSign,
        String partnerMoonSign,
        String partnerRisingSign,
        Integer compatibilityScore,
        String compatibilitySummary,
        List<String> photos,
        String chatPreview,
        Integer unreadCount,
        String icebreaker,
        LocalDateTime createdAt
) {}
