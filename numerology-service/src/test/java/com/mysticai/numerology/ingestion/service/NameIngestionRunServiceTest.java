package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.SourceHealthDetailDto;
import com.mysticai.numerology.ingestion.entity.NameIngestionRun;
import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameIngestionRunRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeAuditLogRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeQueueRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameIngestionRunServiceTest {

    @Mock
    private NameIngestionRunRepository runRepository;
    @Mock
    private NameMergeQueueRepository mergeQueueRepository;
    @Mock
    private NameMergeAuditLogRepository auditLogRepository;
    @Mock
    private NameSourceControlService sourceControlService;
    @Mock
    private NameIngestionMetricsService metricsService;

    @InjectMocks
    private NameIngestionRunService service;

    @Captor
    private ArgumentCaptor<NameIngestionRun> runCaptor;

    @Test
    void finishRun_persistsTrackingFieldsAndPublishesMetrics() {
        LocalDateTime started = LocalDateTime.now().minusSeconds(8);
        NameIngestionRun run = NameIngestionRun.builder()
                .id(10L)
                .sourceName(SourceName.BEBEKISMI)
                .triggerType(IngestionTriggerType.MANUAL)
                .status(IngestionRunStatus.RUNNING)
                .startedAt(started)
                .build();

        when(runRepository.findById(10L)).thenReturn(Optional.of(run));
        when(mergeQueueRepository.countActiveBacklogForSource(eq(SourceName.BEBEKISMI), any())).thenReturn(4L);
        when(auditLogRepository.countBySelectedSourceAndActionTypeInAndCreatedAtBetween(eq(SourceName.BEBEKISMI), any(), eq(started), any()))
                .thenReturn(2L);
        when(runRepository.save(any(NameIngestionRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NameIngestionRunService.RunAggregate aggregate = new NameIngestionRunService.RunAggregate(
                42, 30, 21, 3, 4, 2, 1, 5, 7, 14, 12, 10
        );
        service.finishRun(10L, aggregate, IngestionRunStatus.PARTIAL_SUCCESS, "minor errors", LocalDateTime.now());

        verify(runRepository).save(runCaptor.capture());
        NameIngestionRun saved = runCaptor.getValue();
        assertEquals(IngestionRunStatus.PARTIAL_SUCCESS, saved.getStatus());
        assertEquals(42, saved.getDiscoveredCount());
        assertEquals(21, saved.getParseSuccessCount());
        assertEquals(4, saved.getReviewBacklogCountSnapshot());
        assertEquals(2, saved.getApprovedWriteCount());
        assertEquals(7, saved.getCanonicalResolvedCount());
        assertEquals(14, saved.getOriginFilledCount());
        assertEquals(12, saved.getMeaningShortFilledCount());
        assertEquals(10, saved.getMeaningLongFilledCount());
        assertTrue(saved.getDurationMs() >= 0);
        verify(metricsService).recordRun(saved);
    }

    @Test
    void sourceHealth_detectsParseFailureAnomaly() {
        LocalDateTime now = LocalDateTime.now();
        NameIngestionRun latest = run(1L, now.minusMinutes(5), 120, 90, 30, 30, 18, 10, 8, 40, IngestionRunStatus.PARTIAL_SUCCESS);
        NameIngestionRun prev1 = run(2L, now.minusHours(2), 130, 105, 4, 2, 3, 2, 2, 95, IngestionRunStatus.SUCCESS);
        NameIngestionRun prev2 = run(3L, now.minusHours(4), 128, 102, 3, 1, 2, 2, 2, 92, IngestionRunStatus.SUCCESS);
        NameIngestionRun prev3 = run(4L, now.minusHours(6), 126, 98, 3, 1, 2, 1, 2, 90, IngestionRunStatus.SUCCESS);

        when(sourceControlService.isSourceEnabled(SourceName.SFK_ISTANBUL_EDU)).thenReturn(true);
        when(runRepository.findTop20BySourceNameOrderByStartedAtDesc(SourceName.SFK_ISTANBUL_EDU))
                .thenReturn(List.of(latest, prev1, prev2, prev3));
        when(runRepository.findTop1BySourceNameAndStatusInOrderByStartedAtDesc(eq(SourceName.SFK_ISTANBUL_EDU), any()))
                .thenReturn(Optional.of(latest));
        when(runRepository.findTop1BySourceNameAndStatusOrderByStartedAtDesc(SourceName.SFK_ISTANBUL_EDU, IngestionRunStatus.FAILED))
                .thenReturn(Optional.empty());
        when(runRepository.findBySourceNameOrderByStartedAtDesc(eq(SourceName.SFK_ISTANBUL_EDU), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(latest, prev1, prev2, prev3)));

        SourceHealthDetailDto detail = service.getSourceHealthDetail(SourceName.SFK_ISTANBUL_EDU);

        assertTrue(detail.summary().hasAnomaly());
        assertTrue(detail.summary().anomalyTypes().contains("PARSE_FAILURE_SPIKE"));
        assertFalse(detail.summary().anomalyReasonSummary().isBlank());
        assertEquals(4, detail.recentRuns().size());
    }

    private NameIngestionRun run(
            Long id,
            LocalDateTime startedAt,
            int discovered,
            int fetched,
            int parseFailure,
            int mismatch,
            int duplicate,
            int lowQuality,
            int conflict,
            int parseSuccess,
            IngestionRunStatus status
    ) {
        return NameIngestionRun.builder()
                .id(id)
                .sourceName(SourceName.SFK_ISTANBUL_EDU)
                .triggerType(IngestionTriggerType.SCHEDULED)
                .status(status)
                .startedAt(startedAt)
                .finishedAt(startedAt.plusMinutes(5))
                .durationMs(300000L)
                .discoveredCount(discovered)
                .fetchedCount(fetched)
                .parseFailureCount(parseFailure)
                .parseSuccessCount(parseSuccess)
                .mismatchCount(mismatch)
                .duplicateCount(duplicate)
                .lowQualityCount(lowQuality)
                .conflictCount(conflict)
                .canonicalResolvedCount(12)
                .originFilledCount(parseSuccess)
                .meaningShortFilledCount(parseSuccess - 1)
                .meaningLongFilledCount(parseSuccess - 2)
                .reviewBacklogCountSnapshot(6)
                .approvedWriteCount(1)
                .build();
    }
}
