package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response record for daily SWOT analysis.
 * Contains the astrological SWOT analysis results.
 */
public record SwotResponse(
        Long id,
        Long userId,
        String sunSign,
        LocalDate date,
        String strengths,
        String weaknesses,
        String opportunities,
        String threats,
        String mysticalAdvice
) {}
