package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.RewardSession;
import com.mysticai.notification.entity.monetization.RewardSessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RewardSessionRepository extends JpaRepository<RewardSession, UUID> {

    /**
     * Pessimistic lock used while processing a provider callback so two concurrent
     * callbacks for the same session serialise and cannot both grant a token.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM RewardSession s WHERE s.id = :id")
    Optional<RewardSession> findByIdForUpdate(@Param("id") UUID id);

    /** Sweep CREATED sessions whose TTL elapsed without a valid callback. */
    @Modifying
    @Query("""
        UPDATE RewardSession s SET s.status = 'EXPIRED', s.updatedAt = :now
        WHERE s.status = 'CREATED' AND s.expiresAt < :now
        """)
    int expireStaleSessions(@Param("now") LocalDateTime now);

    long countByUserIdAndStatusAndExpiresAtAfter(Long userId, RewardSessionStatus status, LocalDateTime now);

    @Query("""
        SELECT COUNT(s) FROM RewardSession s
        WHERE s.userId = :userId
          AND s.provider = :provider
          AND s.status IN ('CREATED', 'REWARDED')
          AND s.createdAt >= :since
        """)
    long countIssuedToday(
            @Param("userId") Long userId,
            @Param("provider") com.mysticai.notification.entity.monetization.RewardProvider provider,
            @Param("since") LocalDateTime since);
}
