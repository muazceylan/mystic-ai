package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.AdminNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameListItemDto;
import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameTagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(NameAdminQueryService.class)
class NameAdminQueryServiceDataJpaTest {

    @Autowired
    private NameAdminQueryService service;

    @Autowired
    private NameEntityRepository nameRepository;

    @Autowired
    private NameAliasRepository aliasRepository;

    @Autowired
    private NameTagRepository tagRepository;

    private Long activeWithAliasId;
    private Long activeWithoutAliasId;
    private Long pendingId;

    @BeforeEach
    void setUp() {
        aliasRepository.deleteAll();
        tagRepository.deleteAll();
        nameRepository.deleteAll();

        NameEntity activeWithAlias = nameRepository.save(NameEntity.builder()
                .name("Elif Nur")
                .normalizedName("elif nur")
                .gender(ParsedGender.FEMALE)
                .origin("Türkçe")
                .meaningShort("Işık")
                .meaningLong("Uzun anlam")
                .characterTraitsText("Nazik, sezgisel")
                .letterAnalysisText("E güçlü")
                .quranFlag(Boolean.FALSE)
                .status(NameStatus.ACTIVE)
                .build());

        NameEntity activeWithoutAlias = nameRepository.save(NameEntity.builder()
                .name("Ali")
                .normalizedName("ali")
                .gender(ParsedGender.MALE)
                .origin("Arapça")
                .meaningShort("Yüce")
                .meaningLong("Yüksek kişi")
                .characterTraitsText(null)
                .letterAnalysisText(null)
                .quranFlag(Boolean.TRUE)
                .status(NameStatus.ACTIVE)
                .build());

        NameEntity pending = nameRepository.save(NameEntity.builder()
                .name("Deniz")
                .normalizedName("deniz")
                .gender(ParsedGender.UNISEX)
                .origin("Türkçe")
                .meaningShort("Deniz")
                .meaningLong("Mavi su")
                .quranFlag(null)
                .status(NameStatus.PENDING_REVIEW)
                .build());

        aliasRepository.save(NameAlias.builder()
                .canonicalName(activeWithAlias)
                .aliasName("Elifnur")
                .normalizedAliasName("elifnur")
                .aliasType(AliasType.COMPOUND_VARIANT)
                .confidence(BigDecimal.valueOf(0.92))
                .manual(false)
                .build());

        tagRepository.save(NameTag.builder()
                .name(activeWithAlias)
                .tag("Sezgisel")
                .normalizedTag("sezgisel")
                .source(NameTagSource.AUTO)
                .confidence(BigDecimal.valueOf(0.90))
                .build());

        activeWithAliasId = activeWithAlias.getId();
        activeWithoutAliasId = activeWithoutAlias.getId();
        pendingId = pending.getId();
    }

    @Test
    void listNames_defaultVisibility_returnsOnlyApprovedActiveNames() {
        Page<AdminNameListItemDto> page = service.listNames(
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                20
        );

        Set<Long> ids = page.getContent().stream().map(AdminNameListItemDto::id).collect(Collectors.toSet());
        assertEquals(2, page.getTotalElements());
        assertTrue(ids.contains(activeWithAliasId));
        assertTrue(ids.contains(activeWithoutAliasId));
        assertFalse(ids.contains(pendingId));
    }

    @Test
    void listNames_supportsSearchAndFilters() {
        Page<AdminNameListItemDto> page = service.listNames(
                "elif",
                NameStatus.ACTIVE,
                ParsedGender.FEMALE,
                "türk",
                true,
                true,
                0,
                20
        );

        assertEquals(1, page.getTotalElements());
        AdminNameListItemDto item = page.getContent().getFirst();
        assertEquals(activeWithAliasId, item.id());
        assertTrue(item.hasAliases());
        assertEquals(1L, item.aliasCount());
        assertFalse(item.tagSummary().isEmpty());
    }

