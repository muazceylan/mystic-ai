package com.mysticai.numerology.ingestion.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameUpdateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.entity.NameAdminAuditLog;
import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.NameAdminAuditActionType;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.repository.NameAdminAuditLogRepository;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameTagRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NameAdminCommandService {

    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_NORMALIZED_NAME_LENGTH = 255;
    private static final int MAX_ORIGIN_LENGTH = 255;
    private static final int MAX_TAG_LENGTH = 120;
    private static final int MAX_EVIDENCE_LENGTH = 500;

    private static final Map<NameStatus, Set<NameStatus>> ALLOWED_STATUS_TRANSITIONS = Map.of(
            NameStatus.PENDING_REVIEW, Set.of(NameStatus.PENDING_REVIEW, NameStatus.ACTIVE, NameStatus.HIDDEN, NameStatus.REJECTED),
            NameStatus.ACTIVE, Set.of(NameStatus.ACTIVE, NameStatus.HIDDEN, NameStatus.REJECTED),
            NameStatus.HIDDEN, Set.of(NameStatus.HIDDEN, NameStatus.ACTIVE),
            NameStatus.REJECTED, Set.of(NameStatus.REJECTED, NameStatus.HIDDEN)
    );

    private final NameEntityRepository nameRepository;
    private final NameAliasRepository aliasRepository;
    private final NameTagRepository tagRepository;
    private final ParsedNameCandidateRepository parsedRepository;
    private final NameAdminAuditLogRepository adminAuditLogRepository;
    private final NameAliasService aliasService;
    private final NameMergeService mergeService;
    private final NameNormalizationService normalizationService;
    private final NameTagTaxonomyService taxonomyService;
    private final NameAdminQueryService queryService;
    private final ObjectMapper objectMapper;

    @Transactional
    public AdminNameDetailDto updateName(Long id, AdminNameUpdateRequest request, String actedBy) {
        if (request == null) {
            throw new IllegalArgumentException("update payload cannot be null");
        }

        NameEntity entity = findName(id);
        Map<String, Object> oldSnapshot = snapshot(entity);
        NameStatus previousStatus = entity.getStatus();

        String displayName = clampLength(TurkishStringUtil.normalizeDisplay(request.name()), MAX_NAME_LENGTH);
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("name cannot be blank");
        }

        String normalizedName = clampLength(normalizationService.normalizedName(displayName), MAX_NORMALIZED_NAME_LENGTH);
        if (normalizedName == null || normalizedName.isBlank()) {
            throw new IllegalArgumentException("normalized name cannot be blank");
        }

        String previousNormalizedName = entity.getNormalizedName();
        validateNameUniqueness(id, normalizedName);
        validateAliasConflict(id, normalizedName);

        NameStatus targetStatus = request.status() == null ? entity.getStatus() : request.status();
        validateStatusTransition(previousStatus, targetStatus);

        entity.setName(displayName);
        entity.setNormalizedName(normalizedName);
        entity.setGender(request.gender() == null ? ParsedGender.UNKNOWN : request.gender());
        entity.setOrigin(clampLength(cleanOptionalText(request.origin()), MAX_ORIGIN_LENGTH));
        entity.setMeaningShort(cleanOptionalText(request.meaningShort()));
        entity.setMeaningLong(cleanOptionalText(request.meaningLong()));
        entity.setCharacterTraitsText(cleanOptionalText(request.characterTraitsText()));
        entity.setLetterAnalysisText(cleanOptionalText(request.letterAnalysisText()));
        entity.setQuranFlag(request.quranFlag());
        entity.setStatus(targetStatus);

        NameEntity saved = nameRepository.save(entity);
        if (!Objects.equals(previousNormalizedName, normalizedName)) {
            remapCanonicalCandidates(saved.getId(), previousNormalizedName, normalizedName);
        }

        Map<String, Object> newSnapshot = snapshot(saved);
        saveAudit(
                saved.getId(),
                previousStatus == targetStatus ? NameAdminAuditActionType.UPDATE : NameAdminAuditActionType.STATUS_CHANGE,
                oldSnapshot,
                newSnapshot,
                actedBy
        );

        return queryService.getName(saved.getId());
    }

    @Transactional(readOnly = true)
    public List<NameTagDto> listTags(Long nameId) {
        assertNameExists(nameId);
        return tagRepository.findByNameIdOrderByTagGroupAscTagAsc(nameId).stream().map(this::toTagDto).toList();
    }

    @Transactional
    public NameTagDto addTag(Long nameId, NameTagCreateRequest request, String actedBy) {
        if (request == null) {
            throw new IllegalArgumentException("tag payload cannot be null");
        }

        NameEntity name = findName(nameId);
        NameTagGroup tagGroup = taxonomyService.parseGroup(request.tagGroup());
        String normalizedTag = clampLength(
                taxonomyService.validateAndNormalize(tagGroup, request.tagValue()),
                MAX_TAG_LENGTH
        );
        if (normalizedTag == null || normalizedTag.isBlank()) {
            throw new IllegalArgumentException("tag cannot be normalized");
        }

        if (tagRepository.existsByNameIdAndTagGroupAndNormalizedTag(nameId, tagGroup, normalizedTag)) {
            throw new IllegalArgumentException("duplicate tag for name: " + normalizedTag);
        }

        validateTagCombination(nameId, tagGroup, normalizedTag);

        String evidence = clampLength(cleanOptionalText(request.evidence()), MAX_EVIDENCE_LENGTH);
        NameTag tag = NameTag.builder()
                .name(name)
                .tagGroup(tagGroup)
                .tag(normalizedTag)
                .normalizedTag(normalizedTag)
                .source(parseTagSource(request.source()))
                .confidence(clampConfidence(request.confidence()))
                .evidence(evidence)
                .build();

        NameTag saved = tagRepository.save(tag);
        saveAudit(nameId, NameAdminAuditActionType.TAG_ADD, null, toTagAuditPayload(saved), actedBy);
        return toTagDto(saved);
    }

    @Transactional
    public void deleteTag(Long nameId, Long tagId, String actedBy) {
        assertNameExists(nameId);
        NameTag tag = tagRepository.findByIdAndNameId(tagId, nameId)
                .orElseThrow(() -> new IllegalArgumentException("tag not found for name: " + tagId));

        Map<String, Object> oldPayload = toTagAuditPayload(tag);
        tagRepository.delete(tag);
        saveAudit(nameId, NameAdminAuditActionType.TAG_DELETE, oldPayload, null, actedBy);
    }

    @Transactional(readOnly = true)
    public Page<NameAliasDto> listAliases(Long nameId, int page, int size) {
        assertNameExists(nameId);
        return aliasService.listAliases(nameId, page, size);
    }

    @Transactional
    public NameAliasDto addAlias(Long nameId, NameAliasCreateRequest request, String actedBy) {
        if (request == null) {
            throw new IllegalArgumentException("alias payload cannot be null");
        }
        assertNameExists(nameId);

        AliasType aliasType = request.aliasType() == null || request.aliasType().isBlank()
                ? AliasType.RELATED_FORM
                : AliasType.valueOf(request.aliasType().trim().toUpperCase());

        NameAliasService.AliasMutationResult result = aliasService.addManualAlias(nameId, request.aliasName(), aliasType, request.confidence());
        refreshQueues(result.affectedQueueKeys());
        if (result.alias() != null) {
            saveAudit(nameId, NameAdminAuditActionType.ALIAS_ADD, null, toAliasAuditPayload(result.alias()), actedBy);
        }
        return result.alias();
    }

    @Transactional
    public void deleteAlias(Long nameId, Long aliasId, String actedBy) {
        assertNameExists(nameId);
        NameAlias alias = aliasRepository.findById(aliasId)
                .orElseThrow(() -> new IllegalArgumentException("alias not found: " + aliasId));
        if (!Objects.equals(alias.getCanonicalName().getId(), nameId)) {
            throw new IllegalArgumentException("alias does not belong to canonical name: " + aliasId);
        }

        Map<String, Object> oldPayload = toAliasAuditPayload(alias);
        NameAliasService.AliasMutationResult result = aliasService.removeAlias(aliasId);
        refreshQueues(result.affectedQueueKeys());
        saveAudit(nameId, NameAdminAuditActionType.ALIAS_DELETE, oldPayload, null, actedBy);
    }

    private void remapCanonicalCandidates(Long canonicalNameId, String oldCanonicalKey, String newCanonicalKey) {
        List<ParsedNameCandidate> linkedCandidates = parsedRepository.findByCanonicalNameId(canonicalNameId);
        if (!linkedCandidates.isEmpty()) {
            for (ParsedNameCandidate candidate : linkedCandidates) {
                candidate.setCanonicalNormalizedName(newCanonicalKey);
            }
            parsedRepository.saveAll(linkedCandidates);
        }

        aliasRepository.findByCanonicalNameAndNormalizedAliasName(
                nameRepository.getReferenceById(canonicalNameId),
                newCanonicalKey
        ).ifPresent(aliasRepository::delete);

        if (oldCanonicalKey != null && !oldCanonicalKey.isBlank()) {
            mergeService.refreshQueue(oldCanonicalKey);
        }
        mergeService.refreshQueue(newCanonicalKey);
    }

    private void refreshQueues(Collection<String> queueKeys) {
        if (queueKeys == null || queueKeys.isEmpty()) {
            return;
        }
        for (String key : queueKeys) {
            if (key == null || key.isBlank()) {
                continue;
            }
            mergeService.refreshQueue(key);
        }
    }

    private void validateStatusTransition(NameStatus current, NameStatus target) {
        Set<NameStatus> allowed = ALLOWED_STATUS_TRANSITIONS.getOrDefault(current, Set.of(current));
        if (!allowed.contains(target)) {
            throw new IllegalArgumentException("invalid status transition: " + current + " -> " + target);
        }
    }

    private void validateNameUniqueness(Long currentId, String normalizedName) {
        nameRepository.findByNormalizedName(normalizedName)
                .filter(existing -> !Objects.equals(existing.getId(), currentId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("name normalized value already exists: " + normalizedName);
                });
    }

    private void validateAliasConflict(Long currentId, String normalizedName) {
        aliasRepository.findByNormalizedAliasName(normalizedName)
                .ifPresent(existingAlias -> {
                    if (!Objects.equals(existingAlias.getCanonicalName().getId(), currentId)) {
                        throw new IllegalArgumentException(
                                "normalized name conflicts with alias of another canonical: " + normalizedName
                        );
                    }
                });
    }

    private NameEntity findName(Long id) {
        return nameRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("name not found: " + id));
    }

    private void assertNameExists(Long id) {
        if (!nameRepository.existsById(id)) {
            throw new IllegalArgumentException("name not found: " + id);
        }
    }

    private NameTagSource parseTagSource(String source) {
        if (source == null || source.isBlank()) {
            return NameTagSource.MANUAL;
        }
        NameTagSource parsed = NameTagSource.valueOf(source.trim().toUpperCase());
        if (parsed == NameTagSource.AUTO || parsed == NameTagSource.RULE || parsed == NameTagSource.AI) {
            return NameTagSource.MANUAL;
        }
        return parsed;
    }

    private void validateTagCombination(Long nameId, NameTagGroup candidateGroup, String candidateValue) {
        List<NameTag> existing = tagRepository.findByNameIdOrderByTagGroupAscTagAsc(nameId);
        Map<NameTagGroup, Set<String>> byGroup = taxonomyService.emptyTagMap();

        for (NameTag tag : existing) {
            if (tag.getTagGroup() == null) {
                continue;
            }
            byGroup.get(tag.getTagGroup()).add(tag.getNormalizedTag());
        }

        Set<String> existingValues = byGroup.get(candidateGroup);
        if (existingValues.contains(candidateValue)) {
            throw new IllegalArgumentException("duplicate taxonomy tag for group: " + candidateGroup + ":" + candidateValue);
        }

        if (taxonomyService.isSingleChoice(candidateGroup) && !existingValues.isEmpty()) {
            throw new IllegalArgumentException("single-choice tag group already has value: " + candidateGroup);
        }

        if (candidateGroup == NameTagGroup.RELIGION && taxonomyService.isReligionConflict(existingValues, candidateValue)) {
            throw new IllegalArgumentException("religion tag conflicts with existing values for name");
        }

        if (existingValues.size() >= taxonomyService.maxTagsForGroup(candidateGroup)) {
            throw new IllegalArgumentException("tag group limit exceeded for group: " + candidateGroup);
        }
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

    private String cleanOptionalText(String value) {
        return normalizationService.cleanText(value);
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

    private Map<String, Object> snapshot(NameEntity entity) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId());
        map.put("name", entity.getName());
        map.put("normalizedName", entity.getNormalizedName());
        map.put("gender", entity.getGender());
        map.put("origin", entity.getOrigin());
        map.put("meaningShort", entity.getMeaningShort());
        map.put("meaningLong", entity.getMeaningLong());
        map.put("characterTraitsText", entity.getCharacterTraitsText());
        map.put("letterAnalysisText", entity.getLetterAnalysisText());
        map.put("quranFlag", entity.getQuranFlag());
        map.put("status", entity.getStatus());
        return map;
    }

    private Map<String, Object> toAliasAuditPayload(NameAliasDto alias) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", alias.id());
        map.put("aliasName", alias.aliasName());
        map.put("normalizedAliasName", alias.normalizedAliasName());
        map.put("aliasType", alias.aliasType());
        map.put("confidence", alias.confidence());
        map.put("isManual", alias.isManual());
        return map;
    }

    private Map<String, Object> toAliasAuditPayload(NameAlias alias) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", alias.getId());
        map.put("aliasName", alias.getAliasName());
        map.put("normalizedAliasName", alias.getNormalizedAliasName());
        map.put("aliasType", alias.getAliasType());
        map.put("confidence", alias.getConfidence());
        map.put("isManual", alias.isManual());
        return map;
    }

    private Map<String, Object> toTagAuditPayload(NameTag tag) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", tag.getId());
        map.put("tagGroup", tag.getTagGroup());
        map.put("tag", tag.getTag());
        map.put("normalizedTag", tag.getNormalizedTag());
        map.put("source", tag.getSource());
        map.put("confidence", tag.getConfidence());
        map.put("evidence", tag.getEvidence());
        map.put("enrichmentVersion", tag.getEnrichmentVersion());
        return map;
    }

    private void saveAudit(
            Long nameId,
            NameAdminAuditActionType actionType,
            Map<String, Object> oldValue,
            Map<String, Object> newValue,
            String actedBy
    ) {
        NameAdminAuditLog audit = NameAdminAuditLog.builder()
                .nameId(nameId)
                .actionType(actionType)
                .actorEmail(actedBy)
                .oldValueJson(toJson(oldValue))
                .newValueJson(toJson(newValue))
                .build();
        adminAuditLogRepository.save(audit);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            log.warn("failed to serialize audit payload: {}", ex.getMessage());
            return null;
        }
    }
}
