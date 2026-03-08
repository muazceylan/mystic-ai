package com.mysticai.notification.controller;

import com.mysticai.notification.dto.*;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.service.NotificationGenerationService;
import com.mysticai.notification.service.NotificationPreferenceService;
import com.mysticai.notification.service.PushService;
import com.mysticai.notification.service.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final WebSocketNotificationService notificationService;
    private final NotificationPreferenceService preferenceService;
    private final PushService pushService;
    private final NotificationGenerationService generationService;

    // ─── Notification List ───

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getUserNotifications(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category) {
        log.info("Fetching notifications for user: {} page={} category={}", userId, page, category);
        Page<NotificationResponse> notifications;
        if (category != null && !category.isBlank()) {
            try {
                Notification.NotificationCategory cat =
                        Notification.NotificationCategory.valueOf(category.toUpperCase());
                notifications = notificationService.getUserNotificationsByCategory(userId, cat, page, size);
            } catch (IllegalArgumentException e) {
                notifications = notificationService.getUserNotificationsPaged(userId, page, size);
            }
        } else {
            notifications = notificationService.getUserNotificationsPaged(userId, page, size);
        }
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("X-User-Id") Long userId) {
        long count = notificationService.countUnreadNotifications(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PostMapping("/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        String idStr = body.get("notificationId");
        if (idStr != null) {
            UUID id = UUID.fromString(idStr);
            log.info("Marking notification {} as read for user {}", id, userId);
            notificationService.markAsRead(id, userId);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Marking all notifications as read for user {}", userId);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/seen")
    public ResponseEntity<Void> markAsSeen(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        String idStr = body.get("notificationId");
        if (idStr != null) {
            notificationService.markAsSeen(UUID.fromString(idStr), userId);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/seen-all")
    public ResponseEntity<Void> markAllAsSeen(
            @RequestHeader("X-User-Id") Long userId) {
        notificationService.markAllAsSeen(userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Deleting notification {} for user {}", id, userId);
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.ok().build();
    }

    // ─── Preferences ───

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreferenceResponse> getPreferences(
            @RequestHeader("X-User-Id") Long userId) {
        NotificationPreference pref = preferenceService.getOrCreate(userId);
        return ResponseEntity.ok(NotificationPreferenceResponse.from(pref));
    }

    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreferenceResponse> updatePreferences(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody NotificationPreferenceRequest request) {
        log.info("Updating notification preferences for user {}", userId);
        NotificationPreference pref = preferenceService.update(userId, request);
        return ResponseEntity.ok(NotificationPreferenceResponse.from(pref));
    }

    // ─── Push Tokens ───

    @PostMapping("/push-tokens")
    public ResponseEntity<Void> registerPushToken(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody PushTokenRequest request) {
        log.info("Registering push token for user {}", userId);
        pushService.registerToken(userId, request.token(), request.platform());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/push-tokens")
    public ResponseEntity<Void> deactivatePushToken(
            @RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token != null) {
            pushService.deactivateToken(token);
        }
        return ResponseEntity.ok().build();
    }

    // ─── Backward Compat ───

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getUnreadCountLegacy(
            @RequestHeader("X-User-Id") Long userId) {
        long count = notificationService.countUnreadNotifications(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsReadLegacy(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") Long userId) {
        return notificationService.markAsRead(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsReadLegacy(
            @RequestHeader("X-User-Id") Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    // ─── Dev/Test ───

    /**
     * Manually trigger a push notification for testing.
     * Bypasses dedup, quiet hours, and daily limits.
     * Usage: POST /api/v1/notifications/test-push
     * Body: { "title": "...", "body": "...", "deeplink": "..." }
     */
    @PostMapping("/test-push")
    public ResponseEntity<Map<String, Object>> testPush(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody(required = false) Map<String, String> body) {
        String title = body != null ? body.getOrDefault("title", "Test Bildirimi") : "Test Bildirimi";
        String msg = body != null ? body.getOrDefault("body", "Bu bir test bildirimidir.") : "Bu bir test bildirimidir.";
        String deeplink = body != null ? body.get("deeplink") : null;

        Notification notif = generationService.sendTestNotification(userId, title, msg, deeplink);
        return ResponseEntity.ok(Map.of(
                "id", notif.getId().toString(),
                "pushSent", Boolean.TRUE.equals(notif.getPushSent()),
                "message", "Test notification sent"
        ));
    }

    /**
     * Trigger any notification type for a specific user.
     * Bypasses dedup and quiet hours for testing.
     * Usage: POST /api/v1/notifications/test-type/{type}
     * Types: DAILY_SUMMARY, DREAM_REMINDER, PRAYER_REMINDER, PLANNER_REMINDER,
     *        MEDITATION_REMINDER, EVENING_CHECKIN, WEEKLY_SUMMARY, RE_ENGAGEMENT,
     *        AI_ANALYSIS_COMPLETE, COMPATIBILITY_UPDATE, MINI_INSIGHT, ENERGY_UPDATE
     */
    @PostMapping("/test-type/{type}")
    public ResponseEntity<Map<String, Object>> testByType(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable String type) {
        try {
            Notification.NotificationType notifType = Notification.NotificationType.valueOf(type.toUpperCase());
            var result = generationService.generateNotificationForTest(userId, notifType);
            return result.map(n -> ResponseEntity.ok(Map.<String, Object>of(
                    "id", n.getId().toString(),
                    "type", n.getType().name(),
                    "title", n.getTitle(),
                    "body", n.getBody(),
                    "pushSent", Boolean.TRUE.equals(n.getPushSent()),
                    "deeplink", n.getDeeplink() != null ? n.getDeeplink() : ""
            ))).orElse(ResponseEntity.ok(Map.of("message", "DENIED by dispatch gate (preference/dedup/quiet hours)")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown type: " + type));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Notification Service is running");
    }
}
