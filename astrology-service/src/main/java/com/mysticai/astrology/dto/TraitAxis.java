package com.mysticai.astrology.dto;

public record TraitAxis(
        String id,
        String leftLabel,
        String rightLabel,
        Integer score0to100,
        String note
) {}
