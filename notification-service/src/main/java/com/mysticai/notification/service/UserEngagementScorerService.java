package com.mysticai.notification.service;

import com.mysticai.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Calculates a simple engagement score per user to drive smarter
 * re-engagement decisions. Uses existing notification records as signals.
 *
 * Scoring signals:
 *  - Days since last notification created (inactivity)
 *  - Push read rate in last 7 days (how many pushes were actually opened)
 *  - Whether last 24h already had a notification sent
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserEngagementScorerService {

    private final NotificationRepository notificationRepository;

    public enum UserSegment {
        /** Account created <7 days ago or <3 notifications ever */
        NEW_USER,
        /** Uses app regularly, good open rate */
        ACTIVE,
        /** Was active but inactive 3-14 days */
        PASSIVE,
        /** High engagement, frequent opens */
        POWER_USER
    }

    /**
     * Determines whether a re-engagement notification is worth sending.
     * Returns false if the user is already active or was recently contacted.
     */
    public boolean shouldReEngage(Long userId) {
        Optional<LocalDateTime> lastNotif = notificationRepository.findLastNotificationDateByUserId(userId);

        // No history at all — treat as new
        if (lastNotif.isEmpty()) {
            return false;
        }

        LocalDateTime lastDate = lastNotif.get();
        LocalDateTime now = LocalDateTime.now();
        long daysSinceLast = java.time.temporal.ChronoUnit.DAYS.between(lastDate.toLocalDate(), now.toLocalDate());

        // Not inactive enough — don't re-engage
        if (daysSinceLast < 3) {
            log.debug("[REENGAGEMENT] SKIP userId={} reason=too_recent daysSince={}", userId, daysSinceLast);
            return false;
        }

        // Already very long inactive (>30d) — low value, skip to avoid spam
        if (daysSinceLast > 30) {
            log.debug("[REENGAGEMENT] SKIP userId={} reason=too_stale daysSince={}", userId, daysSinceLast);
            return false;
        }

        // Check push open rate in last 7 days
        LocalDateTime weekAgo = now.minusDays(7);
        long pushSent = notificationRepository.countPushSentInWindow(userId, weekAgo);
        long pushRead = notificationRepository.countReadSince(userId, weekAgo);

        // If they received pushes but opened none, stop sending
        if (pushSent >= 3 && pushRead == 0) {
            log.debug("[REENGAGEMENT] SKIP userId={} reason=ignored_pushes sent={} read={}", userId, pushSent, pushRead);
            return false;
        }

        // Already got a notification in last 24h — don't pile on
        long recentNotifs = notificationRepository.countPushSentSince(userId, now.minusHours(24));
        if (recentNotifs > 0) {
            log.debug("[REENGAGEMENT] SKIP userId={} reason=notified_recently", userId);
            return false;
        }

        log.debug("[REENGAGEMENT] ALLOW userId={} daysSince={} pushSent={} pushRead={}", userId, daysSinceLast, pushSent, pushRead);
        return true;
    }

    /**
     * Classify user into a segment for targeting and personalization.
     */
    public UserSegment getSegment(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        long pushLast7d = notificationRepository.countPushSentInWindow(userId, now.minusDays(7));
        long readLast7d = notificationRepository.countReadSince(userId, now.minusDays(7));

        Optional<LocalDateTime> lastNotif = notificationRepository.findLastNotificationDateByUserId(userId);
        long daysSinceLastNotif = lastNotif.map(d ->
                java.time.temporal.ChronoUnit.DAYS.between(d.toLocalDate(), now.toLocalDate())
        ).orElse(999L);

        if (daysSinceLastNotif > 14) return UserSegment.PASSIVE;

        // Open rate > 60% and frequent = power user
        if (pushLast7d >= 5 && readLast7d >= 3) return UserSegment.POWER_USER;

        // Active: received and opened at least once this week
        if (pushLast7d >= 1 && readLast7d >= 1) return UserSegment.ACTIVE;

        // Very few notifications = new or rarely targeted
        if (pushLast7d < 2) return UserSegment.NEW_USER;

        return UserSegment.PASSIVE;
    }
}
