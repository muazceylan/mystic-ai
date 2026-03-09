package com.mysticai.numerology.ingestion.dto.admin;

import java.util.List;

public record SourceHealthDetailDto(
        SourceHealthSummaryDto summary,
        List<NameIngestionRunDto> recentRuns
) {
}
