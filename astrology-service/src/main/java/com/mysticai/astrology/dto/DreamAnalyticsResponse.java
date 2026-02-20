package com.mysticai.astrology.dto;

import java.util.List;
import java.util.Map;

public record DreamAnalyticsResponse(
        Long userId,
        int totalDreams,
        int completedDreams,
        int pendingDreams,
        /** symbol → count, top 20 */
        List<SymbolInsight> symbolInsights,
        /** dreams per month: {"2026-01": 4, "2026-02": 7} */
        Map<String, Long> dreamsByMonth,
        /** house → how many dreams referenced it */
        Map<String, Long> houseFrequency,
        /** streak: consecutive days with at least one dream */
        int currentStreak,
        int longestStreak
) {}
