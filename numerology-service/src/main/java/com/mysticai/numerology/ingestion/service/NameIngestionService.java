package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.NormalizedCandidateData;
import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.dto.RawFetchPayload;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalBackfillResponse;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalResolutionDto;
import com.mysticai.numerology.ingestion.dto.admin.ManualRunTriggerResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionRunDto;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionJobLockDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueBatchActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueBatchActionResult;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueFilter;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueGroupDto;
import com.mysticai.numerology.ingestion.dto.admin.RunningIngestionJobDto;
import com.mysticai.numerology.ingestion.dto.admin.StaleLockRecoveryResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceHealthDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceHealthSummaryDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceToggleResponseDto;
import com.mysticai.numerology.ingestion.entity.NameMergeQueue;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.ParseStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.model.SourceRunSummary;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import com.mysticai.numerology.ingestion.repository.RawNameSourceEntryRepository;
import com.mysticai.numerology.ingestion.scraper.NameSourceScraper;
import com.mysticai.numerology.ingestion.scraper.NameSourceScraperRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NameIngestionService {

    private final NameIngestionProperties properties;
    private final NameSourceScraperRegistry scraperRegistry;
    private final RawNameSourceEntryRepository rawRepository;
    private final ParsedNameCandidateRepository parsedRepository;
    private final NameNormalizationService normalizationService;
    private final NameMergeService mergeService;
    private final NameAliasService aliasService;
    private final DuplicateContentRuleService duplicateContentRuleService;
    private final NameSourceControlService sourceControlService;
    private final NameIngestionRunService ingestionRunService;
    private final NameIngestionJobLockService jobLockService;

    public List<SourceRunSummary> runEnabledSources() {
        return runSourcesByTrigger(IngestionTriggerType.MANUAL, null);
    }

    public List<SourceRunSummary> runScheduledSources() {
        return runSourcesByTrigger(IngestionTriggerType.SCHEDULED, "scheduler");
    }

    public ManualRunTriggerResponseDto triggerManualRun(SourceName sourceName, String triggeredBy) {
        try {
            RunExecutionResult result = runSourceInternal(sourceName, IngestionTriggerType.MANUAL, triggeredBy);
            return result.toManualResponse(sourceName);
        } catch (Exception ex) {
            log.error("manual trigger failed source={} reason={}", sourceName, ex.getMessage(), ex);
            SourceRunSummary summary = emptySummary(sourceName);
            return RunExecutionResult.rejected(
                    summary,
                    ManualRunRejectionReason.LOCK_ERROR,
                    "manual trigger failed: " + ex.getMessage()
            ).toManualResponse(sourceName);
        }
    }

    public List<ManualRunTriggerResponseDto> triggerEnabledSourcesManual(String triggeredBy) {
        List<ManualRunTriggerResponseDto> responses = new ArrayList<>();
        for (SourceName sourceName : SourceName.values()) {
            if (!sourceControlService.isSourceEnabled(sourceName)) {
                continue;
            }
            responses.add(triggerManualRun(sourceName, triggeredBy));
        }
        return responses;
    }

    private List<SourceRunSummary> runSourcesByTrigger(IngestionTriggerType triggerType, String triggeredBy) {
        List<SourceRunSummary> summaries = new ArrayList<>();
        for (SourceName sourceName : SourceName.values()) {
            if (!sourceControlService.isSourceEnabled(sourceName)) {
                continue;
            }
            try {
                summaries.add(runSourceInternal(sourceName, triggerType, triggeredBy).summary());
            } catch (Exception ex) {
                log.error("source={} trigger={} execution failed without summary: {}", sourceName, triggerType, ex.getMessage(), ex);
                summaries.add(emptySummary(sourceName));
            }
        }
        return summaries;
    }

    public SourceRunSummary runSource(SourceName sourceName) {
        try {
            return runSourceInternal(sourceName, IngestionTriggerType.MANUAL, null).summary();
        } catch (Exception ex) {
            log.error("runSource failed source={} reason={}", sourceName, ex.getMessage(), ex);
            return emptySummary(sourceName);
        }
    }

    private RunExecutionResult runSourceInternal(SourceName sourceName, IngestionTriggerType triggerType, String triggeredBy) {
        NameSourceScraper scraper = scraperRegistry.getRequired(sourceName);
        NameIngestionProperties.SourceSettings sourceSettings = properties.settingsFor(sourceName);
        SourceRunSummary emptySummary = emptySummary(sourceName);

        if (!sourceControlService.isSourceEnabled(sourceName)) {
            return RunExecutionResult.rejected(
                    emptySummary,
                    ManualRunRejectionReason.SOURCE_DISABLED,
                    "source is disabled"
            );
        }

        NameIngestionJobLockService.LockAcquireResult lockAcquire = jobLockService.tryAcquire(sourceName, triggerType);
        if (!lockAcquire.acquired()) {
            String owner = lockAcquire.lockSnapshot() == null ? null : lockAcquire.lockSnapshot().getOwnerInstanceId();
            Long runningJobRunId = lockAcquire.lockSnapshot() == null ? null : lockAcquire.lockSnapshot().getJobRunId();
            IngestionJobLockStatus lockStatus = lockAcquire.lockSnapshot() == null ? null : lockAcquire.lockSnapshot().getStatus();

            log.warn(
                    "name-ingestion skip source={} trigger={} reason={} owner={} runId={} stale={}",
                    sourceName,
                    triggerType,
                    lockAcquire.rejectionReason(),
                    owner,
                    runningJobRunId,
                    lockAcquire.staleLock()
            );

            return RunExecutionResult.rejected(
                    emptySummary,
                    lockAcquire.rejectionReason(),
                    lockAcquire.message(),
                    owner,
                    runningJobRunId,
                    lockStatus,
                    lockAcquire.staleLock()
            );
        }

        NameIngestionJobLockService.JobLockHandle lockHandle = lockAcquire.handle();
        Long runId = null;
        Instant startedAt = Instant.now();
        RunCounters counters = new RunCounters();
        String errorSummary = null;
        IngestionRunStatus runStatus = IngestionRunStatus.FAILED;
        boolean releaseSuccess = false;

        try {
            runId = ingestionRunService.startRun(sourceName, triggerType, triggeredBy).getId();
            jobLockService.attachRunId(lockHandle, runId);

            Set<String> discoveredUrls;
            try {
                discoveredUrls = new LinkedHashSet<>(scraper.discoverDetailUrls());
                runStatus = IngestionRunStatus.SUCCESS;
            } catch (Exception ex) {
                log.error("source={} discovery failed: {}", sourceName, ex.getMessage(), ex);
                errorSummary = "discovery failed: " + ex.getMessage();
                runStatus = IngestionRunStatus.FAILED;
                discoveredUrls = Set.of();
            }

            counters.discoveredCount = discoveredUrls.size();
            int maxFetch = Math.min(sourceSettings.getMaxFetchUrlsPerRun(), discoveredUrls.size());

            int i = 0;
            for (String url : discoveredUrls) {
                if (i++ >= maxFetch) {
                    break;
                }
                try {
                    jobLockService.heartbeat(lockHandle);

                    RawFetchPayload payload = scraper.fetchRawEntry(url);
                    RawNameSourceEntry rawEntry = upsertRaw(payload);

                    if (payload.parseStatus() == ParseStatus.FETCH_FAILED || payload.parseStatus() == ParseStatus.SKIPPED
                            || payload.rawHtml() == null || payload.rawHtml().isBlank()) {
                        counters.fetchFailedCount++;
                        continue;
                    }

                    counters.fetchedCount++;

                    Optional<ParsedNameCandidate> existingCandidate = parsedRepository.findByRawEntry(rawEntry);
                    if (existingCandidate.isPresent() && rawEntry.getParseStatus() == ParseStatus.PARSED) {
                        continue;
                    }

                    ParseOutcome outcome = parseAndPersist(scraper, rawEntry);
                    if (outcome.success()) {
                        counters.parsedSuccessCount++;
                    } else {
                        counters.parsedFailedCount++;
                    }
                    counters.conflictCount += outcome.conflictCount();
                    counters.mismatchCount += outcome.mismatchFlag() ? 1 : 0;
                    counters.duplicateCount += outcome.duplicateFlag() ? 1 : 0;
                    counters.lowQualityCount += outcome.lowQualityFlag() ? 1 : 0;
                    counters.canonicalResolvedCount += outcome.canonicalResolved() ? 1 : 0;
                    counters.originFilledCount += outcome.originFilled() ? 1 : 0;
                    counters.meaningShortFilledCount += outcome.meaningShortFilled() ? 1 : 0;
                    counters.meaningLongFilledCount += outcome.meaningLongFilled() ? 1 : 0;
                    counters.reviewQueuedCount += outcome.reviewQueued() ? 1 : 0;
                } catch (Exception ex) {
                    counters.fetchFailedCount++;
                    counters.parsedFailedCount++;
                    if (errorSummary == null) {
                        errorSummary = "fetch loop failure: " + ex.getMessage();
                    }
                    log.error("source={} url={} ingestion failed: {}", sourceName, url, ex.getMessage(), ex);
                }
            }

            if (runStatus != IngestionRunStatus.FAILED
                    && counters.discoveredCount > 0
                    && counters.fetchedCount == 0
                    && counters.parsedSuccessCount == 0) {
                runStatus = IngestionRunStatus.FAILED;
            } else if (runStatus != IngestionRunStatus.FAILED
                    && (counters.fetchFailedCount > 0 || counters.parsedFailedCount > 0)) {
                runStatus = counters.parsedSuccessCount > 0 ? IngestionRunStatus.PARTIAL_SUCCESS : IngestionRunStatus.FAILED;
            }

            Instant finishedAt = Instant.now();
            ingestionRunService.finishRun(
                    runId,
                    counters.toAggregate(),
                    runStatus,
                    errorSummary,
                    LocalDateTime.now()
            );
            releaseSuccess = runStatus != IngestionRunStatus.FAILED;

            SourceRunSummary summary = new SourceRunSummary(
                    sourceName,
                    counters.discoveredCount,
                    counters.fetchedCount,
                    counters.fetchFailedCount,
                    counters.parsedSuccessCount,
                    counters.parsedFailedCount,
                    counters.conflictCount,
                    counters.reviewQueuedCount,
                    startedAt,
                    finishedAt
            );

            log.info(
                    "name-ingestion source={} discovered={} fetched={} fetchFailed={} parsedOk={} parsedFailed={} conflicts={} reviewQueued={} successRate={}%%",
                    sourceName,
                    summary.discoveredCount(),
                    summary.fetchedCount(),
                    summary.fetchFailedCount(),
                    summary.parsedSuccessCount(),
                    summary.parsedFailedCount(),
                    summary.conflictCount(),
                    summary.reviewQueuedCount(),
                    successRate(summary)
            );

            return RunExecutionResult.accepted(summary);
        } catch (Exception ex) {
            log.error("source={} trigger={} run failed before completion: {}", sourceName, triggerType, ex.getMessage(), ex);
            if (errorSummary == null) {
                errorSummary = "unexpected run failure: " + ex.getMessage();
            }
            if (runId != null) {
                ingestionRunService.finishRun(
                        runId,
                        counters.toAggregate(),
                        IngestionRunStatus.FAILED,
                        errorSummary,
                        LocalDateTime.now()
                );
            }
            SourceRunSummary failedSummary = new SourceRunSummary(
                    sourceName,
                    counters.discoveredCount,
                    counters.fetchedCount,
                    counters.fetchFailedCount,
                    counters.parsedSuccessCount,
                    counters.parsedFailedCount,
                    counters.conflictCount,
                    counters.reviewQueuedCount,
                    startedAt,
                    Instant.now()
            );
            return RunExecutionResult.accepted(failedSummary);
        } finally {
            String releaseReason = releaseSuccess ? "completed" : defaultErrorSummary(errorSummary, runStatus);
            jobLockService.release(lockHandle, releaseSuccess, releaseReason);
        }
    }

    public ParsedNameCandidate reparseRaw(Long rawId) {
        RawNameSourceEntry rawEntry = rawRepository.findById(rawId)
                .orElseThrow(() -> new IllegalArgumentException("raw entry not found: " + rawId));
        NameSourceScraper scraper = scraperRegistry.getRequired(rawEntry.getSourceName());
        ParseOutcome outcome = parseAndPersist(scraper, rawEntry);
        if (!outcome.success()) {
            throw new IllegalStateException("reparse failed for raw entry: " + rawId);
        }
        return parsedRepository.findByRawEntry(rawEntry)
                .orElseThrow(() -> new IllegalStateException("parsed candidate missing after reparse for raw entry: " + rawId));
    }

    public Page<RawNameSourceEntry> listRaw(SourceName sourceName, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "fetchedAt"));
        if (sourceName != null) {
            return rawRepository.findBySourceName(sourceName, pageable);
        }
        return rawRepository.findAll(pageable);
    }

    public Page<ParsedNameCandidate> listParsed(int page, int size) {
        return parsedRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    public Page<NameMergeQueue> listMergeQueue(MergeReviewStatus reviewStatus, int page, int size) {
        return mergeService.listRawQueue(reviewStatus, page, size);
    }

    public List<SourceHealthSummaryDto> listSourceHealth() {
        return ingestionRunService.listSourceHealthSummaries();
    }

    public SourceHealthDetailDto getSourceHealthDetail(SourceName sourceName) {
        return ingestionRunService.getSourceHealthDetail(sourceName);
    }

    public Page<NameIngestionRunDto> listIngestionRuns(SourceName sourceName, int page, int size) {
        return ingestionRunService.listRuns(sourceName, page, size);
    }

    public NameIngestionRunDto getIngestionRun(Long runId) {
        return ingestionRunService.getRun(runId);
    }

    public SourceToggleResponseDto enableSource(SourceName sourceName, String actedBy) {
        return sourceControlService.enable(sourceName, actedBy);
    }

    public SourceToggleResponseDto disableSource(SourceName sourceName, String actedBy) {
        return sourceControlService.disable(sourceName, actedBy);
    }

    public List<RunningIngestionJobDto> listRunningJobs() {
        return jobLockService.listRunningJobs();
    }

    public List<NameIngestionJobLockDto> listJobLocks() {
        return jobLockService.listLocks();
    }

    public NameIngestionJobLockDto getJobLock(SourceName sourceName) {
        return jobLockService.getLock(sourceName)
                .orElseThrow(() -> new IllegalArgumentException("job lock not found for source: " + sourceName));
    }

    public StaleLockRecoveryResponseDto recoverStaleLock(SourceName sourceName, String actedBy) {
        return jobLockService.recoverStale(sourceName, actedBy);
    }

    public Page<ReviewQueueGroupDto> listGroupedMergeQueue(ReviewQueueFilter filter, int page, int size) {
        return mergeService.listGroupedQueue(filter, page, size);
    }

    public ReviewQueueActionResponse approveMergeQueue(Long queueId, SourceName chosenSource, String reviewNote, String actedBy) {
        return mergeService.approve(queueId, chosenSource, reviewNote, actedBy);
    }

    public ReviewQueueActionResponse rejectMergeQueue(Long queueId, String reviewNote, String actedBy) {
        return mergeService.reject(queueId, reviewNote, actedBy);
    }

    public ReviewQueueActionResponse skipMergeQueue(Long queueId, String reviewNote, String actedBy) {
        return mergeService.skip(queueId, reviewNote, actedBy);
    }

    public ReviewQueueActionResponse mergeQueue(
            Long queueId,
            SourceName chosenSource,
            Long canonicalNameId,
            String canonicalNameOverride,
            Long fallbackCandidateId,
            Map<String, Long> selectedFieldCandidateIds,
            String reviewNote,
            String actedBy
    ) {
        return mergeService.merge(
                queueId,
                chosenSource,
                canonicalNameId,
                canonicalNameOverride,
                fallbackCandidateId,
                selectedFieldCandidateIds,
                reviewNote,
                actedBy
        );
    }

    public ReviewQueueActionResponse updateMergeQueueNote(Long queueId, String reviewNote, String actedBy) {
        return mergeService.updateReviewNote(queueId, reviewNote, actedBy);
    }

    public ReviewQueueBatchActionResponse bulkApprove(
            List<Long> queueIds,
            SourceName chosenSource,
            String reviewNote,
            String actedBy
    ) {
        return runBulk(queueIds, queueId -> mergeService.approve(queueId, chosenSource, reviewNote, actedBy));
    }

    public ReviewQueueBatchActionResponse bulkReject(
            List<Long> queueIds,
            String reviewNote,
            String actedBy
    ) {
        return runBulk(queueIds, queueId -> mergeService.reject(queueId, reviewNote, actedBy));
    }

    public ReviewQueueBatchActionResponse autoMergeEligibleQueues(
            List<Long> queueIds,
            String reviewNote,
            String actedBy
    ) {
        List<Long> targetQueueIds = mergeService.listAutoMergeEligibleQueueIds(queueIds);
        return runBulk(targetQueueIds, queueId -> mergeService.autoMerge(queueId, reviewNote, actedBy));
    }

    private ReviewQueueBatchActionResponse runBulk(List<Long> queueIds, java.util.function.Function<Long, ReviewQueueActionResponse> action) {
        if (queueIds == null || queueIds.isEmpty()) {
            return new ReviewQueueBatchActionResponse(0, 0, 0, List.of());
        }

        List<ReviewQueueBatchActionResult> results = new ArrayList<>();
        for (Long queueId : queueIds) {
            try {
                ReviewQueueActionResponse response = action.apply(queueId);
                results.add(new ReviewQueueBatchActionResult(
                        queueId,
                        true,
                        response.reviewStatus(),
                        response.nameId(),
                        null
                ));
            } catch (Exception ex) {
                results.add(new ReviewQueueBatchActionResult(
                        queueId,
                        false,
                        null,
                        null,
                        ex.getMessage()
                ));
            }
        }

        int succeeded = (int) results.stream().filter(ReviewQueueBatchActionResult::success).count();
        int failed = results.size() - succeeded;
        return new ReviewQueueBatchActionResponse(results.size(), succeeded, failed, results);
    }

    public Page<NameAliasDto> listAliases(Long canonicalNameId, int page, int size) {
        return aliasService.listAliases(canonicalNameId, page, size);
    }

    public NameAliasDto addManualAlias(
            Long canonicalNameId,
            String aliasName,
            AliasType aliasType,
            java.math.BigDecimal confidence
    ) {
        NameAliasService.AliasMutationResult result = aliasService.addManualAlias(canonicalNameId, aliasName, aliasType, confidence);
        refreshQueues(result.affectedQueueKeys());
        return result.alias();
    }

    public void removeAlias(Long aliasId) {
        NameAliasService.AliasMutationResult result = aliasService.removeAlias(aliasId);
        refreshQueues(result.affectedQueueKeys());
    }

    public CanonicalNameDetailDto getCanonicalDetail(Long canonicalNameId) {
        return aliasService.getCanonicalDetail(canonicalNameId);
    }

    public CanonicalResolutionDto resolveCanonical(String inputName) {
        return aliasService.resolveForApi(inputName);
    }

    public CanonicalBackfillResponse backfillCanonicalData() {
        NameAliasService.BackfillResult result = aliasService.backfillCanonicalAndAliasData();
        int queueRefreshCount = refreshQueues(result.affectedQueueKeys());
        return aliasService.toBackfillResponse(result, queueRefreshCount);
    }

    private int refreshQueues(java.util.Collection<String> canonicalKeys) {
        if (canonicalKeys == null || canonicalKeys.isEmpty()) {
            return 0;
        }
        int refreshed = 0;
        for (String canonicalKey : canonicalKeys) {
            if (canonicalKey == null || canonicalKey.isBlank()) {
                continue;
            }
            mergeService.refreshQueue(canonicalKey);
            refreshed++;
        }
        return refreshed;
    }

    @Transactional
    protected ParseOutcome parseAndPersist(NameSourceScraper scraper, RawNameSourceEntry rawEntry) {
        Optional<ParsedNameCandidateDraft> draftOptional;
        try {
            draftOptional = scraper.parse(rawEntry);
        } catch (Exception ex) {
            rawEntry.setParseStatus(ParseStatus.PARSE_FAILED);
            rawRepository.save(rawEntry);
            log.warn("parse failed source={} rawEntry={} reason={}", rawEntry.getSourceName(), rawEntry.getId(), ex.getMessage());
            return ParseOutcome.failed();
        }

        if (draftOptional.isEmpty()) {
            rawEntry.setParseStatus(ParseStatus.PARSE_FAILED);
            rawRepository.save(rawEntry);
            return ParseOutcome.failed();
        }

        ParsedNameCandidateDraft draft = draftOptional.get();
        String normalizedName = normalizationService.normalizedName(draft.name());
        if (normalizedName.isBlank()) {
            rawEntry.setParseStatus(ParseStatus.PARSE_FAILED);
            rawRepository.save(rawEntry);
            return ParseOutcome.failed();
        }

        List<ParsedNameCandidate> duplicates = parsedRepository.findPotentialDuplicateCandidates(rawEntry.getChecksum(), normalizedName);
        boolean duplicateFlag = duplicateContentRuleService.hasDuplicates(duplicates);

        NormalizedCandidateData normalized = normalizationService.normalize(draft, rawEntry.getRawTitle(), duplicateFlag);
        if (normalized.normalizedName() == null || normalized.normalizedName().isBlank()) {
            rawEntry.setParseStatus(ParseStatus.PARSE_FAILED);
            rawRepository.save(rawEntry);
            return ParseOutcome.failed();
        }

        NameAliasService.AliasResolution aliasResolution = aliasService.resolveByNormalizedName(normalized.normalizedName());
        String canonicalNormalizedName = aliasResolution.matchLevel().canAutoGroup()
                ? aliasResolution.canonicalNormalizedName()
                : normalized.normalizedName();
        Long canonicalNameId = aliasResolution.matchLevel().canAutoGroup()
                ? aliasResolution.canonicalNameId()
                : null;

        ParsedNameCandidate candidate = parsedRepository.findByRawEntry(rawEntry)
                .orElseGet(ParsedNameCandidate::new);

        candidate.setRawEntry(rawEntry);
        candidate.setNormalizedName(normalized.normalizedName());
        candidate.setDisplayName(normalized.displayName());
        candidate.setCanonicalNameId(canonicalNameId);
        candidate.setCanonicalNormalizedName(canonicalNormalizedName);
        candidate.setAliasMatchLevel(aliasResolution.matchLevel());
        candidate.setGender(normalized.gender());
        candidate.setMeaningShort(normalized.meaningShort());
        candidate.setMeaningLong(normalized.meaningLong());
        candidate.setOrigin(normalized.origin());
        candidate.setCharacterTraitsText(normalized.characterTraitsText());
        candidate.setLetterAnalysisText(normalized.letterAnalysisText());
        candidate.setQuranFlag(normalized.quranFlag());
        candidate.setSourceConfidence(normalized.sourceConfidence());
        candidate.setMismatchFlag(normalized.mismatchFlag());
        candidate.setDuplicateContentFlag(normalized.duplicateContentFlag());
        candidate.setContentQuality(normalized.contentQuality() == null ? ContentQuality.LOW : normalized.contentQuality());

        candidate = parsedRepository.save(candidate);

        if (duplicateFlag) {
            duplicateContentRuleService.applyDuplicatePenalty(duplicates);
            parsedRepository.saveAll(duplicates);
        }

        rawEntry.setParseStatus(ParseStatus.PARSED);
        rawRepository.save(rawEntry);

        NameMergeService.MergeRefreshResult mergeResult = mergeService.refreshQueue(candidate.getCanonicalNormalizedName());
        return ParseOutcome.success(
                mergeResult.queuedForReview(),
                mergeResult.conflictCount(),
                candidate.isMismatchFlag(),
                candidate.isDuplicateContentFlag(),
                candidate.getContentQuality() == ContentQuality.LOW,
                aliasResolution.matchLevel().canAutoGroup(),
                candidate.getOrigin() != null && !candidate.getOrigin().isBlank(),
                candidate.getMeaningShort() != null && !candidate.getMeaningShort().isBlank(),
                candidate.getMeaningLong() != null && !candidate.getMeaningLong().isBlank()
        );
    }

    private RawNameSourceEntry upsertRaw(RawFetchPayload payload) {
        Optional<RawNameSourceEntry> existing = rawRepository.findBySourceNameAndSourceUrlAndChecksum(
                payload.sourceName(),
                payload.sourceUrl(),
                payload.checksum()
        );

        if (existing.isPresent()) {
            RawNameSourceEntry entry = existing.get();
            entry.setExternalName(payload.externalName());
            entry.setRawTitle(payload.rawTitle());
            entry.setRawHtml(payload.rawHtml());
            entry.setRawText(payload.rawText());
            entry.setFetchedAt(payload.fetchedAt());
            entry.setHttpStatus(payload.httpStatus());
            if (entry.getParseStatus() != ParseStatus.PARSED || payload.parseStatus() == ParseStatus.FETCH_FAILED) {
                entry.setParseStatus(payload.parseStatus());
            }
            return rawRepository.save(entry);
        }

        RawNameSourceEntry entry = RawNameSourceEntry.builder()
                .sourceName(payload.sourceName())
                .sourceUrl(payload.sourceUrl())
                .externalName(payload.externalName())
                .rawTitle(payload.rawTitle())
                .rawHtml(payload.rawHtml())
                .rawText(payload.rawText())
                .fetchedAt(payload.fetchedAt() == null ? LocalDateTime.now() : payload.fetchedAt())
                .httpStatus(payload.httpStatus())
                .parseStatus(payload.parseStatus())
                .checksum(payload.checksum())
                .build();
        return rawRepository.save(entry);
    }

    private int successRate(SourceRunSummary summary) {
        if (summary.discoveredCount() == 0) {
            return 0;
        }
        return (int) Math.round((summary.parsedSuccessCount() * 100.0) / summary.discoveredCount());
    }

    private SourceRunSummary emptySummary(SourceName sourceName) {
        Instant now = Instant.now();
        return new SourceRunSummary(sourceName, 0, 0, 0, 0, 0, 0, 0, now, now);
    }

    private String defaultErrorSummary(String currentErrorSummary, IngestionRunStatus runStatus) {
        if (currentErrorSummary != null && !currentErrorSummary.isBlank()) {
            return currentErrorSummary;
        }
        if (runStatus == IngestionRunStatus.FAILED) {
            return "run failed";
        }
        return "run completed";
    }

    private record RunExecutionResult(
            SourceRunSummary summary,
            boolean accepted,
            ManualRunRejectionReason rejectionReason,
            String message,
            String lockOwnerInstanceId,
            Long runningJobRunId,
            IngestionJobLockStatus lockStatus,
            boolean staleLock
    ) {
        static RunExecutionResult accepted(SourceRunSummary summary) {
            return new RunExecutionResult(
                    summary,
                    true,
                    ManualRunRejectionReason.NONE,
                    "run completed",
                    null,
                    null,
                    null,
                    false
            );
        }

        static RunExecutionResult rejected(
                SourceRunSummary summary,
                ManualRunRejectionReason rejectionReason,
                String message
        ) {
            return rejected(summary, rejectionReason, message, null, null, null, false);
        }

        static RunExecutionResult rejected(
                SourceRunSummary summary,
                ManualRunRejectionReason rejectionReason,
                String message,
                String lockOwnerInstanceId,
                Long runningJobRunId,
                IngestionJobLockStatus lockStatus,
                boolean staleLock
        ) {
            return new RunExecutionResult(
                    summary,
                    false,
                    rejectionReason == null ? ManualRunRejectionReason.LOCK_ERROR : rejectionReason,
                    message,
                    lockOwnerInstanceId,
                    runningJobRunId,
                    lockStatus,
                    staleLock
            );
        }

        ManualRunTriggerResponseDto toManualResponse(SourceName sourceName) {
            String finalMessage = message == null || message.isBlank()
                    ? rejectionReason.name().toLowerCase(Locale.ROOT)
                    : message;
            return new ManualRunTriggerResponseDto(
                    sourceName,
                    accepted,
                    rejectionReason,
                    finalMessage,
                    summary,
                    lockOwnerInstanceId,
                    runningJobRunId,
                    lockStatus,
                    staleLock
            );
        }
    }

    private static class RunCounters {
        int discoveredCount;
        int fetchedCount;
        int fetchFailedCount;
        int parsedSuccessCount;
        int parsedFailedCount;
        int conflictCount;
        int mismatchCount;
        int duplicateCount;
        int lowQualityCount;
        int canonicalResolvedCount;
        int originFilledCount;
        int meaningShortFilledCount;
        int meaningLongFilledCount;
        int reviewQueuedCount;

        NameIngestionRunService.RunAggregate toAggregate() {
            return new NameIngestionRunService.RunAggregate(
                    discoveredCount,
                    fetchedCount,
                    parsedSuccessCount,
                    parsedFailedCount,
                    conflictCount,
                    mismatchCount,
                    duplicateCount,
                    lowQualityCount,
                    canonicalResolvedCount,
                    originFilledCount,
                    meaningShortFilledCount,
                    meaningLongFilledCount
            );
        }
    }

    private record ParseOutcome(
            boolean success,
            boolean reviewQueued,
            int conflictCount,
            boolean mismatchFlag,
            boolean duplicateFlag,
            boolean lowQualityFlag,
            boolean canonicalResolved,
            boolean originFilled,
            boolean meaningShortFilled,
            boolean meaningLongFilled
    ) {

        static ParseOutcome success(
                boolean reviewQueued,
                int conflictCount,
                boolean mismatchFlag,
                boolean duplicateFlag,
                boolean lowQualityFlag,
                boolean canonicalResolved,
                boolean originFilled,
                boolean meaningShortFilled,
                boolean meaningLongFilled
        ) {
            return new ParseOutcome(
                    true,
                    reviewQueued,
                    conflictCount,
                    mismatchFlag,
                    duplicateFlag,
                    lowQualityFlag,
                    canonicalResolved,
                    originFilled,
                    meaningShortFilled,
                    meaningLongFilled
            );
        }

        static ParseOutcome failed() {
            return new ParseOutcome(false, false, 0, false, false, false, false, false, false, false);
        }
    }
}
