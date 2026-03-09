package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.admin.ManualRunTriggerResponseDto;
import com.mysticai.numerology.ingestion.entity.NameIngestionJobLock;
import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.model.SourceRunSummary;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import com.mysticai.numerology.ingestion.repository.RawNameSourceEntryRepository;
import com.mysticai.numerology.ingestion.scraper.NameSourceScraper;
import com.mysticai.numerology.ingestion.scraper.NameSourceScraperRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameIngestionServiceLockingTest {

    @Mock
    private NameSourceScraperRegistry scraperRegistry;
    @Mock
    private RawNameSourceEntryRepository rawRepository;
    @Mock
    private ParsedNameCandidateRepository parsedRepository;
    @Mock
    private NameNormalizationService normalizationService;
    @Mock
    private NameMergeService mergeService;
    @Mock
    private NameAliasService aliasService;
    @Mock
    private DuplicateContentRuleService duplicateContentRuleService;
    @Mock
    private NameSourceControlService sourceControlService;
    @Mock
    private NameIngestionRunService runService;
    @Mock
    private NameIngestionJobLockService lockService;
    @Mock
    private NameSourceScraper scraper;

    @Test
    void triggerManualRun_rejectsWhenSourceAlreadyRunning() {
        NameIngestionService service = buildService();
        when(sourceControlService.isSourceEnabled(SourceName.BEBEKISMI)).thenReturn(true);
        when(scraperRegistry.getRequired(SourceName.BEBEKISMI)).thenReturn(scraper);

        NameIngestionJobLock lockSnapshot = NameIngestionJobLock.builder()
                .sourceName(SourceName.BEBEKISMI)
                .status(IngestionJobLockStatus.RUNNING)
                .ownerInstanceId("instance-2")
                .jobRunId(999L)
                .build();
        when(lockService.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.MANUAL))
                .thenReturn(new NameIngestionJobLockService.LockAcquireResult(
                        false,
                        null,
                        ManualRunRejectionReason.ALREADY_RUNNING,
                        "source already running",
                        lockSnapshot,
                        false
                ));

        ManualRunTriggerResponseDto response = service.triggerManualRun(SourceName.BEBEKISMI, "ops@mystic.ai");

        assertFalse(response.accepted());
        assertEquals(ManualRunRejectionReason.ALREADY_RUNNING, response.rejectionReason());
        assertEquals("instance-2", response.lockOwnerInstanceId());
        assertEquals(999L, response.runningJobRunId());
        verify(scraper, never()).discoverDetailUrls();
    }

    @Test
    void runScheduledSources_skipsLockedSourceWithoutFailingBatch() {
        NameIngestionService service = buildService();
        when(sourceControlService.isSourceEnabled(any())).thenAnswer(invocation -> invocation.getArgument(0) == SourceName.BEBEKISMI);
        when(scraperRegistry.getRequired(SourceName.BEBEKISMI)).thenReturn(scraper);

        NameIngestionJobLock lockSnapshot = NameIngestionJobLock.builder()
                .sourceName(SourceName.BEBEKISMI)
                .status(IngestionJobLockStatus.RUNNING)
                .ownerInstanceId("instance-2")
                .build();
        when(lockService.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.SCHEDULED))
                .thenReturn(new NameIngestionJobLockService.LockAcquireResult(
                        false,
                        null,
                        ManualRunRejectionReason.ALREADY_RUNNING,
                        "source already running",
                        lockSnapshot,
                        false
                ));

        List<SourceRunSummary> summaries = service.runScheduledSources();

        assertEquals(1, summaries.size());
        assertEquals(SourceName.BEBEKISMI, summaries.getFirst().source());
        assertEquals(0, summaries.getFirst().discoveredCount());
        assertTrue(summaries.getFirst().fetchedCount() == 0);
        verify(scraper, never()).discoverDetailUrls();
    }

    @Test
    void triggerManualRun_rejectsWhenSourceDisabled() {
        NameIngestionService service = buildService();
        when(sourceControlService.isSourceEnabled(SourceName.BEBEKISMI)).thenReturn(false);
        when(scraperRegistry.getRequired(SourceName.BEBEKISMI)).thenReturn(scraper);

        ManualRunTriggerResponseDto response = service.triggerManualRun(SourceName.BEBEKISMI, "ops@mystic.ai");

        assertFalse(response.accepted());
        assertEquals(ManualRunRejectionReason.SOURCE_DISABLED, response.rejectionReason());
        verify(lockService, never()).tryAcquire(any(), any());
    }

    @Test
    void runScheduledSources_continuesWhenSourceExecutionThrows() {
        NameIngestionService service = buildService();
        when(sourceControlService.isSourceEnabled(any())).thenAnswer(invocation -> invocation.getArgument(0) == SourceName.BEBEKISMI);
        when(scraperRegistry.getRequired(SourceName.BEBEKISMI)).thenThrow(new IllegalStateException("scraper unavailable"));

        List<SourceRunSummary> summaries = service.runScheduledSources();

        assertEquals(1, summaries.size());
        assertEquals(SourceName.BEBEKISMI, summaries.getFirst().source());
        assertEquals(0, summaries.getFirst().discoveredCount());
    }

    private NameIngestionService buildService() {
        return new NameIngestionService(
                new NameIngestionProperties(),
                scraperRegistry,
                rawRepository,
                parsedRepository,
                normalizationService,
                mergeService,
                aliasService,
                duplicateContentRuleService,
                sourceControlService,
                runService,
                lockService
        );
    }
}
