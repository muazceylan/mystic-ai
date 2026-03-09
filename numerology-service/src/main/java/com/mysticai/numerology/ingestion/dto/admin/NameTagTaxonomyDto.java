package com.mysticai.numerology.ingestion.dto.admin;

import java.util.List;

public record NameTagTaxonomyDto(
        List<NameTagTaxonomyGroupDto> groups
) {
}
