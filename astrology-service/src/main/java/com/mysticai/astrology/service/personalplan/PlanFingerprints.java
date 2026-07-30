package com.mysticai.astrology.service.personalplan;

/**
 * Encoding of the two cross-day repetition keys stored alongside a generated plan.
 *
 * <ul>
 *   <li>{@code sk:SEMANTIC_KEY} — the canonical meaning. Blocks the same advice returning
 *       within the history window even if it is reworded or moved to another life area.</li>
 *   <li>{@code ai:area:intent} — the narrower "this exact phrasing in this exact area" key.</li>
 * </ul>
 *
 * They are stored in one column with distinct prefixes so the history window can be loaded in
 * a single query.
 */
public final class PlanFingerprints {

    private static final String SEMANTIC_PREFIX = "sk:";
    private static final String AREA_INTENT_PREFIX = "ai:";

    private PlanFingerprints() {
    }

    public static String semantic(String semanticKey) {
        return SEMANTIC_PREFIX + (semanticKey == null ? "none" : semanticKey);
    }

    public static String areaIntent(LifeArea area, String actionIntent) {
        return AREA_INTENT_PREFIX + (area == null ? "none" : area.slug())
                + ":" + (actionIntent == null ? "none" : actionIntent);
    }

    public static boolean isSemantic(String fingerprint) {
        return fingerprint != null && fingerprint.startsWith(SEMANTIC_PREFIX);
    }

    public static boolean isAreaIntent(String fingerprint) {
        return fingerprint != null && fingerprint.startsWith(AREA_INTENT_PREFIX);
    }
}
