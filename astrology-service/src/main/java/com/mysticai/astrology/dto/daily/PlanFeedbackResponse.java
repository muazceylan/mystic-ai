package com.mysticai.astrology.dto.daily;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Result of submitting plan feedback.
 *
 * When the reason triggers a rebuild, the replacement plan is returned inline so the client
 * renders it directly. That removes the cache race a separate follow-up GET would create, and
 * means the "rebuilding" state is driven by this response rather than by a guess.
 *
 * @param accepted               always true once the rating is stored, even if nothing was rebuilt
 * @param regenerated            whether a replacement plan was actually produced
 * @param remainingRegenerations rebuilds still available for this local day
 * @param replacementPlan        the new plan; null when {@code regenerated} is false
 * @param planId                 id of the newly stored plan, for support and analytics
 * @param generationNumber       generation of the returned plan (1 = first of the day)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlanFeedbackResponse(
        boolean accepted,
        boolean regenerated,
        String regenerationReason,
        int remainingRegenerations,
        DailyActionsDTO replacementPlan,
        Long planId,
        Integer generationNumber
) {

    /** Feedback stored; the current plan stays as it is. */
    public static PlanFeedbackResponse acceptedOnly(PlanFeedbackReason reason, int remaining) {
        return new PlanFeedbackResponse(
                true, false, reason == null ? null : reason.name(), Math.max(0, remaining), null, null, null);
    }

    /** Feedback stored and a replacement plan produced. */
    public static PlanFeedbackResponse regenerated(
            PlanFeedbackReason reason,
            int remaining,
            DailyActionsDTO replacementPlan,
            Long planId,
            int generationNumber
    ) {
        return new PlanFeedbackResponse(
                true, replacementPlan != null, reason == null ? null : reason.name(),
                Math.max(0, remaining), replacementPlan, planId, generationNumber);
    }

    /** Budget spent for the day: the rating is still recorded, nothing is rebuilt. */
    public static PlanFeedbackResponse budgetExhausted(PlanFeedbackReason reason) {
        return new PlanFeedbackResponse(
                true, false, reason == null ? null : reason.name(), 0, null, null, null);
    }
}
