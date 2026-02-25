package com.mysticai.astrology.dto;

import java.util.List;

/**
 * Categorized synastry analysis group for accordion rendering.
 */
public record SynastryAnalysisSection(
        String id,
        String title,
        String subtitle,
        Integer score,
        String summary,
        String tone,
        List<CrossAspect> aspects
) {}
