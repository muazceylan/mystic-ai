package com.mysticai.astrology.dto;

import java.util.Map;

public record DreamExpansionConfigResponse(
        boolean enabled,
        String currency,
        int defaultCost,
        String pricingVersion,
        boolean premiumActive,
        int currentBalance,
        Map<String, Integer> costs,
        boolean rewardedAvailable,
        boolean purchaseAvailable
) {}
