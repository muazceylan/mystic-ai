package com.mysticai.astrology.dto.daily;

import java.util.List;

public record DailyTransitsDTO(
        String date,
        String title,
        Hero hero,
        List<QuickFact> quickFacts,
        TodayCanDo todayCanDo,
        List<FocusPoint> focusPoints,
        List<RetrogradeItem> retrogrades,
        List<TransitItem> transits
) {
    public record Hero(
            String headline,
            String supporting,
            String moodTag,
            int intensity,
            String icon,
            String gradientKey
    ) {}

    public record QuickFact(
            String id,
            String label,
            String value,
            String icon
    ) {}

    public record TodayCanDo(
            String headline,
            String body,
            String ctaText,
            String ctaRoute
    ) {}

    public record FocusPoint(
            String id,
            String text,
            int priority
    ) {}

    public record RetrogradeItem(
            String planet,
            String meaningPlain,
            String riskLevel
    ) {}

    public record TransitItem(
            String id,
            String titlePlain,
            String impactPlain,
            String label,
            String theme,
            String timeWindow,
            int confidence,
            Technical technical
    ) {}

    public record Technical(
            String transitPlanet,
            String natalPoint,
            String aspect,
            double orb,
            String exactAt,
            String house
    ) {}
}

