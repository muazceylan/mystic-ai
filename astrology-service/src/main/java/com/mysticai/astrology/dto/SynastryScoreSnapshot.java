package com.mysticai.astrology.dto;

import java.util.Map;

public record SynastryScoreSnapshot(
        Integer baseHarmonyScore,
        Map<String, SynastryModuleScore> moduleScores,
        Double confidence,
        String confidenceLabel,
        String dataQuality,
        String distributionWarning,
        String missingBirthTimeImpact,
        String scoringVersion
) {}
