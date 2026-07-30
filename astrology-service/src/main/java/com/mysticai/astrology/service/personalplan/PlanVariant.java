package com.mysticai.astrology.service.personalplan;

/**
 * One concrete, ready-to-show suggestion plus the canonical metadata the duplicate rules
 * operate on.
 *
 * @param semanticKey canonical MEANING of the suggestion. Variants in different life areas
 *                    intentionally share a key when they ask for the same behaviour (e.g.
 *                    {@code CONFIRM_TERMS_IN_WRITING} appears in both WORK and MONEY), which
 *                    is what lets duplicate detection work across areas and across days even
 *                    when the wording is completely different.
 * @param intent      finer-grained slug describing the specific phrasing/action. Unique within
 *                    the catalog; used for stable ids and analytics.
 * @param audience    gate on relationship context. {@link Audience#ANY} is safe for every user;
 *                    the others are only used when the profile actually states the status.
 * @param role        which transiting-planet flavour this variant answers.
 */
public record PlanVariant(
        String semanticKey,
        String intent,
        Audience audience,
        PlanetRole role,
        String turkish,
        String english
) {
    public enum Audience {
        /** No assumption about the user's relationship or living situation. */
        ANY,
        /** Only shown when the profile explicitly says the user is partnered/married. */
        PARTNERED,
        /** Only shown when the profile explicitly says the user is single. */
        SINGLE
    }

    public PlanVariant {
        if (semanticKey == null || semanticKey.isBlank()) {
            throw new IllegalArgumentException("semanticKey is required for intent=" + intent);
        }
        if (intent == null || intent.isBlank()) {
            throw new IllegalArgumentException("intent is required for semanticKey=" + semanticKey);
        }
    }

    public String text(boolean english) {
        return english ? this.english : turkish;
    }

    static PlanVariant of(String semanticKey, String intent, PlanetRole role, String turkish, String english) {
        return new PlanVariant(semanticKey, intent, Audience.ANY, role, turkish, english);
    }

    static PlanVariant of(
            String semanticKey, String intent, Audience audience, PlanetRole role, String turkish, String english) {
        return new PlanVariant(semanticKey, intent, audience, role, turkish, english);
    }
}
