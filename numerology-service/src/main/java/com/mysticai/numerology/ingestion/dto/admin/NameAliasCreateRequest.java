package com.mysticai.numerology.ingestion.dto.admin;

import java.math.BigDecimal;

public record NameAliasCreateRequest(
        String aliasName,
        String aliasType,
        BigDecimal confidence
) {
}
