package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NameAliasRepository extends JpaRepository<NameAlias, Long> {

    Optional<NameAlias> findByNormalizedAliasName(String normalizedAliasName);

    Page<NameAlias> findByCanonicalNameIdOrderByUpdatedAtDesc(Long canonicalNameId, Pageable pageable);

    List<NameAlias> findByCanonicalNameIdOrderByAliasNameAsc(Long canonicalNameId);

    boolean existsByCanonicalNameIdAndNormalizedAliasName(Long canonicalNameId, String normalizedAliasName);

    Optional<NameAlias> findByCanonicalNameAndNormalizedAliasName(NameEntity canonicalName, String normalizedAliasName);

    @Query("""
            select a.canonicalName.id as canonicalNameId, count(a.id) as aliasCount
            from NameAlias a
            where a.canonicalName.id in :canonicalNameIds
            group by a.canonicalName.id
            """)
    List<CanonicalAliasCountProjection> countByCanonicalNameIds(@Param("canonicalNameIds") Collection<Long> canonicalNameIds);

    interface CanonicalAliasCountProjection {
        Long getCanonicalNameId();

        long getAliasCount();
    }
}
