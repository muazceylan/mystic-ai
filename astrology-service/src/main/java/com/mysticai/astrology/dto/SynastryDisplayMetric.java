package com.mysticai.astrology.dto;

/**
 * Relationship-type aware UI metric (e.g. Aşk, Güven, Eğlence).
 * Rule-based and returned immediately with synastry response.
 */
public record SynastryDisplayMetric(
        String id,
        String label,
        Integer score
) {}
