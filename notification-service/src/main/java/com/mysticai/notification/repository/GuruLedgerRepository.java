package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.GuruLedger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface GuruLedgerRepository extends JpaRepository<GuruLedger, UUID> {

    Page<GuruLedger> findAllByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<GuruLedger> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    boolean existsByUserIdAndTransactionType(Long userId, GuruLedger.TransactionType type);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM GuruLedger l WHERE l.userId = :userId AND l.transactionType = :type")
    long sumAmountByUserIdAndTransactionType(Long userId, GuruLedger.TransactionType type);

    @Query("SELECT COUNT(l) FROM GuruLedger l WHERE l.userId = :userId AND l.sourceType = :sourceType AND l.createdAt >= :since")
    long countByUserIdAndSourceTypeSince(Long userId, GuruLedger.SourceType sourceType, LocalDateTime since);

    @Query("""
            SELECT COUNT(l)
            FROM GuruLedger l
            WHERE l.userId = :userId
              AND l.moduleKey = :moduleKey
              AND l.actionKey = :actionKey
              AND l.transactionType = :type
              AND l.createdAt >= :since
            """)
    long countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
            Long userId,
            String moduleKey,
            String actionKey,
            GuruLedger.TransactionType type,
            LocalDateTime since
    );
}
