package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.RewardedUnlockProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RewardedUnlockProgressRepository extends JpaRepository<RewardedUnlockProgress, UUID> {

    Optional<RewardedUnlockProgress> findFirstByUserIdAndModuleKeyAndActionKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
            Long userId,
            String moduleKey,
            String actionKey,
            RewardedUnlockProgress.Status status,
            LocalDateTime now
    );

    Optional<RewardedUnlockProgress> findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
            Long userId,
            String moduleKey,
            String actionKey,
            String contentKey,
            RewardedUnlockProgress.Status status,
            LocalDateTime now
    );

    Optional<RewardedUnlockProgress> findFirstByUserIdAndModuleKeyAndActionKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
            Long userId,
            String moduleKey,
            String actionKey,
            RewardedUnlockProgress.Status status,
            LocalDateTime now
    );

    Optional<RewardedUnlockProgress> findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
            Long userId,
            String moduleKey,
            String actionKey,
            String contentKey,
            RewardedUnlockProgress.Status status,
            LocalDateTime now
    );
}
