package com.mysticai.astrology.dto;

/**
 * Rule-based compatibility score breakdown returned immediately while AI commentary is pending.
 */
public record SynastryScoreBreakdown(
        Integer overall,
        Integer love,
        Integer communication,
        Integer spiritualBond,
        String methodologyNote
) {}
