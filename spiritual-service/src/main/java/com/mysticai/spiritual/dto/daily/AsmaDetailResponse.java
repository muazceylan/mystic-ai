package com.mysticai.spiritual.dto.daily;

public record AsmaDetailResponse(
        Long id,
        Integer orderNo,
        String arabicName,
        String transliterationTr,
        String meaningTr,
        String reflectionTextTr,
        String theme,
        Integer recommendedDhikrCount,
        String sourceNote
) {
}

