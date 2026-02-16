package com.mysticai.notification.service;

import com.mysticai.notification.dto.NotificationMessage;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing WebSocket notifications.
 * Handles sending real-time notifications to users and persisting them to database.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    /**
     * Send a notification to a specific user via WebSocket and save to database.
     */
    public void sendNotificationToUser(Long userId, Notification notification) {
        // Save to database first
        Notification savedNotification = notificationRepository.save(notification);
        
        // Convert to message DTO
        NotificationMessage message = convertToMessage(savedNotification);
        
        // Send via WebSocket to user-specific queue
        String destination = "/user/" + userId + "/queue/notifications";
        messagingTemplate.convertAndSend(destination, message);
        
        log.info("Notification sent to user {}: {}", userId, message.title());
    }

    /**
     * Send a notification to a specific user (convenience method with parameters).
     */
    public void sendNotification(Long userId, UUID correlationId, 
                                  Notification.AnalysisType analysisType,
                                  String title, String message, String payload) {
        Notification notification = Notification.builder()
                .userId(userId)
                .correlationId(correlationId)
                .analysisType(analysisType)
                .title(title)
                .message(message)
                .payload(payload)
                .build();
        
        sendNotificationToUser(userId, notification);
    }

    /**
     * Get all notifications for a user.
     */
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications for a user.
     */
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndStatusOrderByCreatedAtDesc(
                userId, Notification.NotificationStatus.UNREAD);
    }

    /**
     * Count unread notifications for a user.
     */
    public long countUnreadNotifications(Long userId) {
        return notificationRepository.countByUserIdAndStatus(
                userId, Notification.NotificationStatus.UNREAD);
    }

    /**
     * Mark a notification as read.
     */
    public Optional<Notification> markAsRead(UUID notificationId, Long userId) {
        return notificationRepository.findByIdAndUserId(notificationId, userId)
                .map(notification -> {
                    notification.markAsRead();
                    return notificationRepository.save(notification);
                });
    }

    /**
     * Mark all notifications as read for a user.
     */
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
        log.info("All notifications marked as read for user {}", userId);
    }

    /**
     * Delete a notification.
     */
    public void deleteNotification(UUID notificationId, Long userId) {
        notificationRepository.findByIdAndUserId(notificationId, userId)
                .ifPresent(notificationRepository::delete);
    }

    /**
     * Convert Notification entity to NotificationMessage DTO.
     */
    private NotificationMessage convertToMessage(Notification notification) {
        return new NotificationMessage(
                notification.getId(),
                notification.getCorrelationId(),
                notification.getAnalysisType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getStatus(),
                notification.getCreatedAt(),
                notification.getPayload()
        );
    }
}
