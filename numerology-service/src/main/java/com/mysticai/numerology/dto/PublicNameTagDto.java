package com.mysticai.numerology.dto;

import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;

import java.math.BigDecimal;

public record PublicNameTagDto(
        Long id,
        NameTagGroup tagGroup,
        String tagValue,
        NameTagSource source,
        BigDecimal confidence
) {
}
