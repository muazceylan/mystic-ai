package com.mysticai.notification.scheduler;

import com.mysticai.notification.admin.service.NotificationTriggerService;
import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.entity.PushToken;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.repository.PushTokenRepository;
import com.mysticai.notification.service.NotificationGenerationService;
import com.mysticai.notification.service.UserEngagementScorerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final NotificationGenerationService generationService;
    private final UserEngagementScorerService engagementScorer;
    private final PushTokenRepository pushTokenRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationTriggerService triggerService;

    /**
     * Returns true and records SKIPPED if this trigger key is disabled in the registry.
     * Callers: {@code if (skipIfDisabled(key)) return;}
     */
    boolean skipIfDisabled(String key) {
        if (!triggerService.isActive(key)) {
            log.info("[TriggerMonitor] {} is disabled — skipping.", key);
            triggerService.recordRun(key, NotificationTrigger.RunStatus.SKIPPED, 0, "Disabled by admin");
            return true;
        }
        return false;
    }

    /** Morning daily notification - 08:30 every day */
    @Scheduled(cron = "0 30 8 * * *")
    public void generateDailyNotifications() {
        final String key = "daily_notification_generation";
        if (skipIfDisabled(key)) return;
        log.info("Running daily notification generation");
        List<Long> userIds = getDistinctActiveUserIds();
        int sent = 0;
        for (Long userId : userIds) {
            try {
                generationService.generateNotification(userId, NotificationType.DAILY_SUMMARY, null);
                sent++;
            } catch (Exception e) {
                log.warn("Failed daily notification for user {}: {}", userId, e.getMessage());
            }
        }
        log.info("Daily notifications: {}/{} users", sent, userIds.size());
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, sent, sent + "/" + userIds.size() + " users");
    }

    /** Dream reminder - 08:00 every morning */
    @Scheduled(cron = "0 0 8 * * *")
    public void generateDreamReminders() {
        final String key = "dream_reminder_job";
        if (skipIfDisabled(key)) return;
        log.info("Running dream reminder generation");
        int count = generateForAll(NotificationType.DREAM_REMINDER);
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, count, null);
    }

    /** Prayer reminder - 06:00 every day */
    @Scheduled(cron = "0 0 6 * * *")
    public void generatePrayerReminders() {
        final String key = "prayer_reminder_job";
        if (skipIfDisabled(key)) return;
        log.info("Running prayer reminder generation");
        int count = generateForAll(NotificationType.PRAYER_REMINDER);
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, count, null);
    }

    /** Planner reminder - 07:30 every day */
    @Scheduled(cron = "0 30 7 * * *")
    public void generatePlannerReminders() {
        final String key = "planner_reminder_job";
        if (skipIfDisabled(key)) return;
        log.info("Running planner reminder generation");
        int count = generateForAll(NotificationType.PLANNER_REMINDER);
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, count, null);
    }

    /** Meditation reminder - 20:00 every day */
    @Scheduled(cron = "0 0 20 * * *")
    public void generateMeditationReminders() {
        final String key = "meditation_reminder_job";
        if (skipIfDisabled(key)) return;
        log.info("Running meditation reminder generation");
        int count = generateForAll(NotificationType.MEDITATION_REMINDER);
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, count, null);
    }

    /** Evening check-in - 21:00 every day */
    @Scheduled(cron = "0 0 21 * * *")
    public void generateEveningCheckins() {
        final String key = "evening_checkin_job";
        if (skipIfDisabled(key)) return;
        log.info("Running evening check-in generation");
        int count = generateForAll(NotificationType.EVENING_CHECKIN);
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, count, null);
    }

    /** Weekly summary - Monday at 09:00 */
    @Scheduled(cron = "0 0 9 * * MON")
    public void generateWeeklySummary() {
        final String key = "weekly_summary_job";
        if (skipIfDisabled(key)) return;
        log.info("Running weekly summary generation");
        int count = generateForAll(NotificationType.WEEKLY_SUMMARY);
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, count, null);
    }

    /** Re-engagement - Tuesday & Friday at 10:00 for passive users only */
    @Scheduled(cron = "0 0 10 * * TUE,FRI")
    public void generateReEngagement() {
        final String key = "re_engagement_job";
        if (skipIfDisabled(key)) return;
        log.info("Running re-engagement notification generation");
        List<Long> userIds = getDistinctActiveUserIds();
        int eligible = 0;
        for (Long userId : userIds) {
            try {
                if (engagementScorer.shouldReEngage(userId)) {
                    generationService.generateNotification(userId, NotificationType.RE_ENGAGEMENT, null);
                    eligible++;
                }
            } catch (Exception e) {
                log.warn("Re-engagement check failed for user {}: {}", userId, e.getMessage());
            }
        }
        log.info("Re-engagement: {}/{} users eligible", eligible, userIds.size());
        triggerService.recordRun(key, NotificationTrigger.RunStatus.SUCCESS, eligible, eligible + " eligible of " + userIds.size());
    }

    /** Cleanup expired notifications - every day at 03:00 */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredNotifications() {
        log.info("Running expired notification cleanup");
        notificationRepository.deleteExpiredNotifications(LocalDateTime.now());
        triggerService.recordRun("cleanup_expired_notifications", NotificationTrigger.RunStatus.SUCCESS, 0, null);
    }

    /** Cleanup inactive push tokens older than 30 days - Sunday at 04:00 */
    @Scheduled(cron = "0 0 4 * * SUN")
    @Transactional
    public void cleanupInactiveTokens() {
        log.info("Running inactive push token cleanup");
        pushTokenRepository.deleteInactiveOlderThan(LocalDateTime.now().minusDays(30));
        triggerService.recordRun("cleanup_inactive_tokens", NotificationTrigger.RunStatus.SUCCESS, 0, null);
    }

    private int generateForAll(NotificationType type) {
        List<Long> userIds = getDistinctActiveUserIds();
        int count = 0;
        for (Long userId : userIds) {
            try {
                generationService.generateNotification(userId, type, null);
                count++;
            } catch (Exception e) {
                log.warn("Failed {} for user {}: {}", type, userId, e.getMessage());
            }
        }
        return count;
    }

    private List<Long> getDistinctActiveUserIds() {
        return pushTokenRepository.findAllByActiveTrue().stream()
                .map(PushToken::getUserId)
                .distinct()
                .collect(Collectors.toList());
    }
}
