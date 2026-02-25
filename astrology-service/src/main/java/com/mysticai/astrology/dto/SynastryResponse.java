package com.mysticai.astrology.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SynastryResponse(
        Long id,
        Long userId,
        Long savedPersonId,
        String personName,
        String relationshipType,
        Integer harmonyScore,
        List<CrossAspect> crossAspects,
        /** AI: 2-3 sentence overall harmony narrative */
        String harmonyInsight,
        /** AI: positive aspect descriptions */
        List<String> strengths,
        /** AI: challenging aspect descriptions */
        List<String> challenges,
        /** AI: one specific caution */
        String keyWarning,
        /** AI: final synthesis paragraph */
        String cosmicAdvice,
        /** PENDING, COMPLETED, FAILED */
        String status,
        LocalDateTime calculatedAt,
        Long personAId,
        Long personBId,
        String personAType,
        String personBType,
        String personAName,
        String personBName,
        SynastryScoreBreakdown scoreBreakdown,
        List<SynastryAnalysisSection> analysisSections
) {}
