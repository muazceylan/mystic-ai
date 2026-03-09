package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameTag;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NameTagRepository extends JpaRepository<NameTag, Long> {

    List<NameTag> findByNameIdOrderByTagAsc(Long nameId);

    List<NameTag> findByNameIdOrderByTagGroupAscTagAsc(Long nameId);

    Optional<NameTag> findByIdAndNameId(Long id, Long nameId);

    boolean existsByNameIdAndNormalizedTag(Long nameId, String normalizedTag);

    boolean existsByNameIdAndTagGroupAndNormalizedTag(Long nameId, NameTagGroup tagGroup, String normalizedTag);

    long deleteByNameIdAndSource(Long nameId, NameTagSource source);

    List<NameTag> findByNameIdInOrderByNameIdAscTagAsc(Collection<Long> nameIds);
}
