package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RawNameSourceEntryRepository extends JpaRepository<RawNameSourceEntry, Long> {

    Optional<RawNameSourceEntry> findBySourceNameAndSourceUrlAndChecksum(
            SourceName sourceName,
            String sourceUrl,
            String checksum
    );

    Optional<RawNameSourceEntry> findTopBySourceNameAndSourceUrlOrderByFetchedAtDesc(
            SourceName sourceName,
            String sourceUrl
    );

    Page<RawNameSourceEntry> findBySourceName(SourceName sourceName, Pageable pageable);
}
