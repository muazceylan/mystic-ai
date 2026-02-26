package com.mysticai.spiritual.dto.daily;

import java.time.LocalDate;
import java.util.List;

public record DailyPrayerSetResponse(
        LocalDate date,
        String scope,
        Long setId,
        String variant,
        List<PrayerSetItemResponse> items
) {
}

