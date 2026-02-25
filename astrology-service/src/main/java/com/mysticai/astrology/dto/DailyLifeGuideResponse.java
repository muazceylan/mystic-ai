package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response payload for the daily life guide dashboard widget.
 */
public record DailyLifeGuideResponse(
        Long userId,
        LocalDate date,
        String locale,
        String userGender,
        String maritalStatus,
        int overallScore,
        String source,
        List<DailyLifeGuideGroupSummary> groups,
        List<DailyLifeGuideActivity> activities,
        LocalDateTime generatedAt
) {}
