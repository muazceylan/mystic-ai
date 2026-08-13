package com.mysticai.astrology.dto.daily;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Daily personal plan payload.
 *
 * {@code date}, {@code header}, {@code actions} and {@code miniPlan} are the original v1
 * contract and stay populated for older clients. Everything after them is the premium plan
 * structure; a client that does not know these fields simply ignores them.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DailyActionsDTO(
        String date,
        Header header,
        List<ActionItem> actions,
        MiniPlan miniPlan,
        /** Short, complete copy composed specifically for the home card; never an ellipsis. */
        HomeTeaser homeTeaser,

        // ── premium personal plan (v2) ────────────────────────────────────────
        /** HIGH / MEDIUM / LOW — how much real user data backed this plan. */
        String personalizationLevel,
        /** Which profile + chart signals were actually used, for transparency and analytics. */
        List<String> profileSignalsUsed,
        MainTheme mainTheme,
        PrimaryAction primaryAction,
        List<TimeSlot> timeline,
        List<LifeAreaCard> lifeAreaCards,
        Caution caution,
        EveningReflection eveningReflection,
        PlanMeta meta
) {

    /** Convenience factory kept for the legacy shape (tests and older call sites). */
    public static DailyActionsDTO legacy(String date, Header header, List<ActionItem> actions, MiniPlan miniPlan) {
        return new DailyActionsDTO(date, header, actions, miniPlan,
                null, null, null, null, null, null, null, null, null, null);
    }

    public record Header(
            String title,
            String subtitle
    ) {}

    public record ActionItem(
            String id,
            String title,
            String detail,
            String icon,
            String tag,
            Integer etaMin,
            boolean isDone,
            String doneAt,
            List<String> relatedTransitIds
    ) {}

    public record MiniPlan(
            String title,
            List<String> steps
    ) {}

    public record HomeTeaser(
            String headline,
            String body
    ) {}

    /**
     * Machine-readable astrological justification. The mobile client must not render these
     * fields directly; it shows the plain-language {@code why} instead.
     */
    public record AstroBasis(
            String type,
            String planet,
            String target,
            String aspect
    ) {}

    public record TimeWindow(
            String label,
            String start,
            String end
    ) {}

    public record MainTheme(
            String title,
            String description,
            String why,
            List<AstroBasis> astrologicalBasis
    ) {}

    public record PrimaryAction(
            String id,
            String category,
            String categoryLabel,
            String title,
            String description,
            TimeWindow timeWindow,
            String why,
            boolean isDone,
            String doneAt,
            List<String> relatedTransitIds
    ) {}

    public record TimeSlot(
            String id,
            String label,
            String startTime,
            String endTime,
            String title,
            String description
    ) {}

    public record LifeAreaCard(
            String id,
            String category,
            String categoryLabel,
            String title,
            String description,
            String why,
            boolean isDone,
            String doneAt
    ) {}

    public record Caution(
            String title,
            String description,
            TimeWindow timeWindow,
            String why
    ) {}

    public record EveningReflection(
            String question
    ) {}

    /**
     * @param generationNumber 1 for the first plan of the user's local day, incremented on
     *                         each feedback-driven rebuild
     * @param degradedReason   set when the composer had to relax a rule (e.g. catalog
     *                         exhaustion) to produce content; null on a normal plan
     */
    public record PlanMeta(
            String planVersion,
            String generatedAt,
            int generationNumber,
            boolean canRegenerate,
            String source,
            String degradedReason
    ) {}
}
