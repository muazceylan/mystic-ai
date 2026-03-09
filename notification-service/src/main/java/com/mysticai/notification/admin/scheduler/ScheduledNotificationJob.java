package com.mysticai.notification.admin.scheduler;

import com.mysticai.notification.admin.service.NotificationTriggerService;
import com.mysticai.notification.admin.service.ScheduledNotificationDispatchService;
import com.mysticai.notification.entity.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Triggers dispatch of due admin-scheduled notifications.
 *
 * Runs every 60 seconds. Actual dispatch is handled by ScheduledNotificationDispatchService,
 * which uses pessimistic locking to prevent duplicate sends.
 *
 * Adjust cron via scheduled.admin-notification.cron property if needed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledNotificationJob {

    private final ScheduledNotificationDispatchService dispatchService;
    private final NotificationTriggerService triggerService;

    @Scheduled(fixedDelayString = "${scheduled.admin-notification.interval-ms:60000}")
    public void run() {
        log.debug("[SCHEDULED-DISPATCH-JOB] Checking for due notifications...");
        try {
            dispatchService.processDueNotifications();
            triggerService.recordRun("admin_scheduled_dispatch", NotificationTrigger.RunStatus.SUCCESS, 0, null);
        } catch (Exception e) {
            log.warn("[SCHEDULED-DISPATCH-JOB] Error during dispatch: {}", e.getMessage());
            triggerService.recordRun("admin_scheduled_dispatch", NotificationTrigger.RunStatus.FAILED, 0, e.getMessage());
        }
    }
}
