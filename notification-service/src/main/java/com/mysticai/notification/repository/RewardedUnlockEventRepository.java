package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.RewardedUnlockEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RewardedUnlockEventRepository extends JpaRepository<RewardedUnlockEvent, UUID> {

    Optional<RewardedUnlockEvent> findByClientEventId(String clientEventId);

    Optional<RewardedUnlockEvent> findByTransactionId(String transactionId);

    @Query("""
            SELECT COUNT(e)
            FROM RewardedUnlockEvent e
            WHERE e.userId = :userId
              AND e.moduleKey = :moduleKey
              AND e.actionKey = :actionKey
              AND e.eventType = 'AD_COMPLETED'
              AND e.createdAt >= :since
            """)
    long countCompletedSince(
            @Param("userId") Long userId,
            @Param("moduleKey") String moduleKey,
            @Param("actionKey") String actionKey,
            @Param("since") LocalDateTime since
    );

    Optional<RewardedUnlockEvent> findFirstByUserIdAndModuleKeyAndActionKeyAndEventTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
            Long userId,
            String moduleKey,
            String actionKey,
            RewardedUnlockEvent.EventType eventType,
            LocalDateTime since
    );

    Optional<RewardedUnlockEvent> findFirstByUserIdAndModuleKeyAndActionKeyAndEventTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            Long userId,
            String moduleKey,
            String actionKey,
            RewardedUnlockEvent.EventType eventType,
            LocalDateTime since
    );
}
