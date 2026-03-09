package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRecomputeResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRunDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagTaxonomyDto;
import com.mysticai.numerology.ingestion.entity.NameEnrichmentRun;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.model.NameEnrichmentRunStatus;
import com.mysticai.numerology.ingestion.model.NameEnrichmentTriggerType;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEnrichmentRunRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameTagRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NameEnrichmentService {

    private static final String ENRICHMENT_VERSION = "deterministic-v1";
    private static final Set<NameStatus> ENRICHABLE_STATUSES = EnumSet.of(NameStatus.ACTIVE, NameStatus.HIDDEN);
    private static final int MAX_PAGE_SIZE = 200;
    private static final int BATCH_FETCH_SIZE = 200;
    private static final int MAX_ERROR_SUMMARY_LENGTH = 3000;
    private static final int MAX_EVIDENCE_LENGTH = 500;

    private final NameEntityRepository nameRepository;
    private final NameTagRepository tagRepository;
    private final NameAliasRepository aliasRepository;
    private final ParsedNameCandidateRepository parsedRepository;
    private final NameEnrichmentRunRepository runRepository;
    private final NameTagTaxonomyService taxonomyService;
    private final NameEnrichmentRuleEngine ruleEngine;
    private final PlatformTransactionManager transactionManager;

    public Page<NameEnrichmentRunDto> listRuns(int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, Math.min(size, MAX_PAGE_SIZE)),
                Sort.by(Sort.Direction.DESC, "startedAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        Page<NameEnrichmentRun> runs = runRepository.findAllByOrderByStartedAtDesc(pageable);
        return runs.map(this::toRunDto);
    }

    public NameEnrichmentRunDto runBatch(String triggeredBy) {
        NameEnrichmentRun run = startRun(NameEnrichmentTriggerType.BATCH, triggeredBy);

        int processed = 0;
        int updated = 0;
        int skipped = 0;
        int lowConfidence = 0;
        int errorCount = 0;
        StringBuilder errorSummary = new StringBuilder();

        Pageable pageable = PageRequest.of(0, BATCH_FETCH_SIZE, Sort.by(Sort.Direction.ASC, "id"));
        Page<NameEntity> page;

        do {
            page = nameRepository.findByStatusIn(ENRICHABLE_STATUSES, pageable);
            for (NameEntity entity : page.getContent()) {
                processed++;
                try {
                    RecomputeResult result = recomputeForEntityTransactional(entity.getId());
                    if (result.updated()) {
                        updated++;
                    } else {
                        skipped++;
                    }
                    lowConfidence += result.lowConfidenceCount();
                } catch (Exception ex) {
                    errorCount++;
                    appendError(errorSummary, "nameId=" + entity.getId() + " error=" + ex.getMessage());
                    log.warn("name enrichment failed nameId={} error={}", entity.getId(), ex.getMessage());
                }
            }
            pageable = page.nextPageable();
        } while (page.hasNext());

        NameEnrichmentRunStatus status = resolveRunStatus(processed, errorCount);
        NameEnrichmentRun finished = finishRun(run, status, processed, updated, skipped, lowConfidence, errorCount, trimSummary(errorSummary));
        return toRunDto(finished);
    }

    public NameEnrichmentRecomputeResponseDto recomputeSingleName(Long nameId, String triggeredBy) {
        NameEnrichmentRun run = startRun(NameEnrichmentTriggerType.MANUAL, triggeredBy);

        int processed = 0;
        int updated = 0;
        int skipped = 0;
        int lowConfidence = 0;
        int errorCount = 0;
        String errorSummary = null;
        RecomputeResult result = null;

        try {
            NameEntity entity = nameRepository.findById(nameId)
                    .orElseThrow(() -> new IllegalArgumentException("name not found: " + nameId));
            validateEnrichableStatus(entity);
            result = recomputeForEntityTransactional(nameId);
            processed = 1;
            if (result.updated()) {
                updated = 1;
            } else {
                skipped = 1;
            }
            lowConfidence = result.lowConfidenceCount();
        } catch (Exception ex) {
            processed = 1;
            errorCount = 1;
            errorSummary = ex.getMessage();
            log.warn("name enrichment recompute failed nameId={} error={}", nameId, ex.getMessage());
        }

        NameEnrichmentRunStatus status = resolveRunStatus(processed, errorCount);
        NameEnrichmentRun finished = finishRun(run, status, processed, updated, skipped, lowConfidence, errorCount, errorSummary);

        if (result == null) {
            throw new IllegalStateException(errorSummary == null ? "name enrichment failed" : errorSummary);
        }

        return new NameEnrichmentRecomputeResponseDto(
                nameId,
                result.updated(),
                result.insertedCount(),
                result.removedRuleCount(),
                result.lowConfidenceCount(),
                toRunDto(finished)
        );
    }

    public List<NameTagDto> listTags(Long nameId) {
        ensureNameExists(nameId);
        return tagRepository.findByNameIdOrderByTagGroupAscTagAsc(nameId)
                .stream()
                .map(this::toTagDto)
                .toList();
    }

    public NameTagTaxonomyDto taxonomy() {
        return taxonomyService.taxonomy();
    }

    private RecomputeResult recomputeForEntityTransactional(Long nameId) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        return tx.execute(status -> {
            NameEntity entity = nameRepository.findById(nameId)
                    .orElseThrow(() -> new IllegalArgumentException("name not found: " + nameId));
            validateEnrichableStatus(entity);
            return recomputeForEntity(entity);
        });
    }

    private RecomputeResult recomputeForEntity(NameEntity entity) {
        List<NameTag> existingTags = tagRepository.findByNameIdOrderByTagGroupAscTagAsc(entity.getId());
        long removedRuleCount = existingTags.stream().filter(tag -> tag.getSource() == NameTagSource.RULE).count();
        if (removedRuleCount > 0) {
            tagRepository.deleteByNameIdAndSource(entity.getId(), NameTagSource.RULE);
        }

        List<NameTag> preservedTags = existingTags.stream()
                .filter(tag -> tag.getSource() != NameTagSource.RULE)
                .toList();

        Map<NameTagGroup, Set<String>> existingByGroup = taxonomyService.emptyTagMap();
        for (NameTag tag : preservedTags) {
            if (tag.getTagGroup() == null) {
                continue;
            }
            existingByGroup.get(tag.getTagGroup()).add(tag.getNormalizedTag());
        }

        long aliasCount = aliasRepository.findByCanonicalNameIdOrderByAliasNameAsc(entity.getId()).size();
        long candidateCount = parsedRepository.countByCanonicalNameId(entity.getId());

        List<NameEnrichmentRuleEngine.TagRecommendation> recommendations = ruleEngine.recommend(entity, aliasCount, candidateCount);

        int inserted = 0;
        int lowConfidenceCount = 0;

        for (NameEnrichmentRuleEngine.TagRecommendation recommendation : recommendations) {
            NameTagGroup group = recommendation.group();
            String normalizedValue = taxonomyService.validateAndNormalize(group, recommendation.value());

            if (recommendation.confidence().compareTo(ruleEngine.lowConfidenceThreshold()) < 0) {
                lowConfidenceCount++;
                continue;
            }

            Set<String> currentValues = existingByGroup.get(group);
            if (currentValues.contains(normalizedValue)) {
                continue;
            }

            if (taxonomyService.isSingleChoice(group) && !currentValues.isEmpty()) {
                continue;
            }

            if (group == NameTagGroup.RELIGION && taxonomyService.isReligionConflict(currentValues, normalizedValue)) {
                continue;
            }

            if (currentValues.size() >= taxonomyService.maxTagsForGroup(group)) {
                continue;
            }

            if (tagRepository.existsByNameIdAndTagGroupAndNormalizedTag(entity.getId(), group, normalizedValue)) {
                continue;
            }

            NameTag tag = NameTag.builder()
                    .name(entity)
                    .tagGroup(group)
                    .tag(normalizedValue)
                    .normalizedTag(normalizedValue)
                    .source(NameTagSource.RULE)
                    .confidence(clampConfidence(recommendation.confidence()))
                    .evidence(clampEvidence(recommendation.evidence()))
                    .enrichmentVersion(1)
                    .build();

            tagRepository.save(tag);
            currentValues.add(normalizedValue);
            inserted++;
        }

        boolean updated = removedRuleCount > 0 || inserted > 0;
        return new RecomputeResult(updated, inserted, (int) removedRuleCount, lowConfidenceCount);
    }

    private void validateEnrichableStatus(NameEntity entity) {
        if (!ENRICHABLE_STATUSES.contains(entity.getStatus())) {
            throw new IllegalArgumentException("name is not enrichable for status: " + entity.getStatus());
        }
    }

    private void ensureNameExists(Long nameId) {
        if (!nameRepository.existsById(nameId)) {
            throw new IllegalArgumentException("name not found: " + nameId);
        }
    }

    private NameEnrichmentRun startRun(NameEnrichmentTriggerType triggerType, String triggeredBy) {
        NameEnrichmentRun run = NameEnrichmentRun.builder()
                .triggerType(triggerType)
                .status(NameEnrichmentRunStatus.RUNNING)
                .enrichmentVersion(ENRICHMENT_VERSION)
                .triggeredBy(triggeredBy)
                .startedAt(LocalDateTime.now())
                .build();
        return runRepository.save(run);
    }

    private NameEnrichmentRun finishRun(
            NameEnrichmentRun run,
            NameEnrichmentRunStatus status,
            int processed,
            int updated,
            int skipped,
            int lowConfidence,
            int errorCount,
            String errorSummary
    ) {
        run.setStatus(status);
        run.setProcessedCount(processed);
        run.setUpdatedCount(updated);
        run.setSkippedCount(skipped);
        run.setLowConfidenceCount(lowConfidence);
        run.setErrorCount(errorCount);
        run.setFinishedAt(LocalDateTime.now());
        run.setErrorSummary(errorSummary);
        return runRepository.save(run);
    }

    private NameEnrichmentRunStatus resolveRunStatus(int processed, int errorCount) {
        if (errorCount == 0) {
            return NameEnrichmentRunStatus.SUCCESS;
        }
        if (processed > errorCount) {
            return NameEnrichmentRunStatus.PARTIAL_SUCCESS;
        }
        return NameEnrichmentRunStatus.FAILED;
    }

    private void appendError(StringBuilder summary, String line) {
        if (summary.length() >= MAX_ERROR_SUMMARY_LENGTH) {
            return;
        }
        if (!summary.isEmpty()) {
            summary.append("; ");
        }
        summary.append(line);
    }

    private String trimSummary(CharSequence summary) {
        if (summary == null) {
            return null;
        }
        String value = summary.toString().trim();
        if (value.isBlank()) {
            return null;
        }
        if (value.length() <= MAX_ERROR_SUMMARY_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_ERROR_SUMMARY_LENGTH).trim();
    }

    private String clampEvidence(String evidence) {
        if (evidence == null) {
            return null;
        }
        String normalized = evidence.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() <= MAX_EVIDENCE_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, MAX_EVIDENCE_LENGTH).trim();
    }

    private BigDecimal clampConfidence(BigDecimal confidence) {
        BigDecimal safe = confidence == null ? BigDecimal.ONE : confidence;
        if (safe.compareTo(BigDecimal.valueOf(0.10)) < 0) {
            safe = BigDecimal.valueOf(0.10);
        }
        if (safe.compareTo(BigDecimal.ONE) > 0) {
            safe = BigDecimal.ONE;
        }
        return safe.setScale(3, RoundingMode.HALF_UP);
    }

    private NameTagDto toTagDto(NameTag tag) {
        return new NameTagDto(
                tag.getId(),
                tag.getName().getId(),
                tag.getTagGroup(),
                tag.getTag(),
                tag.getNormalizedTag(),
                tag.getSource(),
                tag.getConfidence(),
                tag.getEvidence(),
                tag.getEnrichmentVersion(),
                tag.getCreatedAt(),
                tag.getUpdatedAt()
        );
    }

    private NameEnrichmentRunDto toRunDto(NameEnrichmentRun run) {
        return new NameEnrichmentRunDto(
                run.getId(),
                run.getTriggerType(),
                run.getStatus(),
                run.getEnrichmentVersion(),
                run.getProcessedCount(),
                run.getUpdatedCount(),
                run.getSkippedCount(),
                run.getLowConfidenceCount(),
                run.getErrorCount(),
                run.getStartedAt(),
                run.getFinishedAt(),
                run.getErrorSummary(),
                run.getTriggeredBy(),
                run.getCreatedAt(),
                run.getUpdatedAt()
        );
    }

    private record RecomputeResult(
            boolean updated,
            int insertedCount,
            int removedRuleCount,
            int lowConfidenceCount
    ) {
    }
}
