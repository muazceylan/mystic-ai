package com.mysticai.astrology.repository;

import com.mysticai.astrology.dto.DreamExpansionType;
import com.mysticai.astrology.entity.DreamAnalysisExpansion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DreamAnalysisExpansionRepository extends JpaRepository<DreamAnalysisExpansion, UUID> {

    Optional<DreamAnalysisExpansion> findByIdempotencyKey(String idempotencyKey);

    Optional<DreamAnalysisExpansion>
    findFirstByUserIdAndDreamIdAndExpansionTypeAndTargetHashAndStatusOrderByCreatedAtDesc(
            Long userId, Long dreamId, DreamExpansionType expansionType, String targetHash, String status);

    List<DreamAnalysisExpansion> findAllByUserIdAndDreamIdAndStatusOrderByCreatedAtAsc(
            Long userId, Long dreamId, String status);
}
