package com.mysticai.astrology.service.personalplan;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Records which signals actually changed a decision while a plan was being composed.
 *
 * {@code profileSignalsUsed} is built from this recorder, not from "which fields happened to
 * be non-null". A signal that was available but never altered ranking, variant choice or
 * wording is not reported — and, for personal data, is not transported between services at
 * all. Each entry keeps the decision it influenced so the claim is auditable and testable.
 */
public final class SignalUsageRecorder {

    /** Stable signal names exposed in the API payload and analytics. */
    public static final String ACTIVE_TRANSITS = "active_transits";
    public static final String NATAL_HOUSES = "natal_houses";
    public static final String RISING_SIGN = "rising_sign";
    public static final String RETROGRADES = "retrogrades";
    public static final String RELATIONSHIP_STATUS = "relationship_status";
    public static final String AGE_RANGE = "age_range";
    public static final String PREVIOUS_FEEDBACK = "previous_feedback";
    public static final String PLAN_HISTORY = "plan_history";

    private final Map<String, List<String>> decisionsBySignal = new LinkedHashMap<>();

    /**
     * @param signal   one of the constants above
     * @param decision short, human-readable description of what this signal changed, e.g.
     *                 "primary_action_variant: age tie-break chose lower-intensity phrasing"
     */
    public void record(String signal, String decision) {
        decisionsBySignal.computeIfAbsent(signal, key -> new java.util.ArrayList<>()).add(decision);
    }

    public boolean used(String signal) {
        return decisionsBySignal.containsKey(signal);
    }

    /** Signal names, in the order they first influenced the plan. */
    public Set<String> usedSignals() {
        return new LinkedHashSet<>(decisionsBySignal.keySet());
    }

    /** The decisions a given signal influenced; empty when it influenced nothing. */
    public List<String> decisionsFor(String signal) {
        return List.copyOf(decisionsBySignal.getOrDefault(signal, List.of()));
    }

    public Map<String, List<String>> allDecisions() {
        return Map.copyOf(decisionsBySignal);
    }
}
