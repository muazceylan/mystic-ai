package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.ingestion.dto.admin.MergeDecisionRequest;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalBackfillResponse;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalResolutionDto;
import com.mysticai.numerology.ingestion.dto.admin.ManualRunTriggerResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionRunDto;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionJobLockDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueBatchActionRequest;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueBatchActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueFilter;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueGroupDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueMergeRequest;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueNoteRequest;
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
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.service.NameIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/admin/name-sources")
@RequiredArgsConstructor
public class NameSourceAdminController {

    private final NameIngestionService ingestionService;

    @GetMapping("/raw")
    public ResponseEntity<Page<RawNameSourceEntry>> listRaw(
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        SourceName sourceName = SourceName.fromNullable(source);
        return ResponseEntity.ok(ingestionService.listRaw(sourceName, page, size));
    }

    @GetMapping("/parsed")
    public ResponseEntity<Page<ParsedNameCandidate>> listParsed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ingestionService.listParsed(page, size));
    }

    @GetMapping("/merge-queue")
    public ResponseEntity<Page<NameMergeQueue>> listMergeQueueRaw(
            @RequestParam(required = false) String reviewStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        MergeReviewStatus status = reviewStatus == null || reviewStatus.isBlank()
                ? null
                : MergeReviewStatus.valueOf(reviewStatus.trim().toUpperCase());
        return ResponseEntity.ok(ingestionService.listMergeQueue(status, page, size));
    }

    @GetMapping("/health")
    public ResponseEntity<List<SourceHealthSummaryDto>> listSourceHealth() {
        return ResponseEntity.ok(ingestionService.listSourceHealth());
    }

    @GetMapping("/health/{sourceName}")
    public ResponseEntity<SourceHealthDetailDto> getSourceHealth(@PathVariable String sourceName) {
        SourceName parsed = SourceName.fromNullable(sourceName);
        return ResponseEntity.ok(ingestionService.getSourceHealthDetail(parsed));
    }

    @GetMapping("/runs")
    public ResponseEntity<Page<NameIngestionRunDto>> listRuns(
            @RequestParam(required = false) String sourceName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        SourceName parsed = SourceName.fromNullable(sourceName);
        return ResponseEntity.ok(ingestionService.listIngestionRuns(parsed, page, size));
    }

    @GetMapping("/runs/{id}")
    public ResponseEntity<NameIngestionRunDto> getRun(@PathVariable Long id) {
        return ResponseEntity.ok(ingestionService.getIngestionRun(id));
    }

    @PostMapping("/{sourceName}/enable")
    public ResponseEntity<SourceToggleResponseDto> enableSource(
            @PathVariable String sourceName,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName parsed = SourceName.fromNullable(sourceName);
        return ResponseEntity.ok(ingestionService.enableSource(parsed, actedBy));
    }

    @PostMapping("/{sourceName}/disable")
    public ResponseEntity<SourceToggleResponseDto> disableSource(
            @PathVariable String sourceName,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName parsed = SourceName.fromNullable(sourceName);
        return ResponseEntity.ok(ingestionService.disableSource(parsed, actedBy));
    }

    @GetMapping("/jobs/running")
    public ResponseEntity<List<RunningIngestionJobDto>> listRunningJobs() {
        return ResponseEntity.ok(ingestionService.listRunningJobs());
    }

    @GetMapping("/jobs/locks")
    public ResponseEntity<List<NameIngestionJobLockDto>> listJobLocks() {
        return ResponseEntity.ok(ingestionService.listJobLocks());
    }

    @GetMapping("/jobs/locks/{sourceName}")
    public ResponseEntity<NameIngestionJobLockDto> getJobLock(@PathVariable String sourceName) {
        SourceName parsed = SourceName.fromNullable(sourceName);
        return ResponseEntity.ok(ingestionService.getJobLock(parsed));
    }

    @PostMapping("/jobs/recover-stale/{sourceName}")
    public ResponseEntity<StaleLockRecoveryResponseDto> recoverStale(
            @PathVariable String sourceName,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName parsed = SourceName.fromNullable(sourceName);
        StaleLockRecoveryResponseDto response = ingestionService.recoverStaleLock(parsed, actedBy);
        if (response.recovered()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @GetMapping("/merge-queue/grouped")
    public ResponseEntity<Page<ReviewQueueGroupDto>> listMergeQueueGrouped(
            @RequestParam(required = false) String sourceName,
            @RequestParam(required = false) String reviewStatus,
            @RequestParam(required = false) Boolean mismatchFlag,
            @RequestParam(required = false) Boolean duplicateContentFlag,
            @RequestParam(required = false) String contentQuality,
            @RequestParam(required = false) String canonicalName,
            @RequestParam(required = false) Boolean conflict,
            @RequestParam(defaultValue = "false") boolean includeResolved,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        ReviewQueueFilter filter = new ReviewQueueFilter(
                SourceName.fromNullable(sourceName),
                parseReviewStatuses(reviewStatus),
                mismatchFlag,
                duplicateContentFlag,
                contentQuality == null || contentQuality.isBlank() ? null : ContentQuality.valueOf(contentQuality.trim().toUpperCase()),
                canonicalName,
                conflict,
                includeResolved
        );

        return ResponseEntity.ok(ingestionService.listGroupedMergeQueue(filter, page, size));
    }

    @PostMapping("/merge-queue/{id}/approve")
    public ResponseEntity<ReviewQueueActionResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) MergeDecisionRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName source = request == null ? null : SourceName.fromNullable(request.chosenSource());
        String note = request == null ? null : request.reviewNote();
        return ResponseEntity.ok(ingestionService.approveMergeQueue(id, source, note, actedBy));
    }

    @PostMapping("/merge-queue/{id}/reject")
    public ResponseEntity<ReviewQueueActionResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) MergeDecisionRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        String note = request == null ? null : request.reviewNote();
        return ResponseEntity.ok(ingestionService.rejectMergeQueue(id, note, actedBy));
    }

    @PostMapping("/merge-queue/{id}/skip")
    public ResponseEntity<ReviewQueueActionResponse> skip(
            @PathVariable Long id,
            @RequestBody(required = false) MergeDecisionRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        String note = request == null ? null : request.reviewNote();
        return ResponseEntity.ok(ingestionService.skipMergeQueue(id, note, actedBy));
    }

    @PostMapping("/merge-queue/{id}/merge")
    public ResponseEntity<ReviewQueueActionResponse> merge(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewQueueMergeRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName source = request == null ? null : SourceName.fromNullable(request.chosenSource());
        Long fallbackCandidateId = request == null ? null : request.fallbackCandidateId();
        Map<String, Long> fieldSelections = request == null ? null : request.selectedFieldCandidateIds();
        String note = request == null ? null : request.reviewNote();

        return ResponseEntity.ok(ingestionService.mergeQueue(
                id,
                source,
                request == null ? null : request.canonicalNameId(),
                request == null ? null : request.canonicalNameOverride(),
                fallbackCandidateId,
                fieldSelections,
                note,
                actedBy
        ));
    }

    @PostMapping("/merge-queue/{id}/note")
    public ResponseEntity<ReviewQueueActionResponse> updateNote(
            @PathVariable Long id,
            @RequestBody ReviewQueueNoteRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        return ResponseEntity.ok(ingestionService.updateMergeQueueNote(id, request.reviewNote(), actedBy));
    }

    @PostMapping("/merge-queue/bulk/approve")
    public ResponseEntity<ReviewQueueBatchActionResponse> bulkApprove(
            @RequestBody ReviewQueueBatchActionRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName source = request == null ? null : SourceName.fromNullable(request.chosenSource());
        String note = request == null ? null : request.reviewNote();
        List<Long> queueIds = request == null ? List.of() : request.queueIds();
        return ResponseEntity.ok(ingestionService.bulkApprove(queueIds, source, note, actedBy));
    }

    @PostMapping("/merge-queue/bulk/reject")
    public ResponseEntity<ReviewQueueBatchActionResponse> bulkReject(
            @RequestBody ReviewQueueBatchActionRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        String note = request == null ? null : request.reviewNote();
        List<Long> queueIds = request == null ? List.of() : request.queueIds();
        return ResponseEntity.ok(ingestionService.bulkReject(queueIds, note, actedBy));
    }

    @PostMapping("/merge-queue/auto-merge")
    public ResponseEntity<ReviewQueueBatchActionResponse> autoMergeEligible(
            @RequestBody(required = false) ReviewQueueBatchActionRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        String note = request == null ? null : request.reviewNote();
        List<Long> queueIds = request == null ? List.of() : request.queueIds();
        return ResponseEntity.ok(ingestionService.autoMergeEligibleQueues(queueIds, note, actedBy));
    }

    @GetMapping("/canonical/{canonicalId}")
    public ResponseEntity<CanonicalNameDetailDto> getCanonicalDetail(@PathVariable Long canonicalId) {
        return ResponseEntity.ok(ingestionService.getCanonicalDetail(canonicalId));
    }

    @GetMapping("/canonical/{canonicalId}/aliases")
    public ResponseEntity<Page<NameAliasDto>> listAliases(
            @PathVariable Long canonicalId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ingestionService.listAliases(canonicalId, page, size));
    }

    @PostMapping("/canonical/{canonicalId}/aliases")
    public ResponseEntity<NameAliasDto> addManualAlias(
            @PathVariable Long canonicalId,
            @RequestBody NameAliasCreateRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException("alias request cannot be null");
        }
        AliasType aliasType = request.aliasType() == null || request.aliasType().isBlank()
                ? AliasType.RELATED_FORM
                : AliasType.valueOf(request.aliasType().trim().toUpperCase());
        NameAliasDto alias = ingestionService.addManualAlias(canonicalId, request.aliasName(), aliasType, request.confidence());
        return ResponseEntity.ok(alias);
    }

    @DeleteMapping("/aliases/{aliasId}")
    public ResponseEntity<Map<String, Object>> removeAlias(@PathVariable Long aliasId) {
        ingestionService.removeAlias(aliasId);
        Map<String, Object> payload = new HashMap<>();
        payload.put("aliasId", aliasId);
        payload.put("removed", true);
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/canonical/resolve")
    public ResponseEntity<CanonicalResolutionDto> resolveCanonical(@RequestParam String name) {
        return ResponseEntity.ok(ingestionService.resolveCanonical(name));
    }

    @PostMapping("/canonical/backfill")
    public ResponseEntity<CanonicalBackfillResponse> backfillCanonicalData() {
        return ResponseEntity.ok(ingestionService.backfillCanonicalData());
    }

    @PostMapping("/run")
    public ResponseEntity<?> run(
            @RequestParam(required = false) String source,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        SourceName sourceName = SourceName.fromNullable(source);
        if (sourceName == null) {
            List<ManualRunTriggerResponseDto> responses = ingestionService.triggerEnabledSourcesManual(actedBy);
            return ResponseEntity.ok(responses);
        }

        ManualRunTriggerResponseDto response = ingestionService.triggerManualRun(sourceName, actedBy);
        if (response.accepted()) {
            return ResponseEntity.ok(response);
        }

        HttpStatus status = switch (response.rejectionReason()) {
            case SOURCE_DISABLED, ALREADY_RUNNING -> HttpStatus.CONFLICT;
            case LOCK_STALE -> HttpStatus.LOCKED;
            case LOCK_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR;
            case NONE -> HttpStatus.OK;
        };
        if (response.rejectionReason() == ManualRunRejectionReason.NONE) {
            status = HttpStatus.OK;
        }
        return ResponseEntity.status(status).body(response);
    }

    @PostMapping("/reparse/{rawId}")
    public ResponseEntity<Map<String, Object>> reparse(@PathVariable Long rawId) {
        ParsedNameCandidate candidate = ingestionService.reparseRaw(rawId);
        Map<String, Object> payload = new HashMap<>();
        payload.put("rawId", rawId);
        payload.put("candidateId", candidate.getId());
        payload.put("normalizedName", candidate.getNormalizedName());
        payload.put("source", candidate.getRawEntry().getSourceName());
        return ResponseEntity.ok(payload);
    }

    private Set<MergeReviewStatus> parseReviewStatuses(String rawReviewStatus) {
        if (rawReviewStatus == null || rawReviewStatus.isBlank()) {
            return Set.of();
        }

        Set<MergeReviewStatus> statuses = new LinkedHashSet<>();
        for (String token : rawReviewStatus.split(",")) {
            if (token == null || token.isBlank()) {
                continue;
            }
            statuses.add(MergeReviewStatus.valueOf(token.trim().toUpperCase()));
        }
        return statuses;
    }
}
