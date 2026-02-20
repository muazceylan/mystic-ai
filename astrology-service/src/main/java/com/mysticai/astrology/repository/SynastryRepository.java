package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.Synastry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SynastryRepository extends JpaRepository<Synastry, Long> {

    List<Synastry> findAllByUserIdOrderByCalculatedAtDesc(Long userId);

    Optional<Synastry> findByCorrelationId(UUID correlationId);

    Optional<Synastry> findFirstByUserIdAndSavedPersonIdAndRelationshipTypeOrderByCalculatedAtDesc(
            Long userId, Long savedPersonId, String relationshipType);
}
