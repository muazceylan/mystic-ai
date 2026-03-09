package com.mysticai.numerology.ingestion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameCanonicalInfoDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameUpdateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.repository.NameAdminAuditLogRepository;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameTagRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class NameAdminCommandServiceTest {

    @Mock
    private NameEntityRepository nameRepository;

    @Mock
    private NameAliasRepository aliasRepository;

    @Mock
    private NameTagRepository tagRepository;

    @Mock
    private ParsedNameCandidateRepository parsedRepository;

    @Mock
    private NameAdminAuditLogRepository adminAuditLogRepository;

    @Mock
    private NameAliasService aliasService;

    @Mock
    private NameMergeService mergeService;

    @Mock
    private NameNormalizationService normalizationService;

    @Mock
    private NameTagTaxonomyService taxonomyService;

    @Mock
    private NameAdminQueryService queryService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private NameAdminCommandService service;

    @BeforeEach
    void setUp() {
        lenient().when(normalizationService.cleanText(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(taxonomyService.parseGroup("VIBE")).thenReturn(NameTagGroup.VIBE);
        lenient().when(taxonomyService.validateAndNormalize(NameTagGroup.VIBE, "strong")).thenReturn("strong");
        lenient().when(taxonomyService.validateAndNormalize(NameTagGroup.VIBE, "soft")).thenReturn("soft");
        lenient().when(taxonomyService.emptyTagMap()).thenCallRealMethod();
        lenient().when(taxonomyService.isSingleChoice(any())).thenReturn(false);
        lenient().when(taxonomyService.isReligionConflict(any(), any())).thenReturn(false);
        lenient().when(taxonomyService.maxTagsForGroup(any())).thenReturn(3);
    }

    @Test
    void updateName_rejectsBlankName() {
        NameEntity entity = canonical(1L, "Ali", "ali", NameStatus.ACTIVE);
        when(nameRepository.findById(1L)).thenReturn(Optional.of(entity));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateName(1L, new AdminNameUpdateRequest(
                        "   ",
                        ParsedGender.MALE,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        NameStatus.ACTIVE
                ), "admin@mystic.ai"));

        assertTrue(ex.getMessage().contains("name cannot be blank"));
        verify(nameRepository, never()).save(any());
    }

    @Test
    void updateName_rejectsInvalidStatusTransition() {
        NameEntity entity = canonical(2L, "Zeynep", "zeynep", NameStatus.REJECTED);
        when(nameRepository.findById(2L)).thenReturn(Optional.of(entity));
        when(normalizationService.normalizedName("Zeynep")).thenReturn("zeynep");
        when(nameRepository.findByNormalizedName("zeynep")).thenReturn(Optional.of(entity));
        when(aliasRepository.findByNormalizedAliasName("zeynep")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateName(2L, new AdminNameUpdateRequest(
                        "Zeynep",
                        ParsedGender.FEMALE,
                        "Türkçe",
                        "kısa",
                        "uzun",
                        "nazik",
                        "analiz",
                        Boolean.FALSE,
                        NameStatus.ACTIVE
                ), "admin@mystic.ai"));

        assertTrue(ex.getMessage().contains("invalid status transition"));
        verify(nameRepository, never()).save(any());
    }

    @Test
    void updateName_persistsAndWritesAuditOnStatusChange() {
        NameEntity entity = canonical(3L, "Ayse", "ayse", NameStatus.ACTIVE);
        when(nameRepository.findById(3L)).thenReturn(Optional.of(entity));
        when(normalizationService.normalizedName("Ayse")).thenReturn("ayse");
        when(normalizationService.cleanText(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(nameRepository.findByNormalizedName("ayse")).thenReturn(Optional.of(entity));
        when(aliasRepository.findByNormalizedAliasName("ayse")).thenReturn(Optional.empty());
        when(nameRepository.save(any(NameEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(queryService.getName(3L)).thenReturn(detail(3L, NameStatus.HIDDEN));

        AdminNameDetailDto response = service.updateName(3L, new AdminNameUpdateRequest(
                "Ayse",
                ParsedGender.FEMALE,
                "Türkçe",
                "Kısa",
                "Uzun",
                "Nazik",
                "Analiz",
                Boolean.TRUE,
                NameStatus.HIDDEN
        ), "admin@mystic.ai");

        assertEquals(NameStatus.HIDDEN, response.status());
        verify(nameRepository).save(any(NameEntity.class));
        verify(adminAuditLogRepository).save(any());
        verify(queryService).getName(3L);
    }

    @Test
    void addTag_rejectsDuplicateTag() {
        NameEntity entity = canonical(4L, "Fatma", "fatma", NameStatus.ACTIVE);
        when(nameRepository.findById(4L)).thenReturn(Optional.of(entity));
        when(tagRepository.existsByNameIdAndTagGroupAndNormalizedTag(4L, NameTagGroup.VIBE, "strong")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.addTag(4L, new NameTagCreateRequest("VIBE", "strong", "manual", BigDecimal.ONE, "manual override"), "admin@mystic.ai"));

        assertTrue(ex.getMessage().contains("duplicate tag"));
        verify(tagRepository, never()).save(any());
    }

    @Test
    void tagCrud_addAndDelete_workAndAudit() {
        NameEntity entity = canonical(5L, "Elif", "elif", NameStatus.ACTIVE);
        NameTag saved = NameTag.builder()
                .id(31L)
                .name(entity)
                .tagGroup(NameTagGroup.VIBE)
                .tag("Sezgisel")
                .normalizedTag("sezgisel")
                .source(NameTagSource.MANUAL)
                .confidence(BigDecimal.ONE)
                .evidence("manual override")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(nameRepository.findById(5L)).thenReturn(Optional.of(entity));
        when(tagRepository.existsByNameIdAndTagGroupAndNormalizedTag(5L, NameTagGroup.VIBE, "soft")).thenReturn(false);
        when(tagRepository.findByNameIdOrderByTagGroupAscTagAsc(5L)).thenReturn(List.of());
        when(tagRepository.save(any(NameTag.class))).thenReturn(saved);
        when(nameRepository.existsById(5L)).thenReturn(true);
        when(tagRepository.findByIdAndNameId(31L, 5L)).thenReturn(Optional.of(saved));

        NameTagDto dto = service.addTag(5L, new NameTagCreateRequest("VIBE", "soft", "manual", BigDecimal.ONE, "manual override"), "admin@mystic.ai");
        service.deleteTag(5L, 31L, "admin@mystic.ai");

        assertEquals("Sezgisel", dto.tagValue());
        verify(tagRepository).save(any(NameTag.class));
        verify(tagRepository).delete(saved);
        verify(adminAuditLogRepository, times(2)).save(any());
    }

    @Test
    void addAlias_refreshesQueueAndWritesAudit() {
        when(nameRepository.existsById(6L)).thenReturn(true);
        NameAliasDto aliasDto = new NameAliasDto(
                71L,
                6L,
                "Muhammed",
                "muhammed",
                "Mohammed",
                "mohammed",
                AliasType.TRANSLITERATION,
                BigDecimal.valueOf(0.96),
                true,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(aliasService.addManualAlias(eq(6L), eq("Mohammed"), eq(AliasType.TRANSLITERATION), eq(BigDecimal.valueOf(0.96))))
                .thenReturn(new NameAliasService.AliasMutationResult(aliasDto, Set.of("muhammed", "mohammed")));

        NameAliasDto response = service.addAlias(
                6L,
                new NameAliasCreateRequest("Mohammed", "TRANSLITERATION", BigDecimal.valueOf(0.96)),
                "admin@mystic.ai"
        );

        assertEquals("Mohammed", response.aliasName());
        verify(mergeService).refreshQueue("muhammed");
        verify(mergeService).refreshQueue("mohammed");
        verify(adminAuditLogRepository).save(any());
    }

    @Test
    void deleteAlias_rejectsWhenAliasBelongsToAnotherCanonical() {
        when(nameRepository.existsById(7L)).thenReturn(true);
        NameEntity otherCanonical = canonical(17L, "Mehmet", "mehmet", NameStatus.ACTIVE);
        NameAlias alias = NameAlias.builder()
                .id(88L)
                .canonicalName(otherCanonical)
                .aliasName("Mehmed")
                .normalizedAliasName("mehmed")
                .aliasType(AliasType.SPELLING_VARIANT)
                .confidence(BigDecimal.valueOf(0.93))
                .manual(true)
                .build();
        when(aliasRepository.findById(88L)).thenReturn(Optional.of(alias));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.deleteAlias(7L, 88L, "admin@mystic.ai"));

        assertTrue(ex.getMessage().contains("does not belong"));
        verify(aliasService, never()).removeAlias(any());
    }

    @Test
    void deleteAlias_removesAliasAndRefreshesQueues() {
        when(nameRepository.existsById(8L)).thenReturn(true);
        NameEntity canonical = canonical(8L, "Abdulkadir", "abdulkadir", NameStatus.ACTIVE);
        NameAlias alias = NameAlias.builder()
                .id(99L)
                .canonicalName(canonical)
                .aliasName("Abdülkadir")
                .normalizedAliasName("abdülkadir")
                .aliasType(AliasType.TRANSLITERATION)
                .confidence(BigDecimal.valueOf(0.95))
                .manual(true)
                .build();

        when(aliasRepository.findById(99L)).thenReturn(Optional.of(alias));
        when(aliasService.removeAlias(99L)).thenReturn(
                new NameAliasService.AliasMutationResult(null, Set.of("abdulkadir", "abdülkadir"))
        );

        service.deleteAlias(8L, 99L, "admin@mystic.ai");

        verify(aliasService).removeAlias(99L);
        verify(mergeService).refreshQueue("abdulkadir");
        verify(mergeService).refreshQueue("abdülkadir");
        verify(adminAuditLogRepository).save(any());
    }

    @Test
    void listAliases_forwardsToAliasService() {
        when(nameRepository.existsById(12L)).thenReturn(true);
        when(aliasService.listAliases(12L, 0, 25)).thenReturn(Page.empty());

        Page<NameAliasDto> page = service.listAliases(12L, 0, 25);

        assertEquals(0, page.getTotalElements());
        verify(aliasService).listAliases(12L, 0, 25);
    }

    private NameEntity canonical(Long id, String name, String normalizedName, NameStatus status) {
        NameEntity entity = new NameEntity();
        entity.setId(id);
        entity.setName(name);
        entity.setNormalizedName(normalizedName);
        entity.setGender(ParsedGender.UNKNOWN);
        entity.setStatus(status);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private AdminNameDetailDto detail(Long id, NameStatus status) {
        return new AdminNameDetailDto(
                id,
                "Ayse",
                "ayse",
                ParsedGender.FEMALE,
                "Türkçe",
                "Kısa",
                "Uzun",
                "Nazik",
                "Analiz",
                Boolean.TRUE,
                status,
                85,
                List.of("Nazik"),
                new AdminNameCanonicalInfoDto(id, "Ayse", "ayse"),
                List.of(),
                List.of(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }
}
