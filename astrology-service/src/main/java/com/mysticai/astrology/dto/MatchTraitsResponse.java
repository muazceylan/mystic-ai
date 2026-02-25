package com.mysticai.astrology.dto;

import java.util.List;

public record MatchTraitsResponse(
        Long matchId,
        Integer compatibilityScore,
        List<CategoryGroup> categories,
        List<TraitAxis> cardAxes,
        String cardSummary
) {}
