package com.mysticai.spiritual.dto.daily;

public record AsmaListItemResponse(
        Long id,
        Integer orderNo,
        String arabicName,
        String nameTr,
        String transliterationTr,
        String meaningTr,
        String shortBenefitTr,
        String theme,
        Integer recommendedDhikrCount
) {
}

