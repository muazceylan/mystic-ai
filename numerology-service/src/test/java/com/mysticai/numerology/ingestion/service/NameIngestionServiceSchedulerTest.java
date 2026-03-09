package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.model.SourceRunSummary;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import com.mysticai.numerology.ingestion.repository.RawNameSourceEntryRepository;
import com.mysticai.numerology.ingestion.scraper.NameSourceScraperRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameIngestionServiceSchedulerTest {

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
    private NameIngestionJobLockService jobLockService;

    @Test
    void runScheduledSources_skipsAllDisabledSources() {
        NameIngestionProperties properties = new NameIngestionProperties();
        NameIngestionService service = new NameIngestionService(
                properties,
                scraperRegistry,
                rawRepository,
                parsedRepository,
                normalizationService,
                mergeService,
                aliasService,
                duplicateContentRuleService,
                sourceControlService,
                runService,
                jobLockService
        );

        when(sourceControlService.isSourceEnabled(any())).thenReturn(false);

        List<SourceRunSummary> summaries = service.runScheduledSources();

        assertTrue(summaries.isEmpty());
        verifyNoInteractions(scraperRegistry);
    }
}
