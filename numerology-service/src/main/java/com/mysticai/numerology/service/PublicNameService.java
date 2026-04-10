package com.mysticai.numerology.service;

import com.mysticai.numerology.dto.PublicNameAliasDto;
import com.mysticai.numerology.dto.PublicNameDetailDto;
import com.mysticai.numerology.dto.PublicNameListItemDto;
import com.mysticai.numerology.dto.PublicNameTagDto;
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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PublicNameService {

    private static final int MAX_PAGE_SIZE = 100;

    private final NameEntityRepository nameRepository;
    private final NameAliasRepository aliasRepository;
    private final NameTagRepository tagRepository;

    @Transactional(readOnly = true)
    public Page<PublicNameListItemDto> listNames(
            String q,
            ParsedGender gender,
            String origin,
            Boolean quranFlag,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, Math.min(size, MAX_PAGE_SIZE)),
                Sort.by(Sort.Direction.ASC, "name")
        );

        Specification<NameEntity> spec = Specification
                .where(hasStatus(NameStatus.ACTIVE))
                .and(matchesQuery(q))
                .and(matchesGender(gender))
                .and(matchesOrigin(origin))
                .and(matchesQuranFlag(quranFlag));

        Page<NameEntity> names = nameRepository.findAll(spec, pageable);
        List<Long> nameIds = names.getContent().stream().map(NameEntity::getId).toList();
        Map<Long, List<PublicNameTagDto>> tagsByNameId = tagsByNameId(nameIds);

        return names.map(name -> toListDto(name, tagsByNameId.getOrDefault(name.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public PublicNameDetailDto getNameDetail(Long id) {
        NameEntity name = nameRepository.findById(id)
                .filter(e -> e.getStatus() == NameStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "name not found"));

        List<PublicNameTagDto> tags = tagRepository.findByNameIdOrderByTagGroupAscTagAsc(id)
                .stream()
                .map(this::toTagDto)
                .toList();

        List<PublicNameAliasDto> aliases = aliasRepository.findByCanonicalNameIdOrderByAliasNameAsc(id)
                .stream()
                .map(this::toAliasDto)
                .toList();

        return toDetailDto(name, tags, aliases);
    }

    private Map<Long, List<PublicNameTagDto>> tagsByNameId(Collection<Long> nameIds) {
        if (nameIds == null || nameIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<PublicNameTagDto>> result = new LinkedHashMap<>();
        for (NameTag tag : tagRepository.findByNameIdInOrderByNameIdAscTagAsc(nameIds)) {
            Long nameId = tag.getName().getId();
            result.computeIfAbsent(nameId, ignored -> new ArrayList<>()).add(toTagDto(tag));
        }
        return result;
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

    private Specification<NameEntity> matchesQuranFlag(Boolean quranFlag) {
        if (quranFlag == null) {
            return Specification.where(null);
        }
        return (root, query, cb) -> cb.equal(root.get("quranFlag"), quranFlag);
    }

    private PublicNameListItemDto toListDto(NameEntity entity, List<PublicNameTagDto> tags) {
        return new PublicNameListItemDto(
                entity.getId(),
                entity.getName(),
                entity.getNormalizedName(),
                entity.getGender(),
                entity.getOrigin(),
                entity.getMeaningShort(),
                entity.getQuranFlag(),
                entity.getStatus(),
                tags
        );
    }

    private PublicNameDetailDto toDetailDto(NameEntity entity, List<PublicNameTagDto> tags, List<PublicNameAliasDto> aliases) {
        return new PublicNameDetailDto(
                entity.getId(),
                entity.getName(),
                entity.getNormalizedName(),
                entity.getGender(),
                entity.getOrigin(),
                entity.getMeaningShort(),
                entity.getMeaningLong(),
                entity.getCharacterTraitsText(),
                entity.getLetterAnalysisText(),
                entity.getQuranFlag(),
                entity.getStatus(),
                tags,
                aliases,
                entity.getUpdatedAt()
        );
    }

    private PublicNameTagDto toTagDto(NameTag tag) {
        return new PublicNameTagDto(
                tag.getId(),
                tag.getTagGroup(),
                tag.getTag(),
                tag.getSource(),
                tag.getConfidence()
        );
    }

    private PublicNameAliasDto toAliasDto(NameAlias alias) {
        return new PublicNameAliasDto(
                alias.getId(),
                alias.getAliasName(),
                alias.getAliasType() != null ? alias.getAliasType().name() : null
        );
    }
}
