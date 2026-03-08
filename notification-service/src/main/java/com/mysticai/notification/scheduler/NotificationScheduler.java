package com.mysticai.notification.scheduler;

import com.mysticai.notification.entity.Notification.NotificationType;
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

    /** Morning daily notification - 08:30 every day */
    @Scheduled(cron = "0 30 8 * * *")
    public void generateDailyNotifications() {
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
    }

    /** Dream reminder - 08:00 every morning */
    @Scheduled(cron = "0 0 8 * * *")
    public void generateDreamReminders() {
        log.info("Running dream reminder generation");
        generateForAll(NotificationType.DREAM_REMINDER);
    }

    /** Prayer reminder - 06:00 every day */
    @Scheduled(cron = "0 0 6 * * *")
    public void generatePrayerReminders() {
        log.info("Running prayer reminder generation");
        generateForAll(NotificationType.PRAYER_REMINDER);
    }

    /** Planner reminder - 07:30 every day */
    @Scheduled(cron = "0 30 7 * * *")
    public void generatePlannerReminders() {
        log.info("Running planner reminder generation");
        generateForAll(NotificationType.PLANNER_REMINDER);
    }

    /** Meditation reminder - 20:00 every day */
    @Scheduled(cron = "0 0 20 * * *")
    public void generateMeditationReminders() {
        log.info("Running meditation reminder generation");
        generateForAll(NotificationType.MEDITATION_REMINDER);
    }

    /** Evening check-in - 21:00 every day */
    @Scheduled(cron = "0 0 21 * * *")
    public void generateEveningCheckins() {
        log.info("Running evening check-in generation");
        generateForAll(NotificationType.EVENING_CHECKIN);
    }

    /** Weekly summary - Monday at 09:00 */
    @Scheduled(cron = "0 0 9 * * MON")
    public void generateWeeklySummary() {
        log.info("Running weekly summary generation");
        generateForAll(NotificationType.WEEKLY_SUMMARY);
    }

    /** Re-engagement - Tuesday & Friday at 10:00 for passive users only */
    @Scheduled(cron = "0 0 10 * * TUE,FRI")
    public void generateReEngagement() {
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
    }

    /** Cleanup expired notifications - every day at 03:00 */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredNotifications() {
        log.info("Running expired notification cleanup");
        notificationRepository.deleteExpiredNotifications(LocalDateTime.now());
    }

    /** Cleanup inactive push tokens older than 30 days - Sunday at 04:00 */
    @Scheduled(cron = "0 0 4 * * SUN")
    @Transactional
    public void cleanupInactiveTokens() {
        log.info("Running inactive push token cleanup");
        pushTokenRepository.deleteInactiveOlderThan(LocalDateTime.now().minusDays(30));
    }

    private void generateForAll(NotificationType type) {
        List<Long> userIds = getDistinctActiveUserIds();
        for (Long userId : userIds) {
            try {
                generationService.generateNotification(userId, type, null);
            } catch (Exception e) {
                log.warn("Failed {} for user {}: {}", type, userId, e.getMessage());
            }
        }
    }

    private List<Long> getDistinctActiveUserIds() {
        return pushTokenRepository.findAllByActiveTrue().stream()
                .map(PushToken::getUserId)
                .distinct()
                .collect(Collectors.toList());
    }
}
