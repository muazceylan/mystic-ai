package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.RewardIntent;
import com.mysticai.notification.entity.monetization.RewardIntentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RewardIntentRepository extends JpaRepository<RewardIntent, UUID> {

    /** Pessimistic lock — used during claim to prevent concurrent claims on same intent. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RewardIntent r WHERE r.id = :id")
    Optional<RewardIntent> findByIdForUpdate(@Param("id") UUID id);

    /** Count non-terminal, non-expired pending intents for a user (tab/session abuse guard). */
    @Query("""
        SELECT COUNT(r) FROM RewardIntent r
        WHERE r.userId = :userId
          AND r.status IN ('PENDING', 'AD_READY', 'AD_SHOWN', 'GRANTED')
          AND r.expiresAt > :now
        """)
    long countActiveIntents(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Count claimed intents in the last N hours for daily/hourly cap enforcement. */
    @Query("""
        SELECT COUNT(r) FROM RewardIntent r
        WHERE r.userId = :userId
          AND r.status = 'CLAIMED'
          AND r.claimedAt >= :since
        """)
    long countClaimedSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    /** Count claimed intents since midnight today (UTC) for daily cap. */
    @Query("""
        SELECT COUNT(r) FROM RewardIntent r
        WHERE r.userId = :userId
          AND r.status = 'CLAIMED'
          AND r.claimedAt >= :dayStart
        """)
    long countClaimedToday(@Param("userId") Long userId, @Param("dayStart") LocalDateTime dayStart);

    /** Used to detect replay: same adSessionId already granted for this user. */
    boolean existsByUserIdAndAdSessionIdAndStatus(Long userId, String adSessionId, RewardIntentStatus status);

    /** Mark all expired PENDING/AD_READY intents as EXPIRED (scheduled cleanup). */
    @Modifying
    @Query("""
        UPDATE RewardIntent r SET r.status = 'EXPIRED', r.updatedAt = :now
        WHERE r.status IN ('PENDING', 'AD_READY', 'AD_SHOWN', 'GRANTED')
          AND r.expiresAt < :now
        """)
    int expireStaleIntents(@Param("now") LocalDateTime now);

    /** Recent intents for fraud analysis (same IP hash). */
    @Query("""
        SELECT r FROM RewardIntent r
        WHERE r.ipHash = :ipHash
          AND r.status = 'CLAIMED'
          AND r.claimedAt >= :since
        ORDER BY r.claimedAt DESC
        """)
    List<RewardIntent> findRecentClaimedByIpHash(
        @Param("ipHash") String ipHash,
        @Param("since") LocalDateTime since
    );
}
