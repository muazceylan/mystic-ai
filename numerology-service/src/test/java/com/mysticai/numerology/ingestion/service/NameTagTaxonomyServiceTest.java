package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.NameTagTaxonomyDto;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NameTagTaxonomyServiceTest {

    private final NameTagTaxonomyService service = new NameTagTaxonomyService();

    @Test
    void taxonomy_containsExpectedGroupsAndValues() {
        NameTagTaxonomyDto taxonomy = service.taxonomy();

        assertEquals(6, taxonomy.groups().size());
        assertTrue(taxonomy.groups().stream().anyMatch(group -> group.group() == NameTagGroup.STYLE && group.values().contains("modern")));
        assertTrue(taxonomy.groups().stream().anyMatch(group -> group.group() == NameTagGroup.RELIGION && group.values().contains("quranic")));
    }

    @Test
    void validateAndNormalize_acceptsValidTaxonomyEntry() {
        String value = service.validateAndNormalize(NameTagGroup.THEME, " Light ");
        assertEquals("light", value);
    }

    @Test
    void validateAndNormalize_rejectsInvalidTaxonomyEntry() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.validateAndNormalize(NameTagGroup.USAGE, "unknown")
        );

        assertTrue(ex.getMessage().contains("invalid taxonomy tag"));
    }

    @Test
    void maxTagsForGroup_andReligionConflictRules_workAsExpected() {
        assertEquals(1, service.maxTagsForGroup(NameTagGroup.STYLE));
        assertEquals(3, service.maxTagsForGroup(NameTagGroup.THEME));
        assertEquals(2, service.maxTagsForGroup(NameTagGroup.RELIGION));

        assertTrue(service.isReligionConflict(java.util.Set.of("islamic"), "neutral"));
        assertTrue(service.isReligionConflict(java.util.Set.of("neutral"), "quranic"));
    }
}
