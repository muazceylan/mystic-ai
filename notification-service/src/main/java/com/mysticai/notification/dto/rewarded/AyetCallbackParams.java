package com.mysticai.notification.dto.rewarded;

import java.math.BigDecimal;

/**
 * Normalized ayeT rewarded-video callback query parameters.
 * {@code currencyAmount}/{@code payoutUsd} are already parsed by the controller;
 * a parse failure is surfaced as a 400 before this record is built.
 */
public record AyetCallbackParams(
        String transactionId,
        String externalIdentifier,
        int currencyAmount,
        BigDecimal payoutUsd,
        String placementIdentifier,
        String adslotId,
        String currencyIdentifier,
        String subId,
        String signature,
        String clientIp
) {}
