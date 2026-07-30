package com.mysticai.astrology.dto.daily;

import java.util.Locale;

/**
 * Structured reasons behind a plan rating. Free-text notes stay optional; these drive
 * regeneration and future variant selection.
 */
public enum PlanFeedbackReason {
    /** "Bana uydu" */
    HELPFUL,
    /** "Çok genel" — the suggestion could have been shown to anyone. */
    TOO_GENERIC,
    /** "Tekrarlı" — the user has seen this advice recently. */
    REPETITIVE,
    /** "Bana uygun değil" — wrong life area for this person. */
    NOT_RELEVANT,
    /** "Faydalı değildi" — understood but not actionable. */
    NOT_USEFUL;

    /** Reasons that justify invalidating today's plan and composing a different one. */
    public boolean triggersRegeneration() {
        return this == TOO_GENERIC || this == REPETITIVE;
    }

    public static PlanFeedbackReason parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
