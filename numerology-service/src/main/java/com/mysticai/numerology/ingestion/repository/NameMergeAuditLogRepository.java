package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameMergeAuditLog;
import com.mysticai.numerology.ingestion.model.ReviewQueueActionType;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;

public interface NameMergeAuditLogRepository extends JpaRepository<NameMergeAuditLog, Long> {

    Page<NameMergeAuditLog> findByCanonicalNameOrderByCreatedAtDesc(String canonicalName, Pageable pageable);

    Page<NameMergeAuditLog> findByQueueIdOrderByCreatedAtDesc(Long queueId, Pageable pageable);

    long countBySelectedSourceAndActionTypeInAndCreatedAtBetween(
            SourceName selectedSource,
            Collection<ReviewQueueActionType> actionTypes,
            LocalDateTime createdAtAfter,
            LocalDateTime createdAtBefore
    );
}
