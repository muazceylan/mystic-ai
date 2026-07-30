package com.mysticai.orchestrator.dto;

public record DreamExpansionRequest(
        String expansionType,
        String dreamText,
        String baseAnalysis,
        String targetElement,
        String historySummary,
        String locale
) {}
