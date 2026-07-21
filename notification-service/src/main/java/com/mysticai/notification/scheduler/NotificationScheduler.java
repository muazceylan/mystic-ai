package com.mysticai.notification.scheduler;

import com.mysticai.notification.admin.service.NotificationTriggerService;
import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.repository.NotificationPreferenceRepository;
import com.mysticai.notification.repository.PushTokenRepository;
import com.mysticai.notification.service.NotificationGenerationService;
import com.mysticai.notification.service.UserEngagementScorerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    /**
     * Local-time tick interval. All world timezone offsets are multiples of 15
     * minutes, so a 15-minute tick with a [target, target+15) window fires each
     * job exactly once per user per local day.
     */
    private static final int TICK_MINUTES = 15;

    private final NotificationGenerationService generationService;
    private final UserEngagementScorerService engagementScorer;
    private final PushTokenRepository pushTokenRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationTriggerService triggerService;

    /** Overridable in tests to make local-time window matching deterministic. */
    private Clock clock = Clock.systemDefaultZone();

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    /**
     * A generation job that should fire at a fixed time in each user's own timezone.
     *
     * @param daysOfWeek restricts firing to these local days; null = every day
     * @param reEngagementOnly additionally requires the engagement scorer's re-engage signal
     */
    private record LocalTimeJob(
            String triggerKey,
            NotificationType type,
            LocalTime targetTime,
            Set<DayOfWeek> daysOfWeek,
            boolean reEngagementOnly
    ) {}

    private static final List<LocalTimeJob> LOCAL_TIME_JOBS = List.of(
            new LocalTimeJob("prayer_reminder_job", NotificationType.PRAYER_REMINDER, LocalTime.of(6, 0), null, false),
            new LocalTimeJob("planner_reminder_job", NotificationType.PLANNER_REMINDER, LocalTime.of(7, 30), null, false),
            new LocalTimeJob("daily_notification_generation", NotificationType.DAILY_SUMMARY, LocalTime.of(8, 30), null, false),
            new LocalTimeJob("numerology_checkin_job", NotificationType.NUMEROLOGY_CHECKIN, LocalTime.of(12, 15), null, false),
            new LocalTimeJob("energy_update_job", NotificationType.ENERGY_UPDATE, LocalTime.of(14, 0), null, false),
            new LocalTimeJob("mini_insight_job", NotificationType.MINI_INSIGHT, LocalTime.of(16, 30), null, false),
            new LocalTimeJob("meditation_reminder_job", NotificationType.MEDITATION_REMINDER, LocalTime.of(20, 0), null, false),
            new LocalTimeJob("evening_checkin_job", NotificationType.EVENING_CHECKIN, LocalTime.of(21, 0), null, false),
            new LocalTimeJob("weekly_summary_job", NotificationType.WEEKLY_SUMMARY, LocalTime.of(9, 0),
                    Set.of(DayOfWeek.MONDAY), false),
            new LocalTimeJob("re_engagement_job", NotificationType.RE_ENGAGEMENT, LocalTime.of(10, 0),
                    Set.of(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY), true),
            new LocalTimeJob("product_update_job", NotificationType.PRODUCT_UPDATE, LocalTime.of(18, 30),
                    Set.of(DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY), false)
    );

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

    /**
     * Single tick for all user-local-time generation jobs. Each job fires for a
     * user when that user's local clock enters the job's target window, so a user
     * in Berlin and a user in Istanbul both get the daily summary at 08:30 their
     * own time. Users without a stored preference fall back to the default
     * timezone ({@link NotificationPreference#DEFAULT_TIMEZONE}).
     */
    @Scheduled(cron = "0 0/15 * * * *")
    public void generateUserLocalTimeNotifications() {
        Map<Long, ZoneId> zones = loadUserZones();
        List<Long> userIds = getDistinctActiveUserIds();
        Instant now = clock.instant();
        ZoneId defaultZone = safeZone(NotificationPreference.DEFAULT_TIMEZONE, ZoneId.systemDefault());

        for (LocalTimeJob job : LOCAL_TIME_JOBS) {
            // Silent skip: recording SKIPPED on every 15-min tick would flood run history
            if (!triggerService.isActive(job.triggerKey())) {
                continue;
            }
            int matched = 0;
            int produced = 0;
            for (Long userId : userIds) {
                ZonedDateTime localNow = now.atZone(zones.getOrDefault(userId, defaultZone));
                if (!isInLocalWindow(localNow, job)) {
                    continue;
                }
                matched++;
                try {
                    if (job.reEngagementOnly() && !engagementScorer.shouldReEngage(userId)) {
                        continue;
                    }
                    if (generationService.generateNotification(userId, job.type(), null).isPresent()) {
                        produced++;
                    }
                } catch (Exception e) {
                    log.warn("Failed {} for user {}: {}", job.type(), userId, e.getMessage());
                }
            }
            if (matched > 0) {
                log.info("Local-time job {} produced {}/{} matched users", job.triggerKey(), produced, matched);
                triggerService.recordRun(
                        job.triggerKey(),
                        NotificationTrigger.RunStatus.SUCCESS,
                        produced,
                        produced + "/" + matched + " users in local " + job.targetTime() + " window"
                );
            }
        }
    }

    private boolean isInLocalWindow(ZonedDateTime localNow, LocalTimeJob job) {
        if (job.daysOfWeek() != null && !job.daysOfWeek().contains(localNow.getDayOfWeek())) {
            return false;
        }
        LocalTime time = localNow.toLocalTime();
        return !time.isBefore(job.targetTime()) && time.isBefore(job.targetTime().plusMinutes(TICK_MINUTES));
    }

    private Map<Long, ZoneId> loadUserZones() {
        Map<Long, ZoneId> zones = new HashMap<>();
        ZoneId defaultZone = safeZone(NotificationPreference.DEFAULT_TIMEZONE, ZoneId.systemDefault());
        for (Object[] row : preferenceRepository.findUserTimezones()) {
            Long userId = (Long) row[0];
            String timezone = (String) row[1];
            if (userId != null) {
                zones.put(userId, safeZone(timezone, defaultZone));
            }
        }
        return zones;
    }

    private ZoneId safeZone(String timezone, ZoneId fallback) {
        if (timezone == null || timezone.isBlank()) {
            return fallback;
        }
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            return fallback;
        }
    }

    /**
     * Dream reminders are generated opportunistically on the user's first
     * morning app open so they align with real wake-up behavior instead of a fixed
     * 08:00 cron. The scheduled job remains as an operational breadcrumb.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void generateDreamReminders() {
        final String key = "dream_reminder_job";
        if (skipIfDisabled(key)) return;
        log.info("Dream reminder cron skipped; reminders are handled on first morning app open");
        triggerService.recordRun(
                key,
                NotificationTrigger.RunStatus.SKIPPED,
                0,
                "Handled opportunistically on first morning app open"
        );
    }

    /** Cleanup expired notifications - every day at 03:00 (server time) */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredNotifications() {
        log.info("Running expired notification cleanup");
        notificationRepository.deleteExpiredNotifications(LocalDateTime.now());
        triggerService.recordRun("cleanup_expired_notifications", NotificationTrigger.RunStatus.SUCCESS, 0, null);
    }

    /** Cleanup inactive push tokens older than 30 days - Sunday at 04:00 (server time) */
    @Scheduled(cron = "0 0 4 * * SUN")
    @Transactional
    public void cleanupInactiveTokens() {
        log.info("Running inactive push token cleanup");
        pushTokenRepository.deleteInactiveOlderThan(LocalDateTime.now().minusDays(30));
        triggerService.recordRun("cleanup_inactive_tokens", NotificationTrigger.RunStatus.SUCCESS, 0, null);
    }

    private List<Long> getDistinctActiveUserIds() {
        return Stream.of(
                    pushTokenRepository.findDistinctActiveUserIds(),
                    preferenceRepository.findDistinctUserIds(),
                    notificationRepository.findDistinctUserIds()
                )
                .flatMap(List::stream)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
}
