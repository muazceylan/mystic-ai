package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DreamExpansionRequest(
        @NotNull DreamExpansionType expansionType,
        @Size(max = 300) String targetElement,
        @NotBlank @Size(max = 180) String idempotencyKey,
        @NotBlank @Size(max = 64) String pricingVersion,
        boolean regenerate,
        @Size(max = 16) String locale
) {}
