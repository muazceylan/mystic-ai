package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameMergeQueue;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NameMergeQueueRepository extends JpaRepository<NameMergeQueue, Long>, JpaSpecificationExecutor<NameMergeQueue> {

    Optional<NameMergeQueue> findByCanonicalName(String canonicalName);

    Page<NameMergeQueue> findByReviewStatusOrderByUpdatedAtDesc(MergeReviewStatus reviewStatus, Pageable pageable);

    Page<NameMergeQueue> findByReviewStatusInOrderByUpdatedAtDesc(Collection<MergeReviewStatus> reviewStatuses, Pageable pageable);

    Page<NameMergeQueue> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    long countByReviewStatusIn(Collection<MergeReviewStatus> reviewStatuses);

    List<NameMergeQueue> findByReviewStatusInAndAutoMergeEligibleTrueOrderByUpdatedAtAsc(
            Collection<MergeReviewStatus> reviewStatuses
    );

    List<NameMergeQueue> findByIdInAndReviewStatusInAndAutoMergeEligibleTrueOrderByUpdatedAtAsc(
            Collection<Long> ids,
            Collection<MergeReviewStatus> reviewStatuses
    );

    @Query("""
            select count(distinct q.id)
            from NameMergeQueue q
            where q.reviewStatus in :reviewStatuses
              and exists (
                select 1
                from ParsedNameCandidate c
                where c.canonicalNormalizedName = q.canonicalName
                  and c.rawEntry.sourceName = :sourceName
              )
            """)
    long countActiveBacklogForSource(
            @Param("sourceName") SourceName sourceName,
            @Param("reviewStatuses") Collection<MergeReviewStatus> reviewStatuses
    );
}
