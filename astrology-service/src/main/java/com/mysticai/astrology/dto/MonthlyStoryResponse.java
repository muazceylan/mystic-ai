package com.mysticai.astrology.dto;

import java.util.List;

public record MonthlyStoryResponse(
        Long id,
        Long userId,
        String yearMonth,
        String story,
        int dreamCount,
        List<String> dominantSymbols,
        String status,
        String createdAt
) {}
