package com.mysticai.spiritual.dto.daily;

public record AsmaListItemResponse(
        Long id,
        Integer orderNo,
        String arabicName,
        String transliterationTr,
        String meaningTr,
        String theme,
        Integer recommendedDhikrCount
) {
}

