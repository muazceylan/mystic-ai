package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.AdminNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameCanonicalInfoDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameListItemDto;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameTagRepository;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NameAdminQueryService {

    private static final int MAX_PAGE_SIZE = 200;
    private static final Locale TR_LOCALE = Locale.forLanguageTag("tr-TR");

    private final NameEntityRepository nameRepository;
    private final NameAliasRepository aliasRepository;
    private final NameTagRepository tagRepository;

    @Transactional(readOnly = true)
    public Page<AdminNameListItemDto> listNames(
            String q,
            NameStatus status,
            ParsedGender gender,
            String origin,
            Boolean hasTags,
            Boolean hasAliases,
            int page,
            int size
    ) {
        NameStatus effectiveStatus = status == null ? NameStatus.ACTIVE : status;
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, Math.min(size, MAX_PAGE_SIZE)),
                Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        Specification<NameEntity> spec = Specification
                .where(hasStatus(effectiveStatus))
                .and(matchesQuery(q))
                .and(matchesGender(gender))
                .and(matchesOrigin(origin))
                .and(matchesTags(hasTags))
                .and(matchesAliases(hasAliases));

        Page<NameEntity> names = nameRepository.findAll(spec, pageable);
        List<Long> nameIds = names.getContent().stream().map(NameEntity::getId).toList();
        Map<Long, Long> aliasCounts = aliasCountByCanonicalId(nameIds);
        Map<Long, List<String>> tagSummaries = tagSummaryByNameId(nameIds);
        return names.map(name -> toListDto(
                name,
                aliasCounts.getOrDefault(name.getId(), 0L),
                tagSummaries.getOrDefault(name.getId(), List.of())
        ));
    }

    @Transactional(readOnly = true)
    public AdminNameDetailDto getName(Long id) {
        NameEntity name = nameRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("name not found: " + id));

        List<NameAliasDto> aliases = aliasRepository.findByCanonicalNameIdOrderByAliasNameAsc(id)
                .stream()
                .map(this::toAliasDto)
                .toList();

        List<NameTagDto> tags = tagRepository.findByNameIdOrderByTagGroupAscTagAsc(id)
                .stream()
                .map(this::toTagDto)
                .toList();

        return toDetailDto(name, aliases, tags);
    }

    private Map<Long, Long> aliasCountByCanonicalId(Collection<Long> canonicalIds) {
        if (canonicalIds == null || canonicalIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Long> aliasCounts = new LinkedHashMap<>();
        for (NameAliasRepository.CanonicalAliasCountProjection projection : aliasRepository.countByCanonicalNameIds(canonicalIds)) {
            aliasCounts.put(projection.getCanonicalNameId(), projection.getAliasCount());
        }
        return aliasCounts;
    }

    private Map<Long, List<String>> tagSummaryByNameId(Collection<Long> nameIds) {
        if (nameIds == null || nameIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, List<String>> summary = new LinkedHashMap<>();
        for (NameTag tag : tagRepository.findByNameIdInOrderByNameIdAscTagAsc(nameIds)) {
            Long nameId = tag.getName().getId();
            List<String> tags = summary.computeIfAbsent(nameId, ignored -> new ArrayList<>());
            if (tags.size() >= 5) {
                continue;
            }
            tags.add(tag.getTag());
        }
        return summary;
    }

    private Specification<NameEntity> hasStatus(NameStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    private Specification<NameEntity> matchesQuery(String q) {
        if (q == null || q.isBlank()) {
            return Specification.where(null);
        }

        String raw = q.trim().toLowerCase(Locale.ROOT);
        String normalized = TurkishStringUtil.normalizeNameForComparison(q);
        String rawPattern = "%" + raw + "%";
        String normalizedPattern = "%" + normalized + "%";

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("name")), rawPattern));
            predicates.add(cb.like(cb.lower(root.get("normalizedName")), normalizedPattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(root.get("meaningShort"), "")), rawPattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(root.get("origin"), "")), rawPattern));
            return cb.or(predicates.toArray(Predicate[]::new));
        };
    }

    private Specification<NameEntity> matchesGender(ParsedGender gender) {
        if (gender == null) {
            return Specification.where(null);
        }
        return (root, query, cb) -> cb.equal(root.get("gender"), gender);
    }

    private Specification<NameEntity> matchesOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return Specification.where(null);
        }

        String pattern = "%" + origin.trim().toLowerCase(Locale.ROOT) + "%";
        return (root, query, cb) -> cb.like(cb.lower(cb.coalesce(root.get("origin"), "")), pattern);
    }

    private Specification<NameEntity> matchesTags(Boolean hasTags) {
        if (hasTags == null) {
            return Specification.where(null);
        }

        return (root, query, cb) -> {
            Subquery<Long> tagSubquery = query.subquery(Long.class);
            var tagRoot = tagSubquery.from(NameTag.class);
            tagSubquery.select(tagRoot.get("id"));
            tagSubquery.where(cb.equal(tagRoot.get("name").get("id"), root.get("id")));

            Predicate tagExists = cb.exists(tagSubquery);
            return hasTags ? tagExists : cb.not(tagExists);
        };
    }

    private Specification<NameEntity> matchesAliases(Boolean hasAliases) {
        if (hasAliases == null) {
            return Specification.where(null);
        }

        return (root, query, cb) -> {
            Subquery<Long> aliasSubquery = query.subquery(Long.class);
            var aliasRoot = aliasSubquery.from(NameAlias.class);
            aliasSubquery.select(aliasRoot.get("id"));
            aliasSubquery.where(cb.equal(aliasRoot.get("canonicalName").get("id"), root.get("id")));

            Predicate aliasExists = cb.exists(aliasSubquery);
            return hasAliases ? aliasExists : cb.not(aliasExists);
        };
    }

    private AdminNameListItemDto toListDto(NameEntity entity, long aliasCount, List<String> tagSummary) {
        MeaningPair meaning = harmonizeMeanings(entity.getMeaningShort(), entity.getMeaningLong());
        return new AdminNameListItemDto(
                entity.getId(),
                entity.getName(),
                entity.getNormalizedName(),
                entity.getGender(),
                entity.getOrigin(),
                firstNonBlank(meaning.shortMeaning(), meaning.longMeaning()),
                entity.getStatus(),
                entity.getQuranFlag(),
                calculateDataQualityScore(entity),
                tagSummary,
                aliasCount > 0,
                aliasCount,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private AdminNameDetailDto toDetailDto(NameEntity entity, List<NameAliasDto> aliases, List<NameTagDto> tags) {
        List<String> tagSummary = tags.stream().map(NameTagDto::tagValue).limit(5).toList();
        MeaningPair meaning = harmonizeMeanings(entity.getMeaningShort(), entity.getMeaningLong());
        DetailTextBundle textBundle = harmonizeDetailTexts(
                meaning,
                entity.getCharacterTraitsText(),
                entity.getLetterAnalysisText()
        );
        AdminNameCanonicalInfoDto canonicalInfo = new AdminNameCanonicalInfoDto(
                entity.getId(),
                entity.getName(),
                entity.getNormalizedName()
        );

        return new AdminNameDetailDto(
                entity.getId(),
                entity.getName(),
                entity.getNormalizedName(),
                entity.getGender(),
                entity.getOrigin(),
                textBundle.meaningShort(),
                textBundle.meaningLong(),
                textBundle.characterTraitsText(),
                textBundle.letterAnalysisText(),
                entity.getQuranFlag(),
                entity.getStatus(),
                calculateDataQualityScore(entity),
                tagSummary,
                canonicalInfo,
                aliases,
                tags,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
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

    private Integer calculateDataQualityScore(NameEntity entity) {
        int filled = 0;
        int total = 7;

        if (entity.getGender() != null && entity.getGender() != ParsedGender.UNKNOWN) {
            filled++;
        }
        if (notBlank(entity.getMeaningShort())) {
            filled++;
        }
        if (notBlank(entity.getMeaningLong())) {
            filled++;
        }
        if (notBlank(entity.getOrigin())) {
            filled++;
        }
        if (notBlank(entity.getCharacterTraitsText())) {
            filled++;
        }
        if (notBlank(entity.getLetterAnalysisText())) {
            filled++;
        }
        if (entity.getQuranFlag() != null) {
            filled++;
        }

        return BigDecimal.valueOf((filled * 100.0D) / total)
                .setScale(0, java.math.RoundingMode.HALF_UP)
                .intValue();
    }

    private MeaningPair harmonizeMeanings(String meaningShort, String meaningLong) {
        String shortText = normalizeTextBlock(meaningShort);
        String longText = normalizeTextBlock(meaningLong);

        if (!notBlank(shortText) && !notBlank(longText)) {
            return new MeaningPair(null, null);
        }
        if (!notBlank(shortText)) {
            return new MeaningPair(longText, null);
        }
        if (!notBlank(longText)) {
            return new MeaningPair(shortText, null);
        }

        String shortNormalized = TurkishStringUtil.normalizeTextForDiff(shortText);
        String longNormalized = TurkishStringUtil.normalizeTextForDiff(longText);
        if (!shortNormalized.isBlank() && shortNormalized.equals(longNormalized)) {
            return new MeaningPair(shortText, null);
        }

        String trimmedLong = trimPrefixIfPresent(longText, shortText);
        return new MeaningPair(shortText, trimmedLong);
    }

    private String normalizeTextBlock(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
        return normalized.isBlank() ? null : normalized;
    }

    private DetailTextBundle harmonizeDetailTexts(
            MeaningPair meaningPair,
            String characterTraitsText,
            String letterAnalysisText
    ) {
        String shortMeaning = normalizeTextBlock(meaningPair.shortMeaning());
        String longMeaning = normalizeTextBlock(meaningPair.longMeaning());
        String characterText = normalizeTextBlock(characterTraitsText);
        String letterText = normalizeTextBlock(letterAnalysisText);

        longMeaning = trimPrefixIfPresent(longMeaning, characterText);
        longMeaning = trimPrefixIfPresent(longMeaning, letterText);

        if (isDuplicateText(characterText, shortMeaning) || isDuplicateText(characterText, longMeaning)) {
            characterText = null;
        }
        if (isDuplicateText(letterText, shortMeaning)
                || isDuplicateText(letterText, longMeaning)
                || isDuplicateText(letterText, characterText)) {
            letterText = null;
        }

        return new DetailTextBundle(shortMeaning, longMeaning, characterText, letterText);
    }

    private boolean isDuplicateText(String first, String second) {
        if (!notBlank(first) || !notBlank(second)) {
            return false;
        }
        String firstNormalized = TurkishStringUtil.normalizeTextForDiff(first);
        String secondNormalized = TurkishStringUtil.normalizeTextForDiff(second);
        if (firstNormalized.isBlank() || secondNormalized.isBlank()) {
            return false;
        }
        return firstNormalized.equals(secondNormalized)
                || firstNormalized.startsWith(secondNormalized)
                || secondNormalized.startsWith(firstNormalized);
    }

    private String trimPrefixIfPresent(String text, String prefix) {
        if (!notBlank(text) || !notBlank(prefix)) {
            return text;
        }

        String textNormalized = TurkishStringUtil.normalizeTextForDiff(text);
        String prefixNormalized = TurkishStringUtil.normalizeTextForDiff(prefix);
        if (textNormalized.isBlank() || prefixNormalized.isBlank() || !textNormalized.startsWith(prefixNormalized)) {
            return text;
        }

        String textLower = text.toLowerCase(TR_LOCALE);
        String prefixLower = prefix.toLowerCase(TR_LOCALE);
        if (!textLower.startsWith(prefixLower)) {
            return text;
        }

        String remainder = text.substring(prefix.length())
                .replaceFirst("^[\\s,.;:!?\\-–—]+", "")
                .trim();
        return remainder.isBlank() ? null : remainder;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (notBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private record MeaningPair(String shortMeaning, String longMeaning) {
    }

    private record DetailTextBundle(
            String meaningShort,
            String meaningLong,
            String characterTraitsText,
            String letterAnalysisText
    ) {
    }
}
