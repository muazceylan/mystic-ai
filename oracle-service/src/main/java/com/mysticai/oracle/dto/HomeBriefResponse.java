package com.mysticai.oracle.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Homepage-focused payload with non-technical copy and weekly cards.
 */
public record HomeBriefResponse(
        String greeting,
        String dailyEnergy,
        String transitHeadline,
        String transitSummary,
        List<String> transitPoints,
        String secret,
        String actionMessage,
        List<WeeklyCard> weeklyCards,
        Meta meta,
        LocalDateTime generatedAt
) {
    public HomeBriefResponse {
        if (transitPoints == null) {
            transitPoints = List.of();
        }
        if (weeklyCards == null) {
            weeklyCards = List.of();
        }
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
    }

    public record WeeklyCard(
            String key,
            String title,
            String headline,
            String subtext,
            String quickTip,
            String accent
    ) {}

    public record Meta(
            String promptVersion,
            String promptVariant,
            Integer readabilityScore,
            Integer impactScore
    ) {}
}
