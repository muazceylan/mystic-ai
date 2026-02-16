package com.mysticai.notification.controller;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.service.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    /**
     * GET /api/v1/notifications
     * Get all notifications for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications(
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Fetching notifications for user: {}", userId);
        List<Notification> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/v1/notifications/unread
     * Get unread notifications for the authenticated user.
     */
    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Fetching unread notifications for user: {}", userId);
        List<Notification> notifications = notificationService.getUnreadNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/v1/notifications/count
     * Get count of unread notifications.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("X-User-Id") Long userId) {
        long count = notificationService.countUnreadNotifications(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * PUT /api/v1/notifications/{id}/read
     * Mark a specific notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Marking notification {} as read for user {}", id, userId);
        return notificationService.markAsRead(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT /api/v1/notifications/read-all
     * Mark all notifications as read for the user.
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Marking all notifications as read for user {}", userId);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/v1/notifications/{id}
     * Delete a specific notification.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Deleting notification {} for user {}", id, userId);
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Notification Service is running");
    }
}
