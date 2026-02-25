package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response for birth-night sky horizontal coordinate projection.
 */
public record NightSkyProjectionResponse(
        String projectionModel,
        String timezoneUsed,
        String starCatalog,
        LocalDate birthDate,
        String birthTime,
        double latitude,
        double longitude,
        double elevationMeters,
        MoonPhaseInfo moonPhase,
        List<HorizontalPoint> planets,
        List<HorizontalPoint> axes,
        List<StarPoint> stars,
        List<ConstellationLine> constellationLines,
        LocalDateTime generatedAtUtc
) {
    public record MoonPhaseInfo(
            double phaseFraction,
            double illuminationPercent,
            double ageDays,
            String phaseLabel,
            int phaseSetIndex5
    ) {}

    public record HorizontalPoint(
            String key,
            String label,
            String glyph,
            double azimuthDeg,
            double altitudeDeg,
            double apparentAltitudeDeg,
            boolean visible,
            double xNorm,
            double yNorm,
            double radialNorm
    ) {}

    public record StarPoint(
            String key,
            String label,
            String constellation,
            Integer hipId,
            Integer bscId,
            double magnitude,
            double azimuthDeg,
            double altitudeDeg,
            double apparentAltitudeDeg,
            boolean visible,
            double xNorm,
            double yNorm,
            double radialNorm
    ) {}

    public record ConstellationLine(
            String fromKey,
            String toKey
    ) {}
}
