package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Single eligibility gate for all notification dispatch decisions.
 * Every scheduler job and generation service passes through here before
 * creating or sending any notification.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatchService {

    private static final int MAX_DAILY_PUSH_LOW = 1;
    private static final int MAX_DAILY_PUSH_BALANCED = 2;
    private static final int MAX_DAILY_PUSH_FREQUENT = 4;

    private final NotificationRepository notificationRepository;

    public enum DispatchDecision {
        /** Send push + save in-app */
        PUSH_AND_IN_APP,
        /** Skip push, save in-app only */
        IN_APP_ONLY,
        /** Suppress entirely — do not create a notification record */
        DENY
    }

    /**
     * Evaluate whether and how a notification should be dispatched for a user.
     *
     * @param userId  target user
     * @param type    notification type requested
     * @param pref    the user's current preferences (never null; use defaults if no record exists)
     * @return dispatch decision
     */
    public DispatchDecision evaluate(Long userId, NotificationType type, NotificationPreference pref) {
        // 1. User preference gate
        if (!isTypeEnabled(pref, type)) {
            log.debug("[DISPATCH] DENY type={} userId={} reason=preference_disabled", type, userId);
            return DispatchDecision.DENY;
        }

        // 2. Dedup gate — one notification per type per day
        String dedupKey = buildDedupKey(userId, type);
        if (notificationRepository.findByDedupKey(dedupKey).isPresent()) {
            log.debug("[DISPATCH] DENY type={} userId={} reason=duplicate dedupKey={}", type, userId, dedupKey);
            return DispatchDecision.DENY;
        }

        // 3. Quiet hours gate — only suppress push, not creation
        if (isInQuietHours(pref)) {
            log.debug("[DISPATCH] IN_APP_ONLY type={} userId={} reason=quiet_hours", type, userId);
            return DispatchDecision.IN_APP_ONLY;
        }

        // 4. Preferred time slot gate — keep in-app record, skip off-slot push
        if (!isWithinPreferredTimeSlot(pref, type)) {
            log.debug("[DISPATCH] IN_APP_ONLY type={} userId={} reason=preferred_time_slot", type, userId);
            return DispatchDecision.IN_APP_ONLY;
        }

        // 5. Push enabled gate
        if (!pref.isPushEnabled()) {
            return DispatchDecision.IN_APP_ONLY;
        }

        // 6. Daily push limit gate
        long pushesToday = notificationRepository.countPushSentSince(userId, LocalDate.now().atStartOfDay());
        int dailyPushLimit = resolveDailyPushLimit(pref);
        if (pushesToday >= dailyPushLimit) {
            log.debug("[DISPATCH] IN_APP_ONLY type={} userId={} reason=daily_limit pushesToday={}", type, userId, pushesToday);
            return DispatchDecision.IN_APP_ONLY;
        }

        return DispatchDecision.PUSH_AND_IN_APP;
    }

    public String buildDedupKey(Long userId, NotificationType type) {
        return userId + ":" + type.name() + ":" + LocalDate.now();
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private boolean isTypeEnabled(NotificationPreference pref, NotificationType type) {
        return switch (type) {
            case DAILY_SUMMARY, MINI_INSIGHT, NUMEROLOGY_CHECKIN -> pref.isDailyEnabled();
            case ENERGY_UPDATE -> pref.isIntradayEnabled();
            case WEEKLY_SUMMARY -> pref.isWeeklyEnabled();
            case PLANNER_REMINDER -> pref.isPlannerReminderEnabled();
            case PRAYER_REMINDER -> pref.isPrayerReminderEnabled();
            case MEDITATION_REMINDER -> pref.isMeditationReminderEnabled();
            case DREAM_REMINDER -> pref.isDreamReminderEnabled();
            case EVENING_CHECKIN -> pref.isEveningCheckinEnabled();
            case PRODUCT_UPDATE -> pref.isProductUpdatesEnabled();
            // System / behavioral types always pass preference gate
            case AI_ANALYSIS_COMPLETE, COMPATIBILITY_UPDATE, RE_ENGAGEMENT -> true;
        };
    }

    private int resolveDailyPushLimit(NotificationPreference pref) {
        if (pref == null || pref.getFrequencyLevel() == null) {
            return MAX_DAILY_PUSH_BALANCED;
        }
        return switch (pref.getFrequencyLevel()) {
            case LOW -> MAX_DAILY_PUSH_LOW;
            case FREQUENT -> MAX_DAILY_PUSH_FREQUENT;
            case BALANCED -> MAX_DAILY_PUSH_BALANCED;
        };
    }

    private boolean isWithinPreferredTimeSlot(NotificationPreference pref, NotificationType type) {
        if (pref == null || pref.getPreferredTimeSlot() == null) {
            return true;
        }

        NotificationPreference.TimeSlot preferredSlot = pref.getPreferredTimeSlot();
        NotificationPreference.TimeSlot typeSlot = resolveTypeTimeSlot(type);

        if (typeSlot == null) {
            return true;
        }

        return preferredSlot == typeSlot;
    }

    private NotificationPreference.TimeSlot resolveTypeTimeSlot(NotificationType type) {
        return switch (type) {
            case DAILY_SUMMARY, DREAM_REMINDER, PRAYER_REMINDER, PLANNER_REMINDER, WEEKLY_SUMMARY ->
                    NotificationPreference.TimeSlot.MORNING;
            case ENERGY_UPDATE, MINI_INSIGHT, NUMEROLOGY_CHECKIN, RE_ENGAGEMENT ->
                    NotificationPreference.TimeSlot.NOON;
            case MEDITATION_REMINDER, EVENING_CHECKIN, PRODUCT_UPDATE ->
                    NotificationPreference.TimeSlot.EVENING;
            case AI_ANALYSIS_COMPLETE, COMPATIBILITY_UPDATE -> null;
        };
    }

    private boolean isInQuietHours(NotificationPreference pref) {
        try {
            ZoneId zone = ZoneId.of(pref.getTimezone());
            LocalTime now = LocalTime.now(zone);
            LocalTime start = pref.getQuietHoursStart();
            LocalTime end = pref.getQuietHoursEnd();
            // crosses midnight (e.g. 22:30 → 08:00)
            if (start.isAfter(end)) {
                return now.isAfter(start) || now.isBefore(end);
            }
            return now.isAfter(start) && now.isBefore(end);
        } catch (Exception e) {
            return false;
        }
    }
}
