package com.mysticai.astrology.dto.cosmicplanner;

import java.util.List;

public record CategoryScoreDTO(
        String key,
        int score,
        String summary,
        List<String> tags
) {}
