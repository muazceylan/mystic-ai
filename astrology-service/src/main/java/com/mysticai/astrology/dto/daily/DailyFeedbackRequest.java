package com.mysticai.astrology.dto.daily;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * @param date   the user's LOCAL calendar day the rating applies to
 * @param reason optional structured reason (see {@link PlanFeedbackReason}). Older clients omit
 *               it and keep working; when present it can trigger a rebuild of the day's plan.
 * @param locale locale to rebuild in; defaults to Turkish when absent
 */
public record DailyFeedbackRequest(
        @NotNull LocalDate date,
        @NotBlank String itemType,
        @NotBlank String itemId,
        @NotBlank String sentiment,
        @Size(max = 32) String reason,
        @Size(max = 8) String locale,
        @Size(max = 500) String note
) {}
