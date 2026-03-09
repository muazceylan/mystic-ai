package com.mysticai.numerology.ingestion.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueCandidateDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueConflictFieldDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueConflictValueDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueFilter;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueGroupDto;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameMergeAuditLog;
import com.mysticai.numerology.ingestion.entity.NameMergeQueue;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.MergeRecommendationStatus;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.ReviewQueueActionType;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeAuditLogRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeQueueRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NameMergeService {

    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_NORMALIZED_NAME_LENGTH = 255;
    private static final int MAX_ORIGIN_LENGTH = 255;

    private static final Set<String> MANUAL_FIELD_KEYS = Set.of(
            "name",
            "display_name",
            "gender",
            "meaning_short",
            "meaning_long",
            "origin",
            "character_traits_text",
            "letter_analysis_text",
            "quran_flag"
    );

    private static final Set<MergeReviewStatus> DEFAULT_ACTIVE_STATUSES = Set.of(
            MergeReviewStatus.PENDING,
            MergeReviewStatus.IN_REVIEW
    );

    private static final Set<String> HIGH_RISK_CONFLICT_FIELDS = Set.of("gender", "origin", "quran_flag");
    private static final BigDecimal AUTO_MERGE_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.84);
    private static final BigDecimal SUGGEST_MERGE_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.66);

    private final ParsedNameCandidateRepository parsedRepository;
    private final NameMergeQueueRepository mergeQueueRepository;
    private final NameEntityRepository nameEntityRepository;
    private final NameMergeAuditLogRepository auditLogRepository;
    private final NameAliasService aliasService;
    private final ObjectMapper objectMapper;

    @Transactional
    public MergeRefreshResult refreshQueue(String canonicalNormalizedName) {
        List<ParsedNameCandidate> candidates = parsedRepository.findByCanonicalNormalizedName(canonicalNormalizedName);
        if (candidates.isEmpty()) {
            mergeQueueRepository.findByCanonicalName(canonicalNormalizedName)
                    .filter(queue -> !queue.getReviewStatus().isTerminal())
                    .ifPresent(mergeQueueRepository::delete);
            return new MergeRefreshResult(false, 0);
        }

        List<Long> candidateIds = candidates.stream().map(ParsedNameCandidate::getId).sorted().toList();
        List<String> conflicts = detectConflicts(candidates);
        boolean hasConflict = !conflicts.isEmpty();
        SourceName chosenSource = chooseSource(candidates);
        MergeSelection recommendedSelection = buildAutomaticSelection(canonicalNormalizedName, candidates, chosenSource);
        MergeRecommendation recommendation = evaluateRecommendation(canonicalNormalizedName, candidates, conflicts, recommendedSelection);

        NameMergeQueue queue = mergeQueueRepository.findByCanonicalName(canonicalNormalizedName)
                .orElseGet(() -> NameMergeQueue.builder().canonicalName(canonicalNormalizedName).build());

        String candidateIdsJson = toJson(candidateIds);
        String conflictJson = toJson(conflicts);
        String recommendedFieldSourcesJson = toJson(recommendation.recommendedFieldSources());

        boolean payloadChanged = !Objects.equals(queue.getCandidateIds(), candidateIdsJson)
                || !Objects.equals(queue.getConflictingFields(), conflictJson)
                || !Objects.equals(queue.getChosenSource(), chosenSource)
                || queue.isHasConflict() != hasConflict
                || queue.getMergeRecommendationStatus() != recommendation.status()
                || !Objects.equals(queue.getRecommendedCanonicalNameId(), recommendation.recommendedCanonicalNameId())
                || !Objects.equals(queue.getRecommendedCanonicalName(), recommendation.recommendedCanonicalName())
                || !Objects.equals(queue.getRecommendedFieldSources(), recommendedFieldSourcesJson)
                || queue.isAutoMergeEligible() != recommendation.autoMergeEligible()
                || !Objects.equals(queue.getAutoMergeReasonSummary(), recommendation.reasonSummary())
                || compareMergeConfidence(queue.getMergeConfidence(), recommendation.mergeConfidence()) != 0;

        queue.setCandidateIds(candidateIdsJson);
        queue.setConflictingFields(conflictJson);
        queue.setHasConflict(hasConflict);
        queue.setChosenSource(chosenSource);
        queue.setMergeRecommendationStatus(recommendation.status());
        queue.setRecommendedCanonicalNameId(recommendation.recommendedCanonicalNameId());
        queue.setRecommendedCanonicalName(recommendation.recommendedCanonicalName());
        queue.setRecommendedFieldSources(recommendedFieldSourcesJson);
        queue.setAutoMergeEligible(recommendation.autoMergeEligible());
        queue.setAutoMergeReasonSummary(recommendation.reasonSummary());
        queue.setMergeConfidence(recommendation.mergeConfidence());

        if (queue.getReviewStatus() == null) {
            queue.setReviewStatus(MergeReviewStatus.PENDING);
        } else if (queue.getReviewStatus().isTerminal() && payloadChanged) {
            queue.setReviewStatus(MergeReviewStatus.PENDING);
            queue.setReviewNote(null);
        } else if (queue.getReviewStatus() == MergeReviewStatus.SKIPPED && payloadChanged) {
            queue.setReviewStatus(MergeReviewStatus.PENDING);
        }

        queue = mergeQueueRepository.save(queue);

        return new MergeRefreshResult(queue.getReviewStatus().isActiveQueue(), hasConflict ? 1 : 0);
    }

    public Page<NameMergeQueue> listRawQueue(MergeReviewStatus reviewStatus, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.max(1, Math.min(size, 200)), Sort.by(Sort.Direction.DESC, "updatedAt"));
        if (reviewStatus != null) {
            return mergeQueueRepository.findByReviewStatusOrderByUpdatedAtDesc(reviewStatus, pageable);
        }
        return mergeQueueRepository.findAllByOrderByUpdatedAtDesc(pageable);
    }

    public Page<ReviewQueueGroupDto> listGroupedQueue(ReviewQueueFilter filter, int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 200));
        Pageable pageable = PageRequest.of(Math.max(0, page), safeSize, Sort.by(Sort.Direction.DESC, "updatedAt"));

        Set<MergeReviewStatus> statuses = resolveStatuses(filter);
        Specification<NameMergeQueue> spec = buildReviewSpecification(filter, statuses);
        Page<NameMergeQueue> queuePage = mergeQueueRepository.findAll(spec, pageable);

        if (queuePage.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, queuePage.getTotalElements());
        }

        List<String> canonicalNames = queuePage.getContent().stream()
                .map(NameMergeQueue::getCanonicalName)
                .toList();

        Map<String, List<ParsedNameCandidate>> candidatesByCanonical = parsedRepository
                .findByCanonicalNormalizedNameInWithRawEntry(canonicalNames)
                .stream()
                .collect(Collectors.groupingBy(
                        ParsedNameCandidate::getCanonicalNormalizedName,
                        LinkedHashMap::new,
                        Collectors.collectingAndThen(Collectors.toList(), list -> list.stream()
                                .sorted(Comparator
                                        .comparing(ParsedNameCandidate::getSourceConfidence, Comparator.nullsLast(Comparator.naturalOrder()))
                                        .reversed()
                                        .thenComparing(ParsedNameCandidate::getId))
                                .toList())
                ));

        List<ReviewQueueGroupDto> grouped = queuePage.getContent().stream()
                .map(queue -> toGroupDto(queue, candidatesByCanonical.getOrDefault(queue.getCanonicalName(), List.of())))
                .toList();

        return new PageImpl<>(grouped, pageable, queuePage.getTotalElements());
    }

    @Transactional
    public ReviewQueueActionResponse approve(Long queueId, SourceName overrideSource, String reviewNote, String actedBy) {
        NameMergeQueue queue = findQueue(queueId);
        assertActionable(queue, ReviewQueueActionType.APPROVE);

        List<ParsedNameCandidate> candidates = loadCandidates(queue);
        SourceName preferredSource = overrideSource != null ? overrideSource : queue.getChosenSource();
        MergeSelection selection = buildAutomaticSelection(queue.getCanonicalName(), candidates, preferredSource);
        NameEntity saved = persistSelection(selection);
        aliasService.bindCandidatesToCanonical(candidates, saved);
        aliasService.syncCanonicalAliases(saved, candidates);

        MergeReviewStatus previous = queue.getReviewStatus();
        queue.setChosenSource(selection.selectedCandidate().getRawEntry().getSourceName());
        queue.setReviewStatus(MergeReviewStatus.APPROVED);
        queue.setReviewNote(cleanNote(reviewNote));
        mergeQueueRepository.save(queue);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mode", "automatic");
        payload.put("overrideSource", overrideSource == null ? null : overrideSource.name());
        payload.put("candidateIds", parseLongList(queue.getCandidateIds()));
        payload.put("conflictingFields", parseStringList(queue.getConflictingFields()));

        NameMergeAuditLog audit = saveAudit(queue, ReviewQueueActionType.APPROVE, previous, selection, payload, actedBy);
        return toActionResponse(queue, saved.getId(), audit, selection);
    }

    public ReviewQueueActionResponse approve(Long queueId, SourceName overrideSource, String reviewNote) {
        return approve(queueId, overrideSource, reviewNote, null);
    }

    @Transactional
    public ReviewQueueActionResponse reject(Long queueId, String reviewNote, String actedBy) {
        NameMergeQueue queue = findQueue(queueId);
        assertActionable(queue, ReviewQueueActionType.REJECT);

        MergeReviewStatus previous = queue.getReviewStatus();
        queue.setReviewStatus(MergeReviewStatus.REJECTED);
        queue.setReviewNote(cleanNote(reviewNote));
        mergeQueueRepository.save(queue);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateIds", parseLongList(queue.getCandidateIds()));
        payload.put("conflictingFields", parseStringList(queue.getConflictingFields()));

        NameMergeAuditLog audit = saveAudit(queue, ReviewQueueActionType.REJECT, previous, null, payload, actedBy);
        return toActionResponse(queue, null, audit, null);
    }

    public ReviewQueueActionResponse reject(Long queueId, String reviewNote) {
        return reject(queueId, reviewNote, null);
    }

    @Transactional
    public ReviewQueueActionResponse skip(Long queueId, String reviewNote, String actedBy) {
        NameMergeQueue queue = findQueue(queueId);
        if (queue.getReviewStatus().isTerminal()) {
            throw new IllegalStateException("queue is already finalized: " + queueId);
        }

        MergeReviewStatus previous = queue.getReviewStatus();
        queue.setReviewStatus(MergeReviewStatus.SKIPPED);
        queue.setReviewNote(cleanNote(reviewNote));
        mergeQueueRepository.save(queue);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateIds", parseLongList(queue.getCandidateIds()));
        payload.put("conflictingFields", parseStringList(queue.getConflictingFields()));

        NameMergeAuditLog audit = saveAudit(queue, ReviewQueueActionType.SKIP, previous, null, payload, actedBy);
        return toActionResponse(queue, null, audit, null);
    }

    @Transactional
    public ReviewQueueActionResponse merge(
            Long queueId,
            SourceName preferredSource,
            Long canonicalNameId,
            String canonicalNameOverride,
            Long fallbackCandidateId,
            Map<String, Long> selectedFieldCandidateIds,
            String reviewNote,
            String actedBy
    ) {
        NameMergeQueue queue = findQueue(queueId);
        assertActionable(queue, ReviewQueueActionType.MERGE);

        List<ParsedNameCandidate> candidates = loadCandidates(queue);
        NameEntity canonicalTarget = resolveCanonicalTarget(canonicalNameId, canonicalNameOverride);
        String targetCanonicalNormalizedName = canonicalTarget == null
                ? queue.getCanonicalName()
                : canonicalTarget.getNormalizedName();

        MergeSelection selection = buildManualSelection(
                targetCanonicalNormalizedName,
                candidates,
                preferredSource,
                fallbackCandidateId,
                selectedFieldCandidateIds
        );
        NameEntity saved = persistSelection(selection);
        aliasService.bindCandidatesToCanonical(candidates, saved);
        aliasService.syncCanonicalAliases(saved, candidates);

        MergeReviewStatus previous = queue.getReviewStatus();
        queue.setChosenSource(selection.selectedCandidate().getRawEntry().getSourceName());
        queue.setReviewStatus(MergeReviewStatus.MERGED);
        queue.setReviewNote(cleanNote(reviewNote));
        mergeQueueRepository.save(queue);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mode", "manual");
        payload.put("preferredSource", preferredSource == null ? null : preferredSource.name());
        payload.put("canonicalNameId", canonicalNameId);
        payload.put("canonicalNameOverride", canonicalNameOverride);
        payload.put("fallbackCandidateId", fallbackCandidateId);
        payload.put("selectedFieldCandidateIds", selectedFieldCandidateIds == null ? Map.of() : selectedFieldCandidateIds);

        NameMergeAuditLog audit = saveAudit(queue, ReviewQueueActionType.MERGE, previous, selection, payload, actedBy);

        if (!Objects.equals(queue.getCanonicalName(), saved.getNormalizedName())) {
            refreshQueue(queue.getCanonicalName());
        }
        return toActionResponse(queue, saved.getId(), audit, selection);
    }

    @Transactional(readOnly = true)
    public List<Long> listAutoMergeEligibleQueueIds(List<Long> requestedQueueIds) {
        List<NameMergeQueue> queues;
        if (requestedQueueIds == null || requestedQueueIds.isEmpty()) {
            queues = mergeQueueRepository.findByReviewStatusInAndAutoMergeEligibleTrueOrderByUpdatedAtAsc(DEFAULT_ACTIVE_STATUSES);
        } else {
            queues = mergeQueueRepository.findByIdInAndReviewStatusInAndAutoMergeEligibleTrueOrderByUpdatedAtAsc(
                    requestedQueueIds,
                    DEFAULT_ACTIVE_STATUSES
            );
        }
        return queues.stream().map(NameMergeQueue::getId).toList();
    }

    @Transactional
    public ReviewQueueActionResponse autoMerge(Long queueId, String reviewNote, String actedBy) {
        NameMergeQueue queue = findQueue(queueId);
        assertActionable(queue, ReviewQueueActionType.AUTO_MERGE);

        List<ParsedNameCandidate> candidates = loadCandidates(queue);
        List<String> conflicts = detectConflicts(candidates);
        MergeSelection selection = buildAutomaticSelection(queue.getCanonicalName(), candidates, queue.getChosenSource());
        MergeRecommendation recommendation = evaluateRecommendation(queue.getCanonicalName(), candidates, conflicts, selection);

        if (!recommendation.autoMergeEligible()) {
            throw new IllegalStateException("queue is not auto-merge eligible: " + queueId);
        }

        NameEntity saved = persistSelection(selection);
        aliasService.bindCandidatesToCanonical(candidates, saved);
        aliasService.syncCanonicalAliases(saved, candidates);

        MergeReviewStatus previous = queue.getReviewStatus();
        queue.setChosenSource(selection.selectedCandidate().getRawEntry().getSourceName());
        queue.setReviewStatus(MergeReviewStatus.MERGED);
        queue.setReviewNote(cleanNote(reviewNote));
        queue.setMergeRecommendationStatus(recommendation.status());
        queue.setRecommendedCanonicalNameId(recommendation.recommendedCanonicalNameId());
        queue.setRecommendedCanonicalName(recommendation.recommendedCanonicalName());
        queue.setRecommendedFieldSources(toJson(recommendation.recommendedFieldSources()));
        queue.setAutoMergeEligible(recommendation.autoMergeEligible());
        queue.setAutoMergeReasonSummary(recommendation.reasonSummary());
        queue.setMergeConfidence(recommendation.mergeConfidence());
        mergeQueueRepository.save(queue);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mode", "auto_merge");
        payload.put("candidateIds", parseLongList(queue.getCandidateIds()));
        payload.put("conflictingFields", conflicts);
        payload.put("mergeConfidence", recommendation.mergeConfidence());
        payload.put("reasonSummary", recommendation.reasonSummary());

        NameMergeAuditLog audit = saveAudit(queue, ReviewQueueActionType.AUTO_MERGE, previous, selection, payload, actedBy);
        return toActionResponse(queue, saved.getId(), audit, selection);
    }

    @Transactional
    public ReviewQueueActionResponse updateReviewNote(Long queueId, String reviewNote, String actedBy) {
        NameMergeQueue queue = findQueue(queueId);
        MergeReviewStatus previous = queue.getReviewStatus();

        queue.setReviewNote(cleanNote(reviewNote));
        if (queue.getReviewStatus() == MergeReviewStatus.PENDING) {
            queue.setReviewStatus(MergeReviewStatus.IN_REVIEW);
        }
        mergeQueueRepository.save(queue);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateIds", parseLongList(queue.getCandidateIds()));
        payload.put("conflictingFields", parseStringList(queue.getConflictingFields()));

        NameMergeAuditLog audit = saveAudit(queue, ReviewQueueActionType.NOTE, previous, null, payload, actedBy);
        return toActionResponse(queue, null, audit, null);
    }

    public record MergeRefreshResult(boolean queuedForReview, int conflictCount) {
    }

    public List<String> detectConflicts(List<ParsedNameCandidate> candidates) {
        Map<String, Set<String>> valueSetByField = new HashMap<>();
        register(valueSetByField, "gender", candidates.stream().map(candidate -> enumName(candidate.getGender())).toList());
        register(valueSetByField, "origin", candidates.stream().map(ParsedNameCandidate::getOrigin).toList());
        register(valueSetByField, "meaning_short", candidates.stream().map(ParsedNameCandidate::getMeaningShort).toList());
        register(valueSetByField, "meaning_long", candidates.stream().map(ParsedNameCandidate::getMeaningLong).toList());
        register(valueSetByField, "quran_flag", candidates.stream().map(candidate -> candidate.getQuranFlag() == null ? null : candidate.getQuranFlag().toString()).toList());

        List<String> conflicts = new ArrayList<>();
        for (Map.Entry<String, Set<String>> entry : valueSetByField.entrySet()) {
            if (entry.getValue().size() > 1) {
                conflicts.add(entry.getKey());
            }
        }
        conflicts.sort(String::compareTo);
        return conflicts;
    }

    private MergeRecommendation evaluateRecommendation(
            String canonicalNormalizedName,
            List<ParsedNameCandidate> candidates,
            List<String> conflicts,
            MergeSelection selection
    ) {
        List<String> reasons = new ArrayList<>();

        boolean hasStrongCanonicalMatch = candidates.stream()
                .anyMatch(candidate -> candidate.getAliasMatchLevel() != null && candidate.getAliasMatchLevel().canAutoGroup());
        boolean hasWeakAlias = candidates.stream()
                .anyMatch(candidate -> candidate.getAliasMatchLevel() == AliasMatchLevel.WEAK_ALIAS);
        boolean hasNoMatch = candidates.stream()
                .anyMatch(candidate -> candidate.getAliasMatchLevel() == null || candidate.getAliasMatchLevel() == AliasMatchLevel.NO_MATCH);

        boolean hasDuplicateOrMismatch = candidates.stream()
                .anyMatch(candidate -> candidate.isDuplicateContentFlag() || candidate.isMismatchFlag());

        boolean quranConflict = conflicts.contains("quran_flag");
        boolean quranConflictResolvedByUfuk = quranConflict && hasUfukQuranValue(candidates);
        boolean unresolvedHighRiskConflict = conflicts.stream()
                .filter(HIGH_RISK_CONFLICT_FIELDS::contains)
                .anyMatch(field -> !("quran_flag".equals(field) && quranConflictResolvedByUfuk));

        boolean compoundRisk = hasCompoundRisk(candidates);
        BigDecimal mergeConfidence = averageMergeConfidence(selection.fieldSelections());

        if (hasWeakAlias) {
            reasons.add("contains WEAK_ALIAS candidate");
        }
        if (hasNoMatch) {
            reasons.add("contains NO_MATCH candidate");
        }
        if (hasDuplicateOrMismatch) {
            reasons.add("contains mismatch/duplicate candidates");
        }
        if (unresolvedHighRiskConflict) {
            reasons.add("high-risk field conflict present");
        }
        if (compoundRisk) {
            reasons.add("compound name mismatch risk");
        }
        if (quranConflictResolvedByUfuk) {
            reasons.add("quran_flag conflict resolved by UFUK precedence");
        }
        if (mergeConfidence.compareTo(AUTO_MERGE_CONFIDENCE_THRESHOLD) >= 0) {
            reasons.add("merge confidence above auto threshold");
        } else if (mergeConfidence.compareTo(SUGGEST_MERGE_CONFIDENCE_THRESHOLD) >= 0) {
            reasons.add("merge confidence above suggestion threshold");
        } else {
            reasons.add("merge confidence below suggestion threshold");
        }

        MergeRecommendationStatus recommendationStatus;
        boolean autoMergeEligible = false;

        if (hasStrongCanonicalMatch
                && !hasWeakAlias
                && !unresolvedHighRiskConflict
                && !compoundRisk
                && !hasDuplicateOrMismatch
                && mergeConfidence.compareTo(AUTO_MERGE_CONFIDENCE_THRESHOLD) >= 0) {
            recommendationStatus = MergeRecommendationStatus.AUTO_MERGE_ELIGIBLE;
            autoMergeEligible = true;
        } else if (hasStrongCanonicalMatch
                && !hasWeakAlias
                && !compoundRisk
                && mergeConfidence.compareTo(SUGGEST_MERGE_CONFIDENCE_THRESHOLD) >= 0) {
            recommendationStatus = MergeRecommendationStatus.MERGE_SUGGESTED;
        } else {
            recommendationStatus = MergeRecommendationStatus.MANUAL_REVIEW_REQUIRED;
        }

        Long recommendedCanonicalNameId = candidates.stream()
                .map(ParsedNameCandidate::getCanonicalNameId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        String recommendedCanonicalName = nameEntityRepository.findByNormalizedName(canonicalNormalizedName)
                .map(NameEntity::getName)
                .orElseGet(() -> selection.entity().getName());

        Map<String, String> recommendedFieldSources = selection.fieldSelections().entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue().candidate() != null && entry.getValue().candidate().getRawEntry() != null)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().candidate().getRawEntry().getSourceName().name(),
                        (first, second) -> first,
                        LinkedHashMap::new
                ));

        return new MergeRecommendation(
                recommendationStatus,
                recommendedCanonicalNameId,
                recommendedCanonicalName,
                recommendedFieldSources,
                autoMergeEligible,
                String.join("; ", reasons),
                mergeConfidence
        );
    }

    private NameMergeQueue findQueue(Long queueId) {
        return mergeQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("merge queue not found: " + queueId));
    }

    private void assertActionable(NameMergeQueue queue, ReviewQueueActionType actionType) {
        if (queue.getReviewStatus().isTerminal()) {
            throw new IllegalStateException("queue is already finalized for action " + actionType + ": " + queue.getId());
        }
    }

    private List<ParsedNameCandidate> loadCandidates(NameMergeQueue queue) {
        List<Long> candidateIds = parseLongList(queue.getCandidateIds());
        List<ParsedNameCandidate> candidates;

        if (candidateIds.isEmpty()) {
            candidates = parsedRepository.findByCanonicalNormalizedNameWithRawEntry(queue.getCanonicalName());
        } else {
            candidates = parsedRepository.findByIdInWithRawEntry(candidateIds);
        }

        List<ParsedNameCandidate> filtered = candidates.stream()
                .filter(candidate -> queue.getCanonicalName().equals(candidate.getCanonicalNormalizedName()))
                .sorted(Comparator
                        .comparing(ParsedNameCandidate::getSourceConfidence, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed()
                        .thenComparing(ParsedNameCandidate::getId))
                .toList();

        if (filtered.isEmpty()) {
            throw new IllegalArgumentException("merge queue candidates not found: " + queue.getId());
        }
        return filtered;
    }

    private MergeSelection buildAutomaticSelection(String normalizedName, List<ParsedNameCandidate> candidates, SourceName preferredSource) {
        SourceName selectedSource = preferredSource != null ? preferredSource : chooseSource(candidates);
        ParsedNameCandidate selected = pickSelected(candidates, selectedSource)
                .orElseGet(() -> candidates.stream().max(Comparator.comparing(ParsedNameCandidate::getSourceConfidence)).orElseThrow());

        Map<String, MergeFieldSelection> fieldSelections = new LinkedHashMap<>();
        fieldSelections.put("name", selection(selected, "selected by preferred source"));
        fieldSelections.put("gender", chooseGenderSelection(candidates, selected));
        fieldSelections.put("meaning_short", chooseTextFieldSelection("meaning_short", candidates, selected, ParsedNameCandidate::getMeaningShort));
        fieldSelections.put("meaning_long", chooseTextFieldSelection("meaning_long", candidates, selected, ParsedNameCandidate::getMeaningLong));
        fieldSelections.put("origin", chooseTextFieldSelection("origin", candidates, selected, ParsedNameCandidate::getOrigin));
        fieldSelections.put("character_traits_text", chooseTextFieldSelection("character_traits_text", candidates, selected, ParsedNameCandidate::getCharacterTraitsText));
        fieldSelections.put("letter_analysis_text", chooseTextFieldSelection("letter_analysis_text", candidates, selected, ParsedNameCandidate::getLetterAnalysisText));
        fieldSelections.put("quran_flag", chooseQuranSelection(candidates, selected));

        NameEntity entity = nameEntityRepository.findByNormalizedName(normalizedName)
                .orElseGet(NameEntity::new);

        applyEntityFromSelection(entity, normalizedName, selected, fieldSelections);
        return new MergeSelection(entity, selected, fieldSelections);
    }

    private MergeSelection buildManualSelection(
            String normalizedName,
            List<ParsedNameCandidate> candidates,
            SourceName preferredSource,
            Long fallbackCandidateId,
            Map<String, Long> selectedFieldCandidateIds
    ) {
        MergeSelection autoSelection = buildAutomaticSelection(normalizedName, candidates, preferredSource);
        Map<String, MergeFieldSelection> fieldSelections = new LinkedHashMap<>(autoSelection.fieldSelections());

        ParsedNameCandidate fallbackCandidate = resolveFallbackCandidate(candidates, preferredSource, fallbackCandidateId)
                .orElse(autoSelection.selectedCandidate());
        fieldSelections.put("name", selection(fallbackCandidate, "manual fallback candidate"));

        if (selectedFieldCandidateIds != null) {
            Map<Long, ParsedNameCandidate> candidateById = candidates.stream()
                    .collect(Collectors.toMap(ParsedNameCandidate::getId, candidate -> candidate));

            for (Map.Entry<String, Long> entry : selectedFieldCandidateIds.entrySet()) {
                String normalizedField = normalizeFieldKey(entry.getKey());
                if (!MANUAL_FIELD_KEYS.contains(normalizedField)) {
                    continue;
                }
                ParsedNameCandidate candidate = candidateById.get(entry.getValue());
                if (candidate == null) {
                    continue;
                }
                String field = normalizedField.equals("display_name") ? "name" : normalizedField;
                fieldSelections.put(field, selection(candidate, "manual override for field " + field));
            }
        }

        NameEntity entity = nameEntityRepository.findByNormalizedName(normalizedName)
                .orElseGet(NameEntity::new);
        applyEntityFromSelection(entity, normalizedName, fallbackCandidate, fieldSelections);
        return new MergeSelection(entity, fallbackCandidate, fieldSelections);
    }

    private Optional<ParsedNameCandidate> resolveFallbackCandidate(
            List<ParsedNameCandidate> candidates,
            SourceName preferredSource,
            Long fallbackCandidateId
    ) {
        if (fallbackCandidateId != null) {
            Optional<ParsedNameCandidate> byId = candidates.stream()
                    .filter(candidate -> Objects.equals(candidate.getId(), fallbackCandidateId))
                    .findFirst();
            if (byId.isPresent()) {
                return byId;
            }
        }

        if (preferredSource != null) {
            Optional<ParsedNameCandidate> bySource = candidates.stream()
                    .filter(candidate -> candidate.getRawEntry().getSourceName() == preferredSource)
                    .max(candidateConfidenceComparator());
            if (bySource.isPresent()) {
                return bySource;
            }
        }

        return candidates.stream().max(candidateConfidenceComparator());
    }

    private NameEntity resolveCanonicalTarget(Long canonicalNameId, String canonicalNameOverride) {
        if (canonicalNameId != null) {
            return nameEntityRepository.findById(canonicalNameId)
                    .orElseThrow(() -> new IllegalArgumentException("canonical name not found: " + canonicalNameId));
        }

        if (canonicalNameOverride != null && !canonicalNameOverride.isBlank()) {
            String normalized = TurkishStringUtil.normalizeNameForComparison(canonicalNameOverride);
            if (!normalized.isBlank()) {
                return nameEntityRepository.findByNormalizedName(normalized).orElse(null);
            }
        }

        return null;
    }

    private NameEntity persistSelection(MergeSelection selection) {
        NameEntity entity = selection.entity();
        entity.setStatus(NameStatus.ACTIVE);
        return nameEntityRepository.save(entity);
    }

    private void applyEntityFromSelection(
            NameEntity entity,
            String normalizedName,
            ParsedNameCandidate fallbackCandidate,
            Map<String, MergeFieldSelection> fieldSelections
    ) {
        ParsedNameCandidate nameCandidate = selected(fieldSelections, "name", fallbackCandidate);
        ParsedNameCandidate genderCandidate = selected(fieldSelections, "gender", fallbackCandidate);
        ParsedNameCandidate shortCandidate = selected(fieldSelections, "meaning_short", fallbackCandidate);
        ParsedNameCandidate longCandidate = selected(fieldSelections, "meaning_long", fallbackCandidate);
        ParsedNameCandidate originCandidate = selected(fieldSelections, "origin", fallbackCandidate);
        ParsedNameCandidate traitsCandidate = selected(fieldSelections, "character_traits_text", fallbackCandidate);
        ParsedNameCandidate letterCandidate = selected(fieldSelections, "letter_analysis_text", fallbackCandidate);
        ParsedNameCandidate quranCandidate = selected(fieldSelections, "quran_flag", fallbackCandidate);

        entity.setName(clampLength(firstNonBlank(nameCandidate.getDisplayName(), fallbackCandidate.getDisplayName(), normalizedName), MAX_NAME_LENGTH));
        entity.setNormalizedName(clampLength(normalizedName, MAX_NORMALIZED_NAME_LENGTH));

        ParsedGender gender = genderCandidate.getGender();
        if (gender == null || gender == ParsedGender.UNKNOWN) {
            gender = fallbackCandidate.getGender();
        }
        entity.setGender(gender == null ? ParsedGender.UNKNOWN : gender);

        entity.setMeaningShort(firstNonBlank(shortCandidate.getMeaningShort(), fallbackCandidate.getMeaningShort()));
        entity.setMeaningLong(firstNonBlank(longCandidate.getMeaningLong(), fallbackCandidate.getMeaningLong()));
        entity.setOrigin(clampLength(firstNonBlank(originCandidate.getOrigin(), fallbackCandidate.getOrigin()), MAX_ORIGIN_LENGTH));
        entity.setCharacterTraitsText(firstNonBlank(traitsCandidate.getCharacterTraitsText(), fallbackCandidate.getCharacterTraitsText()));
        entity.setLetterAnalysisText(firstNonBlank(letterCandidate.getLetterAnalysisText(), fallbackCandidate.getLetterAnalysisText()));
        entity.setQuranFlag(resolveQuranFlagValue(fieldSelections, fallbackCandidate, quranCandidate));
    }

    private ReviewQueueGroupDto toGroupDto(NameMergeQueue queue, List<ParsedNameCandidate> queueCandidates) {
        Set<Long> allowedCandidateIds = new LinkedHashSet<>(parseLongList(queue.getCandidateIds()));
        List<ParsedNameCandidate> candidates = queueCandidates.stream()
                .filter(candidate -> allowedCandidateIds.isEmpty() || allowedCandidateIds.contains(candidate.getId()))
                .toList();

        List<String> conflictingFields = parseStringList(queue.getConflictingFields());
        List<ReviewQueueCandidateDto> candidateDtos = candidates.stream()
                .map(this::toCandidateDto)
                .toList();

        List<ReviewQueueConflictFieldDto> conflictDetails = buildConflictDetails(conflictingFields, candidates);
        Map<String, SourceName> recommendedSources = parseFieldSourceMap(queue.getRecommendedFieldSources());

        return new ReviewQueueGroupDto(
                queue.getId(),
                queue.getCanonicalName(),
                queue.getReviewStatus(),
                queue.getChosenSource(),
                queue.getReviewNote(),
                queue.isHasConflict(),
                conflictingFields,
                conflictDetails,
                candidateDtos,
                queue.getMergeRecommendationStatus(),
                queue.getRecommendedCanonicalNameId(),
                queue.getRecommendedCanonicalName(),
                recommendedSources,
                queue.isAutoMergeEligible(),
                queue.getAutoMergeReasonSummary(),
                queue.getMergeConfidence(),
                queue.getCreatedAt(),
                queue.getUpdatedAt()
        );
    }

    private ReviewQueueCandidateDto toCandidateDto(ParsedNameCandidate candidate) {
        return new ReviewQueueCandidateDto(
                candidate.getId(),
                candidate.getRawEntry().getId(),
                candidate.getRawEntry().getSourceName(),
                candidate.getRawEntry().getSourceUrl(),
                candidate.getDisplayName(),
                candidate.getNormalizedName(),
                candidate.getGender(),
                candidate.getMeaningShort(),
                candidate.getMeaningLong(),
                candidate.getOrigin(),
                candidate.getCharacterTraitsText(),
                candidate.getLetterAnalysisText(),
                candidate.getQuranFlag(),
                candidate.getSourceConfidence(),
                candidate.isMismatchFlag(),
                candidate.isDuplicateContentFlag(),
                candidate.getContentQuality()
        );
    }

    private List<ReviewQueueConflictFieldDto> buildConflictDetails(List<String> conflictingFields, List<ParsedNameCandidate> candidates) {
        if (conflictingFields.isEmpty() || candidates.isEmpty()) {
            return List.of();
        }

        List<ReviewQueueConflictFieldDto> details = new ArrayList<>();
        for (String field : conflictingFields) {
            List<ReviewQueueConflictValueDto> values = new ArrayList<>();
            for (ParsedNameCandidate candidate : candidates) {
                String value = fieldValue(field, candidate);
                if (value == null || value.isBlank()) {
                    continue;
                }
                values.add(new ReviewQueueConflictValueDto(
                        candidate.getId(),
                        candidate.getRawEntry().getSourceName(),
                        candidate.getDisplayName(),
                        value
                ));
            }
            if (!values.isEmpty()) {
                details.add(new ReviewQueueConflictFieldDto(field, values));
            }
        }

        return details;
    }

    private String fieldValue(String field, ParsedNameCandidate candidate) {
        return switch (field) {
            case "gender" -> enumName(candidate.getGender());
            case "origin" -> candidate.getOrigin();
            case "meaning_short" -> candidate.getMeaningShort();
            case "meaning_long" -> candidate.getMeaningLong();
            case "character_traits_text" -> candidate.getCharacterTraitsText();
            case "letter_analysis_text" -> candidate.getLetterAnalysisText();
            case "quran_flag" -> candidate.getQuranFlag() == null ? null : candidate.getQuranFlag().toString();
            default -> null;
        };
    }

    private Specification<NameMergeQueue> buildReviewSpecification(ReviewQueueFilter filter, Set<MergeReviewStatus> statuses) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (!statuses.isEmpty()) {
                predicates.add(root.get("reviewStatus").in(statuses));
            }

            if (filter.canonicalName() != null && !filter.canonicalName().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("canonicalName")),
                        "%" + filter.canonicalName().trim().toLowerCase(Locale.ROOT) + "%"
                ));
            }

            if (filter.hasConflict() != null) {
                predicates.add(cb.equal(root.get("hasConflict"), filter.hasConflict()));
            }

            if (filter.sourceName() != null) {
                predicates.add(existsCandidatePredicate(root, query, cb, (candidateRoot, criteriaBuilder) ->
                        criteriaBuilder.equal(candidateRoot.get("rawEntry").get("sourceName"), filter.sourceName())
                ));
            }

            if (filter.contentQuality() != null) {
                predicates.add(existsCandidatePredicate(root, query, cb, (candidateRoot, criteriaBuilder) ->
                        criteriaBuilder.equal(candidateRoot.get("contentQuality"), filter.contentQuality())
                ));
            }

            if (filter.mismatchFlag() != null) {
                Predicate mismatchExists = existsCandidatePredicate(root, query, cb, (candidateRoot, criteriaBuilder) ->
                        criteriaBuilder.isTrue(candidateRoot.get("mismatchFlag"))
                );
                predicates.add(filter.mismatchFlag() ? mismatchExists : cb.not(mismatchExists));
            }

            if (filter.duplicateContentFlag() != null) {
                Predicate duplicateExists = existsCandidatePredicate(root, query, cb, (candidateRoot, criteriaBuilder) ->
                        criteriaBuilder.isTrue(candidateRoot.get("duplicateContentFlag"))
                );
                predicates.add(filter.duplicateContentFlag() ? duplicateExists : cb.not(duplicateExists));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Predicate existsCandidatePredicate(
            Root<NameMergeQueue> queueRoot,
            CriteriaQuery<?> query,
            CriteriaBuilder cb,
            CandidatePredicateBuilder builder
    ) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<ParsedNameCandidate> candidateRoot = subquery.from(ParsedNameCandidate.class);

        Predicate linkPredicate = cb.equal(candidateRoot.get("canonicalNormalizedName"), queueRoot.get("canonicalName"));
        Predicate customPredicate = builder.build(candidateRoot, cb);

        subquery.select(cb.literal(1L));
        subquery.where(linkPredicate, customPredicate);

        return cb.exists(subquery);
    }

    private Set<MergeReviewStatus> resolveStatuses(ReviewQueueFilter filter) {
        Set<MergeReviewStatus> requested = filter.reviewStatuses();
        if (requested != null && !requested.isEmpty()) {
            return requested;
        }
        if (filter.includeResolved()) {
            return Collections.emptySet();
        }
        return DEFAULT_ACTIVE_STATUSES;
    }

    private NameMergeAuditLog saveAudit(
            NameMergeQueue queue,
            ReviewQueueActionType actionType,
            MergeReviewStatus previousStatus,
            MergeSelection selection,
            Map<String, Object> payload,
            String actedBy
    ) {
        Map<String, Map<String, Object>> fieldSelectionPayload = selection == null
                ? Map.of()
                : toFieldSelectionPayload(selection.fieldSelections());

        NameMergeAuditLog audit = NameMergeAuditLog.builder()
                .queueId(queue.getId())
                .canonicalName(queue.getCanonicalName())
                .actionType(actionType)
                .previousStatus(previousStatus)
                .newStatus(queue.getReviewStatus())
                .selectedCandidateId(selection == null ? null : selection.selectedCandidate().getId())
                .selectedSource(selection == null ? null : selection.selectedCandidate().getRawEntry().getSourceName())
                .selectedFieldSources(toJson(fieldSelectionPayload))
                .reviewNote(queue.getReviewNote())
                .actionPayload(toJson(payload))
                .actedBy(cleanActor(actedBy))
                .build();

        return auditLogRepository.save(audit);
    }

    private ReviewQueueActionResponse toActionResponse(
            NameMergeQueue queue,
            Long nameId,
            NameMergeAuditLog audit,
            MergeSelection selection
    ) {
        Map<String, SourceName> selectedFieldSources = selection == null
                ? Map.of()
                : selection.fieldSelections().entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().candidate().getRawEntry().getSourceName(),
                        (first, second) -> first,
                        LinkedHashMap::new
                ));

        return new ReviewQueueActionResponse(
                queue.getId(),
                queue.getCanonicalName(),
                queue.getReviewStatus(),
                nameId,
                audit.getId(),
                selection == null ? null : selection.selectedCandidate().getId(),
                selection == null ? null : selection.selectedCandidate().getRawEntry().getSourceName(),
                selectedFieldSources,
                queue.getReviewNote()
        );
    }

    private Map<String, Map<String, Object>> toFieldSelectionPayload(Map<String, MergeFieldSelection> fieldSelections) {
        Map<String, Map<String, Object>> payload = new LinkedHashMap<>();
        for (Map.Entry<String, MergeFieldSelection> entry : fieldSelections.entrySet()) {
            MergeFieldSelection selection = entry.getValue();
            ParsedNameCandidate candidate = selection.candidate();
            if (candidate == null || candidate.getRawEntry() == null) {
                continue;
            }
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("candidateId", candidate.getId());
            value.put("source", candidate.getRawEntry().getSourceName().name());
            value.put("confidence", candidate.getSourceConfidence());
            value.put("selectionScore", selection.score());
            value.put("reason", selection.reason());
            payload.put(entry.getKey(), value);
        }
        return payload;
    }

    private void register(Map<String, Set<String>> values, String fieldName, Collection<String> rawValues) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String value : rawValues) {
            String normalizedValue = TurkishStringUtil.normalizeTextForDiff(value);
            if (!normalizedValue.isBlank()) {
                normalized.add(normalizedValue);
            }
        }
        values.put(fieldName, normalized);
    }

    private SourceName chooseSource(List<ParsedNameCandidate> candidates) {
        return candidates.stream()
                .max(candidateConfidenceComparator())
                .map(candidate -> candidate.getRawEntry().getSourceName())
                .orElse(SourceName.BEBEKISMI);
    }

    private Optional<ParsedNameCandidate> pickSelected(List<ParsedNameCandidate> candidates, SourceName sourceName) {
        if (sourceName == null) {
            return Optional.empty();
        }
        return candidates.stream()
                .filter(candidate -> candidate.getRawEntry().getSourceName() == sourceName)
                .max(candidateConfidenceComparator());
    }

    private MergeFieldSelection chooseGenderSelection(List<ParsedNameCandidate> candidates, ParsedNameCandidate fallback) {
        Optional<ParsedGender> consensus = consensusGender(candidates);
        if (consensus.isPresent()) {
            ParsedNameCandidate selected = candidates.stream()
                    .filter(candidate -> candidate.getGender() == consensus.get())
                    .max(candidateConfidenceComparator())
                    .orElse(fallback);
            return new MergeFieldSelection(selected, "consensus gender with highest source_confidence", sourceConfidenceScore(selected));
        }

        ParsedNameCandidate selected = candidates.stream()
                .filter(candidate -> candidate.getGender() != null && candidate.getGender() != ParsedGender.UNKNOWN)
                .max(candidateConfidenceComparator())
                .orElse(fallback);
        return new MergeFieldSelection(selected, "gender fallback using highest source_confidence", sourceConfidenceScore(selected));
    }

    private Optional<ParsedGender> consensusGender(List<ParsedNameCandidate> candidates) {
        Set<ParsedGender> genders = candidates.stream()
                .map(ParsedNameCandidate::getGender)
                .filter(Objects::nonNull)
                .filter(gender -> gender != ParsedGender.UNKNOWN)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);

        if (genders.size() == 1) {
            return Optional.of(genders.iterator().next());
        }
        return Optional.empty();
    }

    private MergeFieldSelection chooseTextFieldSelection(
            String field,
            List<ParsedNameCandidate> candidates,
            ParsedNameCandidate fallback,
            java.util.function.Function<ParsedNameCandidate, String> extractor
    ) {
        Optional<ParsedNameCandidate> selected = candidates.stream()
                .filter(candidate -> fieldValueUsable(field, candidate, extractor.apply(candidate)))
                .max(candidateConfidenceComparator());

        if (selected.isPresent()) {
            ParsedNameCandidate chosen = selected.get();
            BigDecimal score = sourceConfidenceScore(chosen);
            return new MergeFieldSelection(chosen, "highest source_confidence with usable field value (score=" + score + ")", score);
        }

        return selection(fallback, "fallback candidate used; usable field value not found");
    }

    private MergeFieldSelection chooseQuranSelection(List<ParsedNameCandidate> candidates, ParsedNameCandidate fallback) {
        Optional<MergeFieldSelection> ufuk = candidates.stream()
                .filter(candidate -> candidate.getRawEntry().getSourceName() == SourceName.UFUK)
                .filter(candidate -> candidate.getQuranFlag() != null)
                .map(candidate -> new MergeFieldSelection(
                        candidate,
                        "UFUK precedence applied for quran_flag",
                        sourceConfidenceScore(candidate)
                ))
                .max(Comparator.comparing(MergeFieldSelection::score));

        if (ufuk.isPresent()) {
            return ufuk.get();
        }

        Optional<MergeFieldSelection> nonNull = candidates.stream()
                .filter(candidate -> candidate.getQuranFlag() != null)
                .map(candidate -> new MergeFieldSelection(
                        candidate,
                        "highest confidence non-null quran_flag",
                        sourceConfidenceScore(candidate)
                ))
                .max(Comparator.comparing(MergeFieldSelection::score));

        return nonNull.orElseGet(() -> selection(fallback, "quran_flag unavailable; fallback candidate used"));
    }

    private ParsedNameCandidate selected(Map<String, MergeFieldSelection> fieldSelections, String field, ParsedNameCandidate fallback) {
        MergeFieldSelection selection = fieldSelections.get(field);
        if (selection == null || selection.candidate() == null) {
            return fallback;
        }
        return selection.candidate();
    }

    private MergeFieldSelection selection(ParsedNameCandidate candidate, String reason) {
        if (candidate == null) {
            return new MergeFieldSelection(null, reason, BigDecimal.ZERO);
        }
        BigDecimal score = sourceConfidenceScore(candidate);
        return new MergeFieldSelection(candidate, reason, score);
    }

    private Boolean resolveQuranFlagValue(
            Map<String, MergeFieldSelection> fieldSelections,
            ParsedNameCandidate fallbackCandidate,
            ParsedNameCandidate selectedQuranCandidate
    ) {
        List<ParsedNameCandidate> ufukCandidates = fieldSelections.values().stream()
                .map(MergeFieldSelection::candidate)
                .filter(Objects::nonNull)
                .filter(candidate -> candidate.getRawEntry().getSourceName() == SourceName.UFUK)
                .filter(candidate -> candidate.getQuranFlag() != null)
                .toList();

        if (!ufukCandidates.isEmpty()) {
            return ufukCandidates.stream()
                    .max(candidateConfidenceComparator())
                    .map(ParsedNameCandidate::getQuranFlag)
                    .orElse(null);
        }

        return firstNonNull(selectedQuranCandidate.getQuranFlag(), fallbackCandidate.getQuranFlag());
    }

    private boolean fieldValueUsable(String field, ParsedNameCandidate candidate, String value) {
        if (!notBlank(value)) {
            return false;
        }
        String normalized = TurkishStringUtil.normalizeTextForDiff(value);
        if (normalized.isBlank()) {
            return false;
        }
        return !(field.equals("origin") && normalized.length() < 3);
    }

    private Comparator<ParsedNameCandidate> candidateConfidenceComparator() {
        return Comparator
                .comparingDouble(this::sourceConfidenceValue)
                .thenComparingInt(this::contentQualityRank)
                .thenComparingLong(candidate -> candidate.getId() == null ? Long.MIN_VALUE : candidate.getId());
    }

    private double sourceConfidenceValue(ParsedNameCandidate candidate) {
        if (candidate == null || candidate.getSourceConfidence() == null) {
            return 0.0;
        }
        return candidate.getSourceConfidence().doubleValue();
    }

    private BigDecimal sourceConfidenceScore(ParsedNameCandidate candidate) {
        return BigDecimal.valueOf(Math.max(0.0, Math.min(sourceConfidenceValue(candidate), 1.0)))
                .setScale(3, RoundingMode.HALF_UP);
    }

    private int contentQualityRank(ParsedNameCandidate candidate) {
        if (candidate == null || candidate.getContentQuality() == null) {
            return 0;
        }
        return switch (candidate.getContentQuality()) {
            case HIGH -> 2;
            case MEDIUM -> 1;
            default -> 0;
        };
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String clampLength(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength).trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private String normalizeFieldKey(String key) {
        if (key == null) {
            return "";
        }
        return key.trim()
                .toLowerCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
    }

    private String cleanNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String cleanActor(String actor) {
        if (actor == null) {
            return null;
        }
        String trimmed = actor.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<Long> parseLongList(String json) {
        try {
            if (json == null || json.isBlank()) {
                return List.of();
            }
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            log.warn("invalid long list json payload: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<String> parseStringList(String json) {
        try {
            if (json == null || json.isBlank()) {
                return List.of();
            }
            List<String> values = objectMapper.readValue(json, new TypeReference<>() {
            });
            return values.stream().filter(Objects::nonNull).toList();
        } catch (JsonProcessingException ex) {
            log.warn("invalid string list json payload: {}", ex.getMessage());
            return List.of();
        }
    }

    private Map<String, SourceName> parseFieldSourceMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, String> raw = objectMapper.readValue(json, new TypeReference<>() {
            });
            Map<String, SourceName> out = new LinkedHashMap<>();
            for (Map.Entry<String, String> entry : raw.entrySet()) {
                if (entry.getKey() == null || entry.getValue() == null) {
                    continue;
                }
                SourceName parsed = SourceName.fromNullable(entry.getValue());
                if (parsed != null) {
                    out.put(entry.getKey(), parsed);
                }
            }
            return out;
        } catch (Exception ex) {
            log.warn("invalid field source map json payload: {}", ex.getMessage());
            return Map.of();
        }
    }

    private boolean hasUfukQuranValue(List<ParsedNameCandidate> candidates) {
        return candidates.stream()
                .anyMatch(candidate -> candidate.getRawEntry().getSourceName() == SourceName.UFUK
                        && candidate.getQuranFlag() != null);
    }

    private boolean hasCompoundRisk(List<ParsedNameCandidate> candidates) {
        Set<Boolean> compactPatternSet = candidates.stream()
                .map(ParsedNameCandidate::getNormalizedName)
                .filter(Objects::nonNull)
                .map(value -> value.contains(" "))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (compactPatternSet.size() <= 1) {
            return false;
        }
        return candidates.stream().anyMatch(candidate ->
                candidate.getAliasMatchLevel() == AliasMatchLevel.WEAK_ALIAS
                        || candidate.getAliasMatchLevel() == AliasMatchLevel.NO_MATCH
        );
    }

    private BigDecimal averageMergeConfidence(Map<String, MergeFieldSelection> fieldSelections) {
        if (fieldSelections == null || fieldSelections.isEmpty()) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        for (MergeFieldSelection value : fieldSelections.values()) {
            if (value == null || value.score() == null) {
                continue;
            }
            total = total.add(value.score());
            count++;
        }
        if (count == 0) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }
        return total.divide(BigDecimal.valueOf(count), 3, RoundingMode.HALF_UP);
    }

    private int compareMergeConfidence(BigDecimal current, BigDecimal incoming) {
        BigDecimal left = current == null ? BigDecimal.ZERO : current.setScale(3, RoundingMode.HALF_UP);
        BigDecimal right = incoming == null ? BigDecimal.ZERO : incoming.setScale(3, RoundingMode.HALF_UP);
        return left.compareTo(right);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("failed to serialize queue payload", ex);
        }
    }

    private record MergeSelection(
            NameEntity entity,
            ParsedNameCandidate selectedCandidate,
            Map<String, MergeFieldSelection> fieldSelections
    ) {
    }

    private record MergeFieldSelection(
            ParsedNameCandidate candidate,
            String reason,
            BigDecimal score
    ) {
    }

    private record MergeRecommendation(
            MergeRecommendationStatus status,
            Long recommendedCanonicalNameId,
            String recommendedCanonicalName,
            Map<String, String> recommendedFieldSources,
            boolean autoMergeEligible,
            String reasonSummary,
            BigDecimal mergeConfidence
    ) {
    }

    @FunctionalInterface
    private interface CandidatePredicateBuilder {
        Predicate build(Root<ParsedNameCandidate> candidateRoot, CriteriaBuilder cb);
    }
}
