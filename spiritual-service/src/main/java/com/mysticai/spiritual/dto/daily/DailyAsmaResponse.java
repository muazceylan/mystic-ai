package com.mysticai.spiritual.dto.daily;

import java.time.LocalDate;

public record DailyAsmaResponse(
        LocalDate date,
        String scope,
        Long asmaId,
        Integer orderNo,
        String arabicName,
        String nameTr,
        String transliterationTr,
        String meaningTr,
        String shortBenefitTr,
        String reflectionTextTr,
        String theme,
        Integer recommendedDhikrCount,
        String sourceNote
) {
}

