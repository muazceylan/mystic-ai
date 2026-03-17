package com.mysticai.auth.scheduler;

import com.mysticai.auth.service.GuestUserCleanupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that runs once per day (at 03:00 UTC) to remove stale guest accounts.
 *
 * <p>The schedule can be overridden via the environment variable
 * {@code GUEST_CLEANUP_CRON} (e.g. {@code "0 0 3 * * ?"} is the default).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GuestUserCleanupScheduler {

    private final GuestUserCleanupService guestUserCleanupService;

    @Scheduled(cron = "${guest.cleanup.cron:0 0 3 * * ?}")
    public void runDailyCleanup() {
        log.info("Guest cleanup job started");
        try {
            int deleted = guestUserCleanupService.purgeStaleGuestAccounts();
            log.info("Guest cleanup job finished: deleted={}", deleted);
        } catch (Exception e) {
            log.error("Guest cleanup job failed", e);
        }
    }
}
