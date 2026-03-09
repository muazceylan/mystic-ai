package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameTagGroup;

import java.util.List;

public record NameTagTaxonomyGroupDto(
        NameTagGroup group,
        List<String> values
) {
}
