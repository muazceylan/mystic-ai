package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class NameEnrichmentRuleEngineTest {

    private final NameEnrichmentRuleEngine engine = new NameEnrichmentRuleEngine();

    @Test
    void cultureReligionAndThemeRules_areExtractedDeterministically() {
        NameEntity entity = baseName("Nuray");
        entity.setOrigin("Türkçe");
        entity.setQuranFlag(Boolean.TRUE);
        entity.setMeaningLong("Nur gibi parlak, ay ışığı taşıyan bilgelik ve sevgi dolu isim.");

        List<NameEnrichmentRuleEngine.TagRecommendation> tags = engine.recommend(entity, 3, 12);

        assertContains(tags, NameTagGroup.CULTURE, "turkish");
        assertContains(tags, NameTagGroup.RELIGION, "quranic");
        assertContains(tags, NameTagGroup.RELIGION, "islamic");
        assertContains(tags, NameTagGroup.THEME, "light");
        assertContains(tags, NameTagGroup.THEME, "moon");
        assertContains(tags, NameTagGroup.THEME, "wisdom");
        assertContains(tags, NameTagGroup.THEME, "love");
    }

    @Test
    void vibeAndStyleRules_areDerivedFromPhoneticAndUsageSignals() {
        NameEntity entity = baseName("Mira");
        entity.setOrigin("Arapça");
        entity.setQuranFlag(Boolean.FALSE);
        entity.setMeaningShort("Sade ve zarif, liderlik gücü olan modern isim");

        List<NameEnrichmentRuleEngine.TagRecommendation> tags = engine.recommend(entity, 15, 21);

        assertContains(tags, NameTagGroup.VIBE, "soft");
        assertContains(tags, NameTagGroup.VIBE, "elegant");
        assertContains(tags, NameTagGroup.STYLE, "classic");
        assertContains(tags, NameTagGroup.USAGE, "popular");
    }

    @Test
    void recommendations_includeExplainableEvidenceAndConfidenceRange() {
        NameEntity entity = baseName("Asaf");
        entity.setOrigin("Farsça");
        entity.setMeaningShort("Kudret, güç ve hikmet");

        List<NameEnrichmentRuleEngine.TagRecommendation> tags = engine.recommend(entity, 2, 4);

        assertTrue(tags.stream().allMatch(tag -> tag.confidence().doubleValue() >= 0.10 && tag.confidence().doubleValue() <= 1.0));
        assertTrue(tags.stream().allMatch(tag -> tag.evidence() != null && !tag.evidence().isBlank()));
        assertContains(tags, NameTagGroup.THEME, "power");
    }

    private NameEntity baseName(String name) {
        NameEntity entity = new NameEntity();
        entity.setName(name);
        entity.setNormalizedName(name.toLowerCase());
        entity.setGender(ParsedGender.UNKNOWN);
        return entity;
    }

    private void assertContains(List<NameEnrichmentRuleEngine.TagRecommendation> tags, NameTagGroup group, String value) {
        assertTrue(tags.stream().anyMatch(tag -> tag.group() == group && value.equals(tag.value())),
                () -> "Expected tag not found: " + group + ":" + value + " in " + tags);
    }
}
