package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Request payload for the daily life guide (Kozmik Yaşam Rehberi).
 */
public record DailyLifeGuideRequest(
        @NotNull Long userId,
        String locale,
        String userGender,
        String maritalStatus,
        LocalDate date
) {}
