package com.mysticai.oracle.dto;

import java.time.LocalDateTime;

/**
 * Record representing dream data from Dream Service.
 */
public record DreamData(
        String dreamText,
        String mood,
        LocalDateTime recordedAt,
        String aiInterpretation
) {
}
