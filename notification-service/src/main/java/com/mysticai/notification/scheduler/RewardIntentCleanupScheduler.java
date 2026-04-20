package com.mysticai.notification.scheduler;

import com.mysticai.notification.service.rewarded.RewardedAdService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically marks stale reward intents as EXPIRED.
 * Runs every 2 minutes; keeps the reward_intent table clean and prevents
 * ghost PENDING rows from blocking new intent creation (maxParallelPendingIntents guard).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RewardIntentCleanupScheduler {

    private final RewardedAdService rewardedAdService;

    @Scheduled(fixedDelayString = "${rewarded-ads.cleanup-interval-ms:120000}")
    public void expireStaleIntents() {
        try {
            int expired = rewardedAdService.expireStaleIntents();
            if (expired > 0) {
                log.info("[CLEANUP] Expired {} stale reward intents", expired);
            }
        } catch (Exception e) {
            log.error("[CLEANUP] Failed to expire stale reward intents", e);
        }
    }
}
