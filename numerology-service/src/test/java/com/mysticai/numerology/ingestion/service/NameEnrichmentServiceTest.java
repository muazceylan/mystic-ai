package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRecomputeResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRunDto;
import com.mysticai.numerology.ingestion.entity.NameEnrichmentRun;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.model.NameEnrichmentRunStatus;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEnrichmentRunRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameTagRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameEnrichmentServiceTest {

    @Mock
    private NameEntityRepository nameRepository;

    @Mock
    private NameTagRepository tagRepository;

    @Mock
    private NameAliasRepository aliasRepository;

    @Mock
    private ParsedNameCandidateRepository parsedRepository;

    @Mock
    private NameEnrichmentRunRepository runRepository;

    @Mock
    private NameEnrichmentRuleEngine ruleEngine;

    private NameEnrichmentService service;

    @BeforeEach
    void setUp() {
        NameTagTaxonomyService taxonomyService = new NameTagTaxonomyService();
        service = new NameEnrichmentService(
                nameRepository,
                tagRepository,
                aliasRepository,
                parsedRepository,
                runRepository,
                taxonomyService,
                ruleEngine,
                new NoOpTransactionManager()
        );

        when(runRepository.save(any(NameEnrichmentRun.class))).thenAnswer(invocation -> {
            NameEnrichmentRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                run.setId(99L);
            }
            if (run.getCreatedAt() == null) {
                run.setCreatedAt(LocalDateTime.now());
            }
            if (run.getUpdatedAt() == null) {
                run.setUpdatedAt(LocalDateTime.now());
            }
            return run;
        });

        lenient().when(ruleEngine.lowConfidenceThreshold()).thenReturn(BigDecimal.valueOf(0.55));
        lenient().when(aliasRepository.findByCanonicalNameIdOrderByAliasNameAsc(any())).thenReturn(List.of());
        lenient().when(parsedRepository.countByCanonicalNameId(any())).thenReturn(0L);
        lenient().when(tagRepository.existsByNameIdAndTagGroupAndNormalizedTag(any(), any(), any())).thenReturn(false);
        lenient().when(tagRepository.deleteByNameIdAndSource(any(), eq(NameTagSource.RULE))).thenReturn(0L);
    }

    @Test
    void recomputeSingleName_rejectsNonApprovedName() {
        NameEntity pending = name(1L, "Elif", NameStatus.PENDING_REVIEW);
        when(nameRepository.findById(1L)).thenReturn(Optional.of(pending));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> service.recomputeSingleName(1L, "admin@mystic.ai"));

        assertTrue(ex.getMessage().contains("not enrichable"));
        verify(tagRepository, never()).save(any());
    }

    @Test
    void recomputeSingleName_preservesManualTagAndSkipsDuplicateRule() {
        NameEntity active = name(2L, "Nur", NameStatus.ACTIVE);
        NameTag manualTag = NameTag.builder()
                .id(71L)
                .name(active)
                .tagGroup(NameTagGroup.THEME)
                .tag("light")
                .normalizedTag("light")
                .source(NameTagSource.MANUAL)
                .confidence(BigDecimal.ONE)
                .build();

        when(nameRepository.findById(2L)).thenReturn(Optional.of(active));
        when(tagRepository.findByNameIdOrderByTagGroupAscTagAsc(2L)).thenReturn(List.of(manualTag));
        when(ruleEngine.recommend(any(), any(Long.class), any(Long.class))).thenReturn(List.of(
                new NameEnrichmentRuleEngine.TagRecommendation(NameTagGroup.THEME, "light", BigDecimal.valueOf(0.90), "meaning contains nur")
        ));

        NameEnrichmentRecomputeResponseDto response = service.recomputeSingleName(2L, "admin@mystic.ai");

        assertFalse(response.updated());
        assertEquals(0, response.insertedTagCount());
        verify(tagRepository, never()).save(any());
    }

    @Test
    void recomputeSingleName_duplicateRecommendationsDoNotInsertDuplicates() {
        NameEntity active = name(3L, "Asaf", NameStatus.ACTIVE);
        when(nameRepository.findById(3L)).thenReturn(Optional.of(active));
        when(tagRepository.findByNameIdOrderByTagGroupAscTagAsc(3L)).thenReturn(List.of());
        when(ruleEngine.recommend(any(), any(Long.class), any(Long.class))).thenReturn(List.of(
                new NameEnrichmentRuleEngine.TagRecommendation(NameTagGroup.THEME, "power", BigDecimal.valueOf(0.87), "meaning contains guc"),
                new NameEnrichmentRuleEngine.TagRecommendation(NameTagGroup.THEME, "power", BigDecimal.valueOf(0.82), "meaning contains kuvvet")
        ));

        NameEnrichmentRecomputeResponseDto response = service.recomputeSingleName(3L, "admin@mystic.ai");

        assertTrue(response.updated());
        assertEquals(1, response.insertedTagCount());
        verify(tagRepository, times(1)).save(any());
    }

    @Test
    void runBatch_tracksSuccessMetrics() {
        NameEntity active = name(4L, "Mira", NameStatus.ACTIVE);
        when(nameRepository.findByStatusIn(any(), any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(active)));
        when(nameRepository.findById(4L)).thenReturn(Optional.of(active));
        when(tagRepository.findByNameIdOrderByTagGroupAscTagAsc(4L)).thenReturn(List.of());
        when(ruleEngine.recommend(any(), any(Long.class), any(Long.class))).thenReturn(List.of(
                new NameEnrichmentRuleEngine.TagRecommendation(NameTagGroup.VIBE, "soft", BigDecimal.valueOf(0.70), "phonetic profile")
        ));

        NameEnrichmentRunDto run = service.runBatch("ops@mystic.ai");

        assertEquals(NameEnrichmentRunStatus.SUCCESS, run.status());
        assertEquals(1, run.processedCount());
        assertEquals(1, run.updatedCount());
        assertEquals(0, run.errorCount());
    }

    private NameEntity name(Long id, String name, NameStatus status) {
        NameEntity entity = new NameEntity();
        entity.setId(id);
        entity.setName(name);
        entity.setNormalizedName(name.toLowerCase());
        entity.setStatus(status);
        entity.setGender(ParsedGender.UNKNOWN);
        return entity;
    }

    private static final class NoOpTransactionManager extends AbstractPlatformTransactionManager {
        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, org.springframework.transaction.TransactionDefinition definition) {
            // no-op transaction for unit tests
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            // no-op transaction for unit tests
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            // no-op transaction for unit tests
        }
    }
}