    @Test
    void listNames_supportsPagination() {
        nameRepository.saveAll(List.of(
                NameEntity.builder().name("Ayşe").normalizedName("ayşe").status(NameStatus.ACTIVE).build(),
                NameEntity.builder().name("Fatma").normalizedName("fatma").status(NameStatus.ACTIVE).build(),
                NameEntity.builder().name("Zeynep").normalizedName("zeynep").status(NameStatus.ACTIVE).build()
        ));

        Page<AdminNameListItemDto> firstPage = service.listNames(null, NameStatus.ACTIVE, null, null, null, null, 0, 2);
        Page<AdminNameListItemDto> secondPage = service.listNames(null, NameStatus.ACTIVE, null, null, null, null, 1, 2);

        assertEquals(5, firstPage.getTotalElements());
        assertEquals(3, firstPage.getTotalPages());
        assertEquals(2, firstPage.getContent().size());
        assertEquals(2, secondPage.getContent().size());
    }

    @Test
    void getName_returnsAliasAndComputedFields() {
        AdminNameDetailDto detail = service.getName(activeWithAliasId);

        assertEquals(activeWithAliasId, detail.id());
        assertNotNull(detail.dataQualityScore());
        assertFalse(detail.aliases().isEmpty());
        assertEquals("Elifnur", detail.aliases().getFirst().aliasName());
        assertFalse(detail.tags().isEmpty());
    }

    @Test
    void getName_whenMeaningShortAndLongAreSame_hidesDuplicateLongMeaning() {
        NameEntity duplicateMeaning = nameRepository.save(NameEntity.builder()
                .name("Bedirhan")
                .normalizedName("bedirhan")
                .gender(ParsedGender.MALE)
                .origin("Arapça")
                .meaningShort("Arapça kökenli, lider anlamına gelir.")
                .meaningLong("Arapça kökenli, lider anlamına gelir.")
                .status(NameStatus.ACTIVE)
                .build());

        AdminNameDetailDto detail = service.getName(duplicateMeaning.getId());

        assertEquals("Arapça kökenli, lider anlamına gelir.", detail.meaningShort());
        assertNull(detail.meaningLong());
    }

    @Test
    void getName_whenMeaningLongStartsWithShort_trimsRepeatedPrefixFromLongMeaning() {
        String shortMeaning = "Bedirhan ismi, Arapça ve Türkçe kökenli olup iki kelimenin birleşiminden oluşur.";
        String extraMeaning = "Bu isim liderlik ve kararlılık özelliklerini simgeler.";
        NameEntity duplicatePrefixMeaning = nameRepository.save(NameEntity.builder()
                .name("Bedirhan")
                .normalizedName("bedirhan")
                .gender(ParsedGender.MALE)
                .origin("Arapça")
                .meaningShort(shortMeaning)
                .meaningLong(shortMeaning + " " + extraMeaning)
                .status(NameStatus.ACTIVE)
                .build());

        AdminNameDetailDto detail = service.getName(duplicatePrefixMeaning.getId());

        assertEquals(shortMeaning, detail.meaningShort());
        assertEquals(extraMeaning, detail.meaningLong());
    }

    @Test
    void getName_whenMeaningContainsCharacterAndLetterParts_deduplicatesDetailSections() {
        String shortMeaning = "Liderlik anlamı taşır.";
        String characterTraits = "İsmi taşıyanlar kararlı ve güçlü bireylerdir.";
        String letterAnalysis = "B: Güçlü irade. E: İletişim becerisi.";
        String extraMeaning = "Bu isim topluluk içinde saygınlıkla anılır.";

        NameEntity mixedMeaning = nameRepository.save(NameEntity.builder()
                .name("Bedirhan")
                .normalizedName("bedirhan")
                .gender(ParsedGender.MALE)
                .origin("Arapça")
                .meaningShort(shortMeaning)
                .meaningLong(characterTraits + " " + letterAnalysis + " " + extraMeaning)
                .characterTraitsText(characterTraits)
                .letterAnalysisText(letterAnalysis)
                .status(NameStatus.ACTIVE)
                .build());

        AdminNameDetailDto detail = service.getName(mixedMeaning.getId());

        assertEquals(shortMeaning, detail.meaningShort());
        assertEquals(extraMeaning, detail.meaningLong());
        assertEquals(characterTraits, detail.characterTraitsText());
        assertEquals(letterAnalysis, detail.letterAnalysisText());
    }
}
