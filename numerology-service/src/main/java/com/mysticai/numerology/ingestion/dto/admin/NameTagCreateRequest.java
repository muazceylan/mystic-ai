package com.mysticai.numerology.ingestion.dto.admin;

import java.math.BigDecimal;

public record NameTagCreateRequest(
        String tagGroup,
        String tagValue,
        String source,
        BigDecimal confidence,
        String evidence
) {
}
