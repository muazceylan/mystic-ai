package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.NameIngestionRunDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceHealthDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceHealthSummaryDto;
import com.mysticai.numerology.ingestion.entity.NameIngestionRun;
import com.mysticai.numerology.ingestion.model.IngestionAnomalyType;
import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.ReviewQueueActionType;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameIngestionRunRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeAuditLogRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeQueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NameIngestionRunService {

    private static final Set<MergeReviewStatus> ACTIVE_REVIEW_STATUSES = EnumSet.of(
            MergeReviewStatus.PENDING,
            MergeReviewStatus.IN_REVIEW
    );
    private static final Set<ReviewQueueActionType> APPROVED_ACTIONS = EnumSet.of(
            ReviewQueueActionType.APPROVE,
            ReviewQueueActionType.MERGE
    );
    private static final Set<IngestionRunStatus> SUCCESSFUL_RUN_STATUSES = EnumSet.of(
            IngestionRunStatus.SUCCESS,
            IngestionRunStatus.PARTIAL_SUCCESS
    );
    private static final int DEFAULT_HEALTH_WINDOW = 10;
    private static final int DEFAULT_DETAIL_RUNS = 20;

    private final NameIngestionRunRepository runRepository;
    private final NameMergeQueueRepository mergeQueueRepository;
    private final NameMergeAuditLogRepository auditLogRepository;
    private final NameSourceControlService sourceControlService;
    private final NameIngestionMetricsService metricsService;

    @Transactional
    public NameIngestionRun startRun(SourceName sourceName, IngestionTriggerType triggerType, String triggeredBy) {
        NameIngestionRun run = NameIngestionRun.builder()
                .sourceName(sourceName)
                .triggerType(triggerType == null ? IngestionTriggerType.MANUAL : triggerType)
                .status(IngestionRunStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .triggeredBy(cleanActor(triggeredBy))
                .build();
        return runRepository.save(run);
    }

    @Transactional
    public NameIngestionRun finishRun(
            Long runId,
            RunAggregate aggregate,
            IngestionRunStatus status,
            String errorSummary,
            LocalDateTime finishedAt
    ) {
        NameIngestionRun run = runRepository.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("ingestion run not found: " + runId));

        LocalDateTime finished = finishedAt == null ? LocalDateTime.now() : finishedAt;
        run.setStatus(status == null ? IngestionRunStatus.FAILED : status);
        run.setFinishedAt(finished);
        run.setDurationMs(Math.max(0L, java.time.Duration.between(run.getStartedAt(), finished).toMillis()));
        run.setDiscoveredCount(aggregate.discoveredCount());
        run.setFetchedCount(aggregate.fetchedCount());
        run.setParseSuccessCount(aggregate.parseSuccessCount());
        run.setParseFailureCount(aggregate.parseFailureCount());
        run.setConflictCount(aggregate.conflictCount());
        run.setMismatchCount(aggregate.mismatchCount());
        run.setDuplicateCount(aggregate.duplicateCount());
        run.setLowQualityCount(aggregate.lowQualityCount());
        run.setCanonicalResolvedCount(aggregate.canonicalResolvedCount());
        run.setOriginFilledCount(aggregate.originFilledCount());
        run.setMeaningShortFilledCount(aggregate.meaningShortFilledCount());
        run.setMeaningLongFilledCount(aggregate.meaningLongFilledCount());
        run.setErrorSummary(cleanError(errorSummary));

        int backlogSnapshot = currentBacklogCount(run.getSourceName());
        run.setReviewBacklogCountSnapshot(backlogSnapshot);

        int approvedWrites = countApprovedWrites(run.getSourceName(), run.getStartedAt(), finished);
        run.setApprovedWriteCount(approvedWrites);

        NameIngestionRun saved = runRepository.save(run);
        metricsService.recordRun(saved);
        return saved;
    }

    public Page<NameIngestionRunDto> listRuns(SourceName sourceName, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, Math.min(size, 200)),
                Sort.by(Sort.Direction.DESC, "startedAt")
        );

        Page<NameIngestionRun> runPage = sourceName == null
                ? runRepository.findAllByOrderByStartedAtDesc(pageable)
                : runRepository.findBySourceNameOrderByStartedAtDesc(sourceName, pageable);

        List<NameIngestionRunDto> content = runPage.getContent().stream()
                .map(this::toDto)
                .toList();
        return new PageImpl<>(content, pageable, runPage.getTotalElements());
    }

    public NameIngestionRunDto getRun(Long id) {
        NameIngestionRun run = runRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ingestion run not found: " + id));
        return toDto(run);
    }

    public List<SourceHealthSummaryDto> listSourceHealthSummaries() {
        Map<SourceName, Boolean> enabledMap = sourceControlService.enabledStateSnapshot();
        List<SourceHealthSummaryDto> summaries = new ArrayList<>();
        for (SourceName sourceName : SourceName.values()) {
            summaries.add(buildSummary(sourceName, enabledMap.getOrDefault(sourceName, false), DEFAULT_HEALTH_WINDOW));
        }
        summaries.sort(Comparator.comparing(SourceHealthSummaryDto::sourceName));
        return summaries;
    }

    public SourceHealthDetailDto getSourceHealthDetail(SourceName sourceName) {
        boolean enabled = sourceControlService.isSourceEnabled(sourceName);
        SourceHealthSummaryDto summary = buildSummary(sourceName, enabled, DEFAULT_HEALTH_WINDOW);

        Page<NameIngestionRun> runPage = runRepository.findBySourceNameOrderByStartedAtDesc(
                sourceName,
                PageRequest.of(0, DEFAULT_DETAIL_RUNS)
        );
        List<NameIngestionRunDto> runs = runPage.getContent().stream().map(this::toDto).toList();
        return new SourceHealthDetailDto(summary, runs);
    }

    public int currentBacklogCount(SourceName sourceName) {
        return (int) mergeQueueRepository.countActiveBacklogForSource(sourceName, ACTIVE_REVIEW_STATUSES);
    }

    private int countApprovedWrites(SourceName sourceName, LocalDateTime startedAt, LocalDateTime finishedAt) {
        return (int) auditLogRepository.countBySelectedSourceAndActionTypeInAndCreatedAtBetween(
                sourceName,
                APPROVED_ACTIONS,
                startedAt,
                finishedAt
        );
    }

    private SourceHealthSummaryDto buildSummary(SourceName sourceName, boolean enabled, int recentWindow) {
        List<NameIngestionRun> recentRuns = runRepository.findTop20BySourceNameOrderByStartedAtDesc(sourceName)
                .stream()
                .limit(Math.max(1, recentWindow))
                .toList();

        Optional<NameIngestionRun> latest = recentRuns.stream().findFirst();
        Optional<NameIngestionRun> lastSuccess = runRepository
                .findTop1BySourceNameAndStatusInOrderByStartedAtDesc(sourceName, SUCCESSFUL_RUN_STATUSES);
        Optional<NameIngestionRun> lastFailure = runRepository
                .findTop1BySourceNameAndStatusOrderByStartedAtDesc(sourceName, IngestionRunStatus.FAILED);

        long totalFetched = recentRuns.stream().mapToLong(NameIngestionRun::getFetchedCount).sum();
        long totalSuccess = recentRuns.stream().mapToLong(NameIngestionRun::getParseSuccessCount).sum();
        long totalConflict = recentRuns.stream().mapToLong(NameIngestionRun::getConflictCount).sum();
        long totalMismatch = recentRuns.stream().mapToLong(NameIngestionRun::getMismatchCount).sum();
        long totalDuplicate = recentRuns.stream().mapToLong(NameIngestionRun::getDuplicateCount).sum();
        long totalLowQuality = recentRuns.stream().mapToLong(NameIngestionRun::getLowQualityCount).sum();
        long totalApprovedWrites = recentRuns.stream().mapToLong(NameIngestionRun::getApprovedWriteCount).sum();
        long totalCanonicalResolved = recentRuns.stream().mapToLong(NameIngestionRun::getCanonicalResolvedCount).sum();

        AnomalyAssessment anomaly = detectAnomalies(recentRuns);
        NameIngestionRun latestRun = latest.orElse(null);

        String lastErrorMessage = latestRun == null ? null : latestRun.getErrorSummary();
        if (lastErrorMessage == null || lastErrorMessage.isBlank()) {
            lastErrorMessage = recentRuns.stream()
                    .map(NameIngestionRun::getErrorSummary)
                    .filter(item -> item != null && !item.isBlank())
                    .findFirst()
                    .orElse(null);
        }

        return new SourceHealthSummaryDto(
                sourceName,
                enabled,
                latestRun == null ? null : latestRun.getStartedAt(),
                lastSuccess.map(NameIngestionRun::getStartedAt).orElse(null),
                lastFailure.map(NameIngestionRun::getStartedAt).orElse(null),
                lastErrorMessage,
                latestRun == null ? 0 : latestRun.getDiscoveredCount(),
                latestRun == null ? 0 : latestRun.getFetchedCount(),
                latestRun == null ? 0 : latestRun.getParseSuccessCount(),
                latestRun == null ? 0 : latestRun.getParseFailureCount(),
                rate(totalSuccess, totalFetched),
                totalConflict,
                totalMismatch,
                totalDuplicate,
                totalLowQuality,
                latestRun == null ? currentBacklogCount(sourceName) : latestRun.getReviewBacklogCountSnapshot(),
                totalApprovedWrites,
                totalCanonicalResolved,
                anomaly.hasAnomaly(),
                anomaly.types().stream().map(Enum::name).toList(),
                anomaly.reasonSummary(),
                recentRuns.size()
        );
    }

    private AnomalyAssessment detectAnomalies(List<NameIngestionRun> recentRuns) {
        if (recentRuns.size() < 4) {
            return AnomalyAssessment.none();
        }

        NameIngestionRun latest = recentRuns.getFirst();
        List<NameIngestionRun> baselineRuns = recentRuns.subList(1, Math.min(recentRuns.size(), 6));

        double latestParseFailureRatio = rate(latest.getParseFailureCount(), latest.getFetchedCount());
        double latestParseSuccessRate = rate(latest.getParseSuccessCount(), latest.getFetchedCount());
        double latestMismatchRatio = rate(latest.getMismatchCount(), latest.getParseSuccessCount());
        double latestDuplicateRatio = rate(latest.getDuplicateCount(), latest.getParseSuccessCount());
        double latestLowQualityRatio = rate(latest.getLowQualityCount(), latest.getParseSuccessCount());
        double latestFillRate = averageFillRate(latest);

        double baselineParseFailureRatio = baselineRuns.stream()
                .mapToDouble(item -> rate(item.getParseFailureCount(), item.getFetchedCount()))
                .average()
                .orElse(0.0);
        double baselineParseSuccessRate = baselineRuns.stream()
                .mapToDouble(item -> rate(item.getParseSuccessCount(), item.getFetchedCount()))
                .average()
                .orElse(0.0);
        double baselineMismatchRatio = baselineRuns.stream()
                .mapToDouble(item -> rate(item.getMismatchCount(), item.getParseSuccessCount()))
                .average()
                .orElse(0.0);
        double baselineDuplicateRatio = baselineRuns.stream()
                .mapToDouble(item -> rate(item.getDuplicateCount(), item.getParseSuccessCount()))
                .average()
                .orElse(0.0);
        double baselineLowQualityRatio = baselineRuns.stream()
                .mapToDouble(item -> rate(item.getLowQualityCount(), item.getParseSuccessCount()))
                .average()
                .orElse(0.0);
        double baselineFillRate = baselineRuns.stream()
                .mapToDouble(this::averageFillRate)
                .average()
                .orElse(0.0);

        double baselineDiscovered = baselineRuns.stream().mapToInt(NameIngestionRun::getDiscoveredCount).average().orElse(0.0);
        double baselineFetched = baselineRuns.stream().mapToInt(NameIngestionRun::getFetchedCount).average().orElse(0.0);

        List<IngestionAnomalyType> anomalies = new ArrayList<>();
        List<String> reasons = new ArrayList<>();

        if (latestParseFailureRatio >= Math.max(0.25, baselineParseFailureRatio * 1.8)
                && latest.getParseFailureCount() >= 3) {
            anomalies.add(IngestionAnomalyType.PARSE_FAILURE_SPIKE);
            reasons.add("parse failure ratio increased");
        }
        if (baselineParseSuccessRate >= 0.65 && latestParseSuccessRate + 0.20 < baselineParseSuccessRate) {
            anomalies.add(IngestionAnomalyType.PARSE_SUCCESS_RATE_DROP);
            reasons.add("parse success rate dropped");
        }
        if (latestMismatchRatio >= Math.max(0.20, baselineMismatchRatio * 1.8)) {
            anomalies.add(IngestionAnomalyType.MISMATCH_RATIO_SPIKE);
            reasons.add("mismatch ratio spiked");
        }
        if (latestDuplicateRatio >= Math.max(0.20, baselineDuplicateRatio * 1.8)) {
            anomalies.add(IngestionAnomalyType.DUPLICATE_RATIO_SPIKE);
            reasons.add("duplicate ratio spiked");
        }
        if (latestLowQualityRatio >= Math.max(0.25, baselineLowQualityRatio * 1.8)) {
            anomalies.add(IngestionAnomalyType.LOW_QUALITY_RATIO_SPIKE);
            reasons.add("low-quality ratio spiked");
        }
        if (baselineDiscovered >= 20 && latest.getDiscoveredCount() < baselineDiscovered * 0.5) {
            anomalies.add(IngestionAnomalyType.DISCOVERY_DROP);
            reasons.add("discovery count dropped");
        }
        if (baselineFetched >= 20 && latest.getFetchedCount() < baselineFetched * 0.5) {
            anomalies.add(IngestionAnomalyType.FETCH_DROP);
            reasons.add("fetched count dropped");
        }
        if (baselineFillRate >= 0.6 && latestFillRate + 0.20 < baselineFillRate) {
            anomalies.add(IngestionAnomalyType.FILL_RATE_DROP);
            reasons.add("origin/meaning fill ratio dropped");
        }

        if (anomalies.isEmpty()) {
            return AnomalyAssessment.none();
        }
        String reasonSummary = String.join("; ", reasons);
        return new AnomalyAssessment(true, anomalies, reasonSummary);
    }

    private double averageFillRate(NameIngestionRun run) {
        double originRate = rate(run.getOriginFilledCount(), run.getParseSuccessCount());
        double meaningRate = rate(run.getMeaningLongFilledCount(), run.getParseSuccessCount());
        return (originRate + meaningRate) / 2.0;
    }

    private NameIngestionRunDto toDto(NameIngestionRun run) {
        return new NameIngestionRunDto(
                run.getId(),
                run.getSourceName(),
                run.getTriggerType(),
                run.getStatus(),
                run.getStartedAt(),
                run.getFinishedAt(),
                run.getDurationMs(),
                run.getDiscoveredCount(),
                run.getFetchedCount(),
                run.getParseSuccessCount(),
                run.getParseFailureCount(),
                run.getConflictCount(),
                run.getMismatchCount(),
                run.getDuplicateCount(),
                run.getLowQualityCount(),
                run.getReviewBacklogCountSnapshot(),
                run.getApprovedWriteCount(),
                run.getCanonicalResolvedCount(),
                run.getOriginFilledCount(),
                run.getMeaningShortFilledCount(),
                run.getMeaningLongFilledCount(),
                rate(run.getParseSuccessCount(), run.getFetchedCount()),
                run.getErrorSummary(),
                run.getTriggeredBy()
        );
    }

    private double rate(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0.0;
        }
        return BigDecimal.valueOf((double) numerator / (double) denominator)
                .setScale(4, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String cleanActor(String actor) {
        if (actor == null) {
            return null;
        }
        String trimmed = actor.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String cleanError(String error) {
        if (error == null) {
            return null;
        }
        String normalized = error.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() <= 2000) {
            return normalized;
        }
        return normalized.substring(0, 2000);
    }

    public record RunAggregate(
            int discoveredCount,
            int fetchedCount,
            int parseSuccessCount,
            int parseFailureCount,
            int conflictCount,
            int mismatchCount,
            int duplicateCount,
            int lowQualityCount,
            int canonicalResolvedCount,
            int originFilledCount,
            int meaningShortFilledCount,
            int meaningLongFilledCount
    ) {
    }

    private record AnomalyAssessment(
            boolean hasAnomaly,
            List<IngestionAnomalyType> types,
            String reasonSummary
    ) {
        static AnomalyAssessment none() {
            return new AnomalyAssessment(false, List.of(), null);
        }
    }
}
