package com.mysticai.spiritual.dto.user;

import java.math.BigDecimal;

public record UserPreferencesResponse(
        Long userId,
        String contentLanguage,
        BigDecimal fontScale,
        Boolean readingModeEnabled,
        Boolean keepScreenAwake,
        Boolean ttsEnabled,
        String ttsDefaultLang,
        String ttsVoiceId,
        Boolean prayerCounterHaptic,
        Boolean reminderEnabled,
        String reminderScheduleJson,
        Boolean shortPrayersEnabled,
        Boolean privacyExportEnabled,
        String abOverridesJson
) {
}

