package com.mysticai.astrology.dto;

import java.util.List;

public record CosmicDetailSubcategory(
        String subCategoryKey,
        String label,
        String colorHex,
        int score,
        String shortAdvice,
        String technicalExplanation,
        String insight,
        List<String> triggerNotes
) {}

