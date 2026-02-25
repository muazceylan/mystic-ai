package com.mysticai.astrology.dto;

import java.util.List;

public record CosmicCategoryDetail(
        String categoryKey,
        String categoryLabel,
        int score,
        List<String> dos,
        List<String> donts,
        String reasoning,
        List<String> supportingAspects,
        List<CosmicDetailSubcategory> subcategories
) {}

