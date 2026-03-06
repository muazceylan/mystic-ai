package com.mysticai.astrology.dto;

import java.util.List;

public record MatchTraitsResponse(
        Long matchId,
        Integer compatibilityScore,
        List<CategoryGroup> categories,
        List<TraitAxis> cardAxes,
        String cardSummary,
        String module,
        Overall overall,
        Summary summary,
        List<MetricCard> metricCards,
        TopDrivers topDrivers,
        List<ThemeSection> themeSections,
        Explainability explainability
) {
    public record Overall(
            Integer score,
            String levelLabel,
            Double confidence,
            String confidenceLabel,
            Integer percentile
    ) {}

    public record Summary(
            String headline,
            String shortNarrative,
            String dailyLifeHint
    ) {}

    public record MetricCard(
            String id,
            String title,
            Integer score,
            String status,
            String insight
    ) {}

    public record DriverItem(
            String title,
            Integer impact,
            String why,
            String hint
    ) {}

    public record TopDrivers(
            List<DriverItem> supportive,
            List<DriverItem> challenging,
            List<DriverItem> growth
    ) {}

    public record ThemeSectionCard(
            String title,
            String description,
            String actionHint
    ) {}

    public record ThemeSection(
            String theme,
            Integer score,
            String miniInsight,
            List<ThemeSectionCard> cards
    ) {}

    public record Explainability(
            String calculationVersion,
            List<String> factorsUsed,
            String dataQuality,
            String generatedAt,
            String distributionWarning,
            String missingBirthTimeImpact,
            String moduleScoringProfile
    ) {}
}
