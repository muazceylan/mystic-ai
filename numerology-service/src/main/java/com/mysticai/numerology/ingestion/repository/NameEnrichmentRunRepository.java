package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameEnrichmentRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NameEnrichmentRunRepository extends JpaRepository<NameEnrichmentRun, Long> {

    Page<NameEnrichmentRun> findAllByOrderByStartedAtDesc(Pageable pageable);
}
