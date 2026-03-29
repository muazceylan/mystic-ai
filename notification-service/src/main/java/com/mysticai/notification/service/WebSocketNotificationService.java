package com.mysticai.notification.service;

import com.mysticai.notification.dto.NotificationResponse;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {
    private static final int MAX_NOTIFICATION_BODY_LENGTH = 900;
    private static final int MAX_NOTIFICATION_METADATA_LENGTH = 3900;

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    public void sendNotificationToUser(Long userId, Notification notification) {
        if (notification.getId() == null) {
            notification = notificationRepository.save(notification);
        }

        try {
            NotificationResponse response = NotificationResponse.from(notification);
            String destination = "/user/" + userId + "/queue/notifications";
            messagingTemplate.convertAndSend(destination, response);
            log.debug("WebSocket notification sent to user {}: {}", userId, notification.getTitle());
        } catch (Exception e) {
            log.debug("WebSocket send failed for user {}: {}", userId, e.getMessage());
        }
    }

    /** Legacy sendNotification for backward compat with AiResponseListener */
    public void sendNotification(Long userId, UUID correlationId,
                                  Notification.AnalysisType analysisType,
                                  String title, String message, String payload) {
        Notification notification = Notification.builder()
                .userId(userId)
                .correlationId(correlationId)
                .analysisType(analysisType)
                .type(Notification.NotificationType.AI_ANALYSIS_COMPLETE)
                .category(Notification.NotificationCategory.SYSTEM)
                .title(title)
                .body(trimToLength(message, MAX_NOTIFICATION_BODY_LENGTH))
                .deeplink(getDeeplinkForAnalysisType(analysisType))
                .sourceModule(getSourceModuleForAnalysisType(analysisType))
                .metadata(trimToLength(payload, MAX_NOTIFICATION_METADATA_LENGTH))
                .build();

        Notification saved = notificationRepository.save(notification);
        sendNotificationToUser(userId, saved);
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        if (maxLength <= 1) {
            return value.substring(0, maxLength);
        }
        return value.substring(0, maxLength - 1) + "...";
    }

    public Page<NotificationResponse> getUserNotificationsPaged(Long userId, int page, int size) {
        Page<Notification> notifications = notificationRepository.findActiveByUserId(
                userId, LocalDateTime.now(), PageRequest.of(page, size));
        return notifications.map(NotificationResponse::from);
    }

    public Page<NotificationResponse> getUserNotificationsByCategory(
            Long userId, Notification.NotificationCategory category, int page, int size) {
        Page<Notification> notifications = notificationRepository.findActiveByUserIdAndCategory(
                userId, category, LocalDateTime.now(), PageRequest.of(page, size));
        return notifications.map(NotificationResponse::from);
    }

    public Page<NotificationResponse> getUserNotificationsByCategories(
            Long userId, List<Notification.NotificationCategory> categories, int page, int size) {
        Page<Notification> notifications = notificationRepository.findActiveByUserIdAndCategoryIn(
                userId, categories, LocalDateTime.now(), PageRequest.of(page, size));
        return notifications.map(NotificationResponse::from);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndStatusOrderByCreatedAtDesc(
                userId, Notification.NotificationStatus.UNREAD);
    }

    public long countUnreadNotifications(Long userId) {
        return notificationRepository.countByUserIdAndStatus(
                userId, Notification.NotificationStatus.UNREAD);
    }

    @Transactional
    public Optional<Notification> markAsRead(UUID notificationId, Long userId) {
        return notificationRepository.findByIdAndUserId(notificationId, userId)
                .map(notification -> {
                    notification.markAsRead();
                    Notification saved = notificationRepository.save(notification);

                    long unreadCount = countUnreadNotifications(userId);
                    try {
                        messagingTemplate.convertAndSend(
                                "/user/" + userId + "/queue/notifications/count",
                                Map.of("unreadCount", unreadCount));
                    } catch (Exception ignored) {}

                    return saved;
                });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
        // Reading implies seeing
        notificationRepository.markAllAsSeenByUserId(userId);
        try {
            messagingTemplate.convertAndSend(
                    "/user/" + userId + "/queue/notifications/count",
                    Map.of("unreadCount", 0));
        } catch (Exception ignored) {}
        log.info("All notifications marked as read for user {}", userId);
    }

    @Transactional
    public void markAsSeen(UUID notificationId, Long userId) {
        notificationRepository.markAsSeenById(notificationId, userId);
    }

    @Transactional
    public void markAllAsSeen(Long userId) {
        notificationRepository.markAllAsSeenByUserId(userId);
        log.info("All notifications marked as seen for user {}", userId);
    }

    public void deleteNotification(UUID notificationId, Long userId) {
        notificationRepository.findByIdAndUserId(notificationId, userId)
                .ifPresent(notificationRepository::delete);
    }

    private String getDeeplinkForAnalysisType(Notification.AnalysisType type) {
        if (type == null) return "/(tabs)/notifications";
        return switch (type) {
            case DREAM -> "/(tabs)/dreams";
            case NUMEROLOGY -> "/numerology?entry_point=push_ai_analysis";
            case ASTROLOGY -> "/(tabs)/calendar";
            case TAROT, ORACLE -> "/daily-summary?entry_point=push_ai_analysis";
            case NATAL_CHART -> "/(tabs)/natal-chart";
            case COMPATIBILITY -> "/(tabs)/compatibility";
            case HOROSCOPE -> "/(tabs)/horoscope";
        };
    }

    private String getSourceModuleForAnalysisType(Notification.AnalysisType type) {
        if (type == null) return "notifications";
        return switch (type) {
            case DREAM -> "dream_analysis";
            case NUMEROLOGY -> "numerology";
            case COMPATIBILITY -> "compatibility";
            case HOROSCOPE -> "weekly_horoscope";
            case NATAL_CHART, TAROT, ASTROLOGY, ORACLE -> "daily_transits";
        };
    }
}
