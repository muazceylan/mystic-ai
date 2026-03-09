package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParsedNameCandidateRepository extends JpaRepository<ParsedNameCandidate, Long> {

    Optional<ParsedNameCandidate> findByRawEntry(RawNameSourceEntry rawEntry);

    List<ParsedNameCandidate> findByNormalizedName(String normalizedName);

    List<ParsedNameCandidate> findByCanonicalNormalizedName(String canonicalNormalizedName);

    List<ParsedNameCandidate> findByCanonicalNameId(Long canonicalNameId);

    long countByCanonicalNameId(Long canonicalNameId);

    @Query("""
            select c
            from ParsedNameCandidate c
            join fetch c.rawEntry re
            where c.canonicalNormalizedName = :canonicalNormalizedName
            """)
    List<ParsedNameCandidate> findByCanonicalNormalizedNameWithRawEntry(
            @Param("canonicalNormalizedName") String canonicalNormalizedName
    );

    @Query("""
            select c
            from ParsedNameCandidate c
            join fetch c.rawEntry re
            where c.canonicalNormalizedName in :canonicalNormalizedNames
            """)
    List<ParsedNameCandidate> findByCanonicalNormalizedNameInWithRawEntry(
            @Param("canonicalNormalizedNames") Collection<String> canonicalNormalizedNames
    );

    @Query("""
            select distinct c.canonicalNormalizedName
            from ParsedNameCandidate c
            where c.canonicalNormalizedName is not null and c.canonicalNormalizedName <> ''
            """)
    List<String> findDistinctCanonicalNormalizedNames();

    @Query("""
            select c
            from ParsedNameCandidate c
            join fetch c.rawEntry re
            where c.normalizedName = :normalizedName
            """)
    List<ParsedNameCandidate> findByNormalizedNameWithRawEntry(@Param("normalizedName") String normalizedName);

    @Query("""
            select c
            from ParsedNameCandidate c
            join fetch c.rawEntry re
            where c.normalizedName in :normalizedNames
            """)
    List<ParsedNameCandidate> findByNormalizedNameInWithRawEntry(@Param("normalizedNames") Collection<String> normalizedNames);

    List<ParsedNameCandidate> findByIdIn(Collection<Long> ids);

    @Query("""
            select c
            from ParsedNameCandidate c
            join fetch c.rawEntry re
            where c.id in :ids
            """)
    List<ParsedNameCandidate> findByIdInWithRawEntry(@Param("ids") Collection<Long> ids);

    Page<ParsedNameCandidate> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            select c
            from ParsedNameCandidate c
            where c.rawEntry.checksum = :checksum
              and c.normalizedName <> :normalizedName
            """)
    List<ParsedNameCandidate> findPotentialDuplicateCandidates(
            @Param("checksum") String checksum,
            @Param("normalizedName") String normalizedName
    );

    @Query("""
            select c
            from ParsedNameCandidate c
            where c.normalizedName = :normalizedName
              and c.rawEntry.sourceName = :sourceName
            """)
    List<ParsedNameCandidate> findByNormalizedNameAndSource(
            @Param("normalizedName") String normalizedName,
            @Param("sourceName") SourceName sourceName
    );
}
