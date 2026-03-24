package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DreamEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DreamEntryRepository extends JpaRepository<DreamEntry, Long> {

    List<DreamEntry> findAllByUserIdOrderByDreamDateDescCreatedAtDesc(Long userId);

    Optional<DreamEntry> findByCorrelationId(UUID correlationId);

    List<DreamEntry> findAllByUserIdAndDreamDateBetweenOrderByDreamDateAsc(
            Long userId, LocalDate start, LocalDate end);
}
