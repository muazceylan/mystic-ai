package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.CanonicalBackfillResponse;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalResolutionDto;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NameAliasService {

    private final NameEntityRepository nameRepository;
    private final NameAliasRepository aliasRepository;
    private final ParsedNameCandidateRepository parsedRepository;

    public CanonicalResolutionDto resolveForApi(String inputName) {
        String normalizedInput = TurkishStringUtil.normalizeNameForComparison(inputName);
        AliasResolution resolution = resolveByNormalizedName(normalizedInput);
        return new CanonicalResolutionDto(
                inputName,
                normalizedInput,
                resolution.matchLevel(),
                resolution.canonicalNameId(),
                resolution.canonicalName(),
                resolution.canonicalNormalizedName(),
                resolution.matchedAliasType(),
                resolution.matchLevel().canAutoGroup()
        );
    }

    public AliasResolution resolveByNormalizedName(String normalizedName) {
        String normalizedInput = TurkishStringUtil.normalizeNameForComparison(normalizedName);
        if (normalizedInput.isBlank()) {
            return AliasResolution.noMatch(normalizedInput);
        }

        Optional<NameEntity> exact = nameRepository.findByNormalizedName(normalizedInput);
        if (exact.isPresent()) {
            NameEntity canonical = exact.get();
            return new AliasResolution(
                    normalizedInput,
                    AliasMatchLevel.EXACT,
                    canonical.getId(),
                    canonical.getName(),
                    canonical.getNormalizedName(),
                    null
            );
        }

        Optional<NameAlias> alias = aliasRepository.findByNormalizedAliasName(normalizedInput);
        if (alias.isPresent()) {
            NameEntity canonical = alias.get().getCanonicalName();
            return new AliasResolution(
                    normalizedInput,
                    AliasMatchLevel.STRONG_ALIAS,
                    canonical.getId(),
                    canonical.getName(),
                    canonical.getNormalizedName(),
                    alias.get().getAliasType()
            );
        }

        String weakCandidate = collapseRepeatedVowels(normalizedInput);
        if (!weakCandidate.equals(normalizedInput)) {
            Optional<NameEntity> weakCanonical = nameRepository.findByNormalizedName(weakCandidate);
            if (weakCanonical.isPresent()) {
                NameEntity canonical = weakCanonical.get();
                return new AliasResolution(
                        normalizedInput,
                        AliasMatchLevel.WEAK_ALIAS,
                        canonical.getId(),
                        canonical.getName(),
                        canonical.getNormalizedName(),
                        AliasType.RELATED_FORM
                );
            }

            Optional<NameAlias> weakAlias = aliasRepository.findByNormalizedAliasName(weakCandidate);
            if (weakAlias.isPresent()) {
                NameEntity canonical = weakAlias.get().getCanonicalName();
                return new AliasResolution(
                        normalizedInput,
                        AliasMatchLevel.WEAK_ALIAS,
                        canonical.getId(),
                        canonical.getName(),
                        canonical.getNormalizedName(),
                        weakAlias.get().getAliasType()
                );
            }
        }

        return AliasResolution.noMatch(normalizedInput);
    }

    @Transactional
    public int syncCanonicalAliases(NameEntity canonical, Collection<ParsedNameCandidate> observedCandidates) {
        if (canonical.getId() == null) {
            throw new IllegalArgumentException("canonical name must be persisted before alias sync");
        }

        String canonicalNormalized = TurkishStringUtil.normalizeNameForComparison(canonical.getNormalizedName());
        List<AliasDraft> drafts = generateAutomaticAliasDrafts(canonicalNormalized);

        if (observedCandidates != null) {
            for (ParsedNameCandidate candidate : observedCandidates) {
                if (candidate == null || candidate.getNormalizedName() == null) {
                    continue;
                }
                String candidateNorm = TurkishStringUtil.normalizeNameForComparison(candidate.getNormalizedName());
                if (candidateNorm.isBlank() || candidateNorm.equals(canonicalNormalized)) {
                    continue;
                }

                AliasType aliasType = inferAliasType(canonicalNormalized, candidateNorm);
                BigDecimal confidence = clampConfidence(candidate.getSourceConfidence() == null
                        ? BigDecimal.valueOf(0.86)
                        : candidate.getSourceConfidence());

                drafts.add(new AliasDraft(
                        fallbackAliasDisplay(candidate.getDisplayName(), candidateNorm),
                        candidateNorm,
                        aliasType,
                        confidence,
                        false
                ));
            }
        }

        int upsertCount = 0;
        Set<String> dedupe = new LinkedHashSet<>();
        for (AliasDraft draft : drafts) {
            if (!dedupe.add(draft.normalizedAliasName())) {
                continue;
            }
            if (upsertAlias(canonical, draft, false)) {
                upsertCount++;
            }
        }

        return upsertCount;
    }

    @Transactional
    public int bindCandidatesToCanonical(Collection<ParsedNameCandidate> candidates, NameEntity canonical) {
        if (candidates == null || candidates.isEmpty()) {
            return 0;
        }

        int updated = 0;
        String canonicalNormalized = canonical.getNormalizedName();
        for (ParsedNameCandidate candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            AliasMatchLevel level = candidate.getNormalizedName().equals(canonicalNormalized)
                    ? AliasMatchLevel.EXACT
                    : AliasMatchLevel.STRONG_ALIAS;

            boolean changed = false;
            if (!Objects.equals(candidate.getCanonicalNameId(), canonical.getId())) {
                candidate.setCanonicalNameId(canonical.getId());
                changed = true;
            }
            if (!Objects.equals(candidate.getCanonicalNormalizedName(), canonicalNormalized)) {
                candidate.setCanonicalNormalizedName(canonicalNormalized);
                changed = true;
            }
            if (candidate.getAliasMatchLevel() != level) {
                candidate.setAliasMatchLevel(level);
                changed = true;
            }
            if (changed) {
                updated++;
            }
        }

        if (updated > 0) {
            parsedRepository.saveAll(candidates);
        }
        return updated;
    }

    public Page<NameAliasDto> listAliases(Long canonicalNameId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 200)), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<NameAlias> aliasPage = aliasRepository.findByCanonicalNameIdOrderByUpdatedAtDesc(canonicalNameId, pageable);
        List<NameAliasDto> content = aliasPage.getContent().stream().map(this::toAliasDto).toList();
        return new PageImpl<>(content, pageable, aliasPage.getTotalElements());
    }

    @Transactional
    public AliasMutationResult addManualAlias(Long canonicalNameId, String aliasName, AliasType aliasType, BigDecimal confidence) {
        NameEntity canonical = nameRepository.findById(canonicalNameId)
                .orElseThrow(() -> new IllegalArgumentException("canonical name not found: " + canonicalNameId));

        String normalizedAlias = TurkishStringUtil.normalizeNameForComparison(aliasName);
        if (normalizedAlias.isBlank()) {
            throw new IllegalArgumentException("alias name cannot be blank");
        }
        if (normalizedAlias.equals(canonical.getNormalizedName())) {
            throw new IllegalArgumentException("alias cannot be identical with canonical normalized name");
        }

        AliasDraft draft = new AliasDraft(
                TurkishStringUtil.normalizeDisplay(aliasName),
                normalizedAlias,
                aliasType == null ? AliasType.RELATED_FORM : aliasType,
                clampConfidence(confidence == null ? BigDecimal.ONE : confidence),
                true
        );

        upsertAlias(canonical, draft, true);
        NameAlias alias = aliasRepository.findByNormalizedAliasName(normalizedAlias)
                .orElseThrow(() -> new IllegalStateException("manual alias was not persisted"));

        Set<String> affectedQueueKeys = remapCandidatesForAlias(normalizedAlias, canonical);
        return new AliasMutationResult(toAliasDto(alias), affectedQueueKeys);
    }

    @Transactional
    public AliasMutationResult removeAlias(Long aliasId) {
        NameAlias alias = aliasRepository.findById(aliasId)
                .orElseThrow(() -> new IllegalArgumentException("alias not found: " + aliasId));

        String normalizedAlias = alias.getNormalizedAliasName();
        String previousCanonicalKey = alias.getCanonicalName().getNormalizedName();
        aliasRepository.delete(alias);

        Set<String> affected = new LinkedHashSet<>();
        affected.add(previousCanonicalKey);
        affected.add(normalizedAlias);

        List<ParsedNameCandidate> candidates = parsedRepository.findByNormalizedName(normalizedAlias);
        if (!candidates.isEmpty()) {
            for (ParsedNameCandidate candidate : candidates) {
                affected.add(candidate.getCanonicalNormalizedName());

                AliasResolution resolution = resolveByNormalizedName(candidate.getNormalizedName());
                applyResolution(candidate, resolution);
                affected.add(candidate.getCanonicalNormalizedName());
            }
            parsedRepository.saveAll(candidates);
        }

        return new AliasMutationResult(null, affected);
    }

    public CanonicalNameDetailDto getCanonicalDetail(Long canonicalNameId) {
        NameEntity canonical = nameRepository.findById(canonicalNameId)
                .orElseThrow(() -> new IllegalArgumentException("canonical name not found: " + canonicalNameId));

        List<NameAliasDto> aliases = aliasRepository.findByCanonicalNameIdOrderByAliasNameAsc(canonicalNameId)
                .stream()
                .map(this::toAliasDto)
                .toList();

        return new CanonicalNameDetailDto(
                canonical.getId(),
                canonical.getName(),
                canonical.getNormalizedName(),
                canonical.getGender(),
                canonical.getOrigin(),
                canonical.getStatus(),
                canonical.getCreatedAt(),
                canonical.getUpdatedAt(),
                aliases
        );
    }

    @Transactional
    public BackfillResult backfillCanonicalAndAliasData() {
        List<NameEntity> activeCanonicalNames = nameRepository.findByStatus(NameStatus.ACTIVE);
        int canonicalCount = activeCanonicalNames.size();

        int aliasUpsertCount = 0;
        for (NameEntity canonical : activeCanonicalNames) {
            aliasUpsertCount += syncCanonicalAliases(canonical, List.of());
        }

        List<ParsedNameCandidate> candidates = parsedRepository.findAll();
        int updatedCandidates = 0;
        Set<String> affectedQueueKeys = new LinkedHashSet<>();

        for (ParsedNameCandidate candidate : candidates) {
            String previousKey = candidate.getCanonicalNormalizedName();
            if (previousKey != null && !previousKey.isBlank()) {
                affectedQueueKeys.add(previousKey);
            }

            AliasResolution resolution = resolveByNormalizedName(candidate.getNormalizedName());
            boolean changed = applyResolution(candidate, resolution);
            if (changed) {
                updatedCandidates++;
            }
            affectedQueueKeys.add(candidate.getCanonicalNormalizedName());
        }

        if (updatedCandidates > 0) {
            parsedRepository.saveAll(candidates);
        }

        return new BackfillResult(canonicalCount, aliasUpsertCount, updatedCandidates, affectedQueueKeys);
    }

    public CanonicalBackfillResponse toBackfillResponse(BackfillResult result, int queueRefreshCount) {
        return new CanonicalBackfillResponse(
                result.canonicalCount(),
                result.aliasUpsertCount(),
                result.candidateUpdatedCount(),
                queueRefreshCount
        );
    }

    private List<AliasDraft> generateAutomaticAliasDrafts(String canonicalNormalizedName) {
        String canonicalNormalized = TurkishStringUtil.normalizeNameForComparison(canonicalNormalizedName);
        if (canonicalNormalized.isBlank()) {
            return List.of();
        }

        List<AliasDraft> drafts = new ArrayList<>();
        String ascii = TurkishStringUtil.normalizeNameAsciiForComparison(canonicalNormalized);
        if (!ascii.equals(canonicalNormalized)) {
            drafts.add(new AliasDraft(
                    TurkishStringUtil.normalizeDisplay(ascii),
                    ascii,
                    AliasType.TRANSLITERATION,
                    BigDecimal.valueOf(0.960),
                    false
            ));
        }

        if (canonicalNormalized.contains(" ")) {
            String compact = TurkishStringUtil.normalizeNameCompact(canonicalNormalized);
            if (!compact.equals(canonicalNormalized)) {
                drafts.add(new AliasDraft(
                        TurkishStringUtil.normalizeDisplay(compact),
                        compact,
                        AliasType.COMPOUND_VARIANT,
                        BigDecimal.valueOf(0.930),
                        false
                ));
            }

            String asciiCompact = TurkishStringUtil.normalizeNameAsciiCompact(canonicalNormalized);
            if (!asciiCompact.equals(canonicalNormalized) && !asciiCompact.equals(compact)) {
                drafts.add(new AliasDraft(
                        TurkishStringUtil.normalizeDisplay(asciiCompact),
                        asciiCompact,
                        AliasType.COMPOUND_VARIANT,
                        BigDecimal.valueOf(0.920),
                        false
                ));
            }
        }

        List<String> tokens = TurkishStringUtil.nameTokens(canonicalNormalized);
        if (!tokens.isEmpty()) {
            List<String> medMetVariant = applyTokenVariant(tokens, this::convertMedMetToken);
            if (!medMetVariant.equals(tokens)) {
                String normalized = String.join(" ", medMetVariant);
                if (!normalized.equals(canonicalNormalized)) {
                    drafts.add(new AliasDraft(
                            TurkishStringUtil.normalizeDisplay(normalized),
                            normalized,
                            AliasType.SPELLING_VARIANT,
                            BigDecimal.valueOf(0.910),
                            false
                    ));
                }
            }

            List<String> muhamVariant = applyTokenVariant(tokens, this::convertMuhamMohamToken);
            if (!muhamVariant.equals(tokens)) {
                String normalized = String.join(" ", muhamVariant);
                if (!normalized.equals(canonicalNormalized)) {
                    drafts.add(new AliasDraft(
                            TurkishStringUtil.normalizeDisplay(normalized),
                            normalized,
                            AliasType.TRANSLITERATION,
                            BigDecimal.valueOf(0.900),
                            false
                    ));
                }
            }
        }

        return drafts;
    }

    private List<String> applyTokenVariant(List<String> tokens, java.util.function.Function<String, String> variantFunction) {
        List<String> out = new ArrayList<>(tokens.size());
        for (String token : tokens) {
            out.add(variantFunction.apply(token));
        }
        return out;
    }

    private String convertMedMetToken(String token) {
        if (token.endsWith("met") && token.length() >= 4) {
            return token.substring(0, token.length() - 1) + "d";
        }
        if (token.endsWith("med") && token.length() >= 4) {
            return token.substring(0, token.length() - 1) + "t";
        }
        return token;
    }

    private String convertMuhamMohamToken(String token) {
        if (token.startsWith("muham")) {
            return "moham" + token.substring("muham".length());
        }
        if (token.startsWith("moham")) {
            return "muham" + token.substring("moham".length());
        }
        return token;
    }

    private String fallbackAliasDisplay(String displayName, String normalizedAlias) {
        String normalizedDisplay = TurkishStringUtil.normalizeDisplay(displayName);
        if (normalizedDisplay.isBlank()) {
            return TurkishStringUtil.normalizeDisplay(normalizedAlias);
        }
        return normalizedDisplay;
    }

    private AliasType inferAliasType(String canonicalNormalizedName, String aliasNormalizedName) {
        String canonical = TurkishStringUtil.normalizeNameForComparison(canonicalNormalizedName);
        String alias = TurkishStringUtil.normalizeNameForComparison(aliasNormalizedName);

        if (canonical.isBlank() || alias.isBlank()) {
            return AliasType.RELATED_FORM;
        }

        if (TurkishStringUtil.normalizeNameAsciiForComparison(canonical)
                .equals(TurkishStringUtil.normalizeNameAsciiForComparison(alias))) {
            return AliasType.TRANSLITERATION;
        }

        if (TurkishStringUtil.normalizeNameCompact(canonical)
                .equals(TurkishStringUtil.normalizeNameCompact(alias))) {
            return AliasType.COMPOUND_VARIANT;
        }

        if (convertMedMetToken(canonical).equals(alias) || convertMedMetToken(alias).equals(canonical)) {
            return AliasType.SPELLING_VARIANT;
        }

        if (convertMuhamMohamToken(canonical).equals(alias) || convertMuhamMohamToken(alias).equals(canonical)) {
            return AliasType.TRANSLITERATION;
        }

        return AliasType.RELATED_FORM;
    }

    private Set<String> remapCandidatesForAlias(String normalizedAlias, NameEntity canonical) {
        Set<String> affected = new LinkedHashSet<>();
        affected.add(normalizedAlias);
        affected.add(canonical.getNormalizedName());

        List<ParsedNameCandidate> candidates = parsedRepository.findByNormalizedName(normalizedAlias);
        if (candidates.isEmpty()) {
            return affected;
        }

        for (ParsedNameCandidate candidate : candidates) {
            affected.add(candidate.getCanonicalNormalizedName());
            candidate.setCanonicalNameId(canonical.getId());
            candidate.setCanonicalNormalizedName(canonical.getNormalizedName());
            candidate.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);
        }
        parsedRepository.saveAll(candidates);
        return affected;
    }

    private boolean applyResolution(ParsedNameCandidate candidate, AliasResolution resolution) {
        String targetCanonical = resolution.matchLevel().canAutoGroup()
                ? resolution.canonicalNormalizedName()
                : candidate.getNormalizedName();
        Long targetCanonicalId = resolution.matchLevel().canAutoGroup()
                ? resolution.canonicalNameId()
                : null;

        boolean changed = false;
        if (!Objects.equals(candidate.getCanonicalNormalizedName(), targetCanonical)) {
            candidate.setCanonicalNormalizedName(targetCanonical);
            changed = true;
        }
        if (!Objects.equals(candidate.getCanonicalNameId(), targetCanonicalId)) {
            candidate.setCanonicalNameId(targetCanonicalId);
            changed = true;
        }
        AliasMatchLevel targetLevel = resolution.matchLevel().canAutoGroup()
                ? resolution.matchLevel()
                : (resolution.matchLevel() == AliasMatchLevel.WEAK_ALIAS ? AliasMatchLevel.WEAK_ALIAS : AliasMatchLevel.NO_MATCH);
        if (candidate.getAliasMatchLevel() != targetLevel) {
            candidate.setAliasMatchLevel(targetLevel);
            changed = true;
        }

        return changed;
    }

    private boolean upsertAlias(NameEntity canonical, AliasDraft draft, boolean manualOverride) {
        if (draft.normalizedAliasName().isBlank()) {
            return false;
        }
        if (draft.normalizedAliasName().equals(canonical.getNormalizedName())) {
            return false;
        }

        Optional<NameAlias> existingByNormalized = aliasRepository.findByNormalizedAliasName(draft.normalizedAliasName());
        if (existingByNormalized.isPresent()) {
            NameAlias existing = existingByNormalized.get();
            if (!Objects.equals(existing.getCanonicalName().getId(), canonical.getId())) {
                if (manualOverride) {
                    throw new IllegalArgumentException(
                            "alias already assigned to another canonical: " + draft.normalizedAliasName());
                }
                return false;
            }

            boolean changed = false;
            if (manualOverride && !existing.isManual()) {
                existing.setManual(true);
                changed = true;
            }
            if (!existing.isManual()) {
                if (existing.getAliasType() != draft.aliasType()) {
                    existing.setAliasType(draft.aliasType());
                    changed = true;
                }
                if (draft.confidence().compareTo(existing.getConfidence()) > 0) {
                    existing.setConfidence(draft.confidence());
                    changed = true;
                }
                if (draft.aliasName() != null && !draft.aliasName().isBlank() && !Objects.equals(existing.getAliasName(), draft.aliasName())) {
                    existing.setAliasName(draft.aliasName());
                    changed = true;
                }
            }

            if (changed) {
                aliasRepository.save(existing);
            }
            return changed;
        }

        NameAlias alias = NameAlias.builder()
                .canonicalName(canonical)
                .aliasName(draft.aliasName())
                .normalizedAliasName(draft.normalizedAliasName())
                .aliasType(draft.aliasType())
                .confidence(clampConfidence(draft.confidence()))
                .manual(manualOverride || draft.isManual())
                .build();
        aliasRepository.save(alias);
        return true;
    }

    private NameAliasDto toAliasDto(NameAlias alias) {
        return new NameAliasDto(
                alias.getId(),
                alias.getCanonicalName().getId(),
                alias.getCanonicalName().getName(),
                alias.getCanonicalName().getNormalizedName(),
                alias.getAliasName(),
                alias.getNormalizedAliasName(),
                alias.getAliasType(),
                alias.getConfidence(),
                alias.isManual(),
                alias.getCreatedAt(),
                alias.getUpdatedAt()
        );
    }

    private String collapseRepeatedVowels(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value
                .replaceAll("aa+", "a")
                .replaceAll("ee+", "e")
                .replaceAll("ii+", "i")
                .replaceAll("oo+", "o")
                .replaceAll("uu+", "u");
    }

    private BigDecimal clampConfidence(BigDecimal confidence) {
        BigDecimal safe = confidence == null ? BigDecimal.valueOf(0.85) : confidence;
        if (safe.compareTo(BigDecimal.valueOf(0.10)) < 0) {
            safe = BigDecimal.valueOf(0.10);
        }
        if (safe.compareTo(BigDecimal.ONE) > 0) {
            safe = BigDecimal.ONE;
        }
        return safe.setScale(3, RoundingMode.HALF_UP);
    }

    public record AliasResolution(
            String normalizedInput,
            AliasMatchLevel matchLevel,
            Long canonicalNameId,
            String canonicalName,
            String canonicalNormalizedName,
            AliasType matchedAliasType
    ) {
        static AliasResolution noMatch(String normalizedInput) {
            return new AliasResolution(
                    normalizedInput,
                    AliasMatchLevel.NO_MATCH,
                    null,
                    null,
                    normalizedInput,
                    null
            );
        }
    }

    public record AliasMutationResult(
            NameAliasDto alias,
            Set<String> affectedQueueKeys
    ) {
    }

    public record BackfillResult(
            int canonicalCount,
            int aliasUpsertCount,
            int candidateUpdatedCount,
            Set<String> affectedQueueKeys
    ) {
    }

    private record AliasDraft(
            String aliasName,
            String normalizedAliasName,
            AliasType aliasType,
            BigDecimal confidence,
            boolean isManual
    ) {
    }
}
