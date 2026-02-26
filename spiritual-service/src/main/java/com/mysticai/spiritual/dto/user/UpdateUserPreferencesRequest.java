package com.mysticai.spiritual.dto.user;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateUserPreferencesRequest(
        @Pattern(regexp = "tr|en|ar") String contentLanguage,
        @DecimalMin("0.80") @DecimalMax("2.00") BigDecimal fontScale,
        Boolean readingModeEnabled,
        Boolean keepScreenAwake,
        Boolean ttsEnabled,
        @Pattern(regexp = "tr|en|ar") String ttsDefaultLang,
        @Size(max = 120) String ttsVoiceId,
        Boolean prayerCounterHaptic,
        Boolean reminderEnabled,
        @Size(max = 4000) String reminderScheduleJson,
        Boolean shortPrayersEnabled,
        Boolean privacyExportEnabled,
        @Size(max = 4000) String abOverridesJson
) {
}

