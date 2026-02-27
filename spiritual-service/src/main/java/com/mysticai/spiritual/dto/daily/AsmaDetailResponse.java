package com.mysticai.spiritual.dto.daily;

public record AsmaDetailResponse(
        Long id,
        Integer orderNo,
        String arabicName,
        String nameTr,
        String transliterationTr,
        String meaningTr,
        String shortBenefitTr,
        String reflectionTextTr,
        String theme,
        String tagsJson,
        Integer recommendedDhikrCount,
        String sourceProvider,
        String sourceNote
) {
}

