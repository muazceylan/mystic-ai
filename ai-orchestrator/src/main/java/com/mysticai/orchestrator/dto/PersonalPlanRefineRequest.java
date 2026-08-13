package com.mysticai.orchestrator.dto;

import java.util.List;

/**
 * Request sent from astrology-service to reword an already-composed daily personal plan.
 *
 * The plan is selected and grounded entirely by the rule-based composer: which transit leads,
 * which life area it maps to, which behaviour is suggested and which audience it is safe for.
 * This request only asks for clearer wording of text that already exists — the model never
 * chooses what the plan says, so it cannot introduce a life area, an event or an assumption
 * about the user that the chart data does not support.
 *
 * @param locale "tr" or "en"; the refined copy must stay in the same language
 * @param items  the slots to reword, each carrying the id the caller uses to match the response
 */
public record PersonalPlanRefineRequest(
        String locale,
        List<Item> items
) {

    /**
     * @param id   opaque caller-side identifier, echoed back unchanged
     * @param kind THEME, ACTION, CAUTION or REFLECTION — sets the register, not the content
     */
    public record Item(
            String id,
            String kind,
            String title,
            String body
    ) {}
}
