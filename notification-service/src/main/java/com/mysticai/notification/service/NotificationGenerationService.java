package com.mysticai.notification.service;

import com.mysticai.notification.dto.InternalDirectNotificationRequest;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.Notification.*;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationGenerationService {
    private static final int MAX_GENERATION_METADATA_LENGTH = 3900;

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationTemplateService templateService;
    private final NotificationDispatchService dispatchService;
    private final PushService pushService;
    private final WebSocketNotificationService wsService;

    @Transactional
    public Optional<Notification> generateNotification(Long userId, NotificationType type, String locale) {
        return generateNotification(userId, type, locale, null);
    }

    @Transactional
    public Optional<Notification> generateNotification(Long userId, NotificationType type, String locale,
                                                       AnalysisType analysisType) {
        return generateNotification(userId, type, locale, analysisType, null, null);
    }

    @Transactional
    public Optional<Notification> generateNotification(Long userId, NotificationType type, String locale,
                                                       AnalysisType analysisType, UUID correlationId,
                                                       String metadata) {
        NotificationPreference pref = preferenceRepository.findById(userId)
                .orElse(NotificationPreference.builder().userId(userId).build());

        // All eligibility logic delegated to the central dispatch gate
        NotificationDispatchService.DispatchDecision decision = dispatchService.evaluate(userId, type, pref);
        if (decision == NotificationDispatchService.DispatchDecision.DENY) {
            return Optional.empty();
        }

        String dedupKey = dispatchService.buildDedupKey(userId, type);
        DeliveryChannel channel = decision == NotificationDispatchService.DispatchDecision.PUSH_AND_IN_APP
                ? DeliveryChannel.BOTH
                : DeliveryChannel.IN_APP;

        return createAndSave(userId, type, locale, pref, channel, dedupKey, analysisType, correlationId, metadata);
    }

    private Optional<Notification> createAndSave(Long userId, NotificationType type, String locale,
                                                  NotificationPreference pref, DeliveryChannel channel,
                                                  String dedupKey, AnalysisType analysisType,
                                                  UUID correlationId, String metadata) {
        NotificationTemplateService.NotificationTemplate template = templateService.getTemplate(type, locale, userId);
        RouteTarget routeTarget = resolveRouteTarget(type, template, analysisType);
        NotificationCategory category = categorizeType(type);
        Priority priority = determinePriority(type);

        Notification notification = Notification.builder()
                .userId(userId)
                .correlationId(correlationId)
                .type(type)
                .category(category)
                .title(template.title())
                .body(template.body())
                .deeplink(routeTarget.deeplink())
                .deliveryChannel(channel)
                .priority(priority)
                .sourceModule(routeTarget.moduleKey())
                .templateKey(template.templateKey())
                .variantKey(template.variantKey())
                .analysisType(analysisType)
                .metadata(trimToLength(metadata, MAX_GENERATION_METADATA_LENGTH))
                .dedupKey(dedupKey)
                .expiresAt(calculateExpiry(type))
                .build();

        Notification saved = notificationRepository.save(notification);

        // Send push if appropriate
        if (channel != DeliveryChannel.IN_APP && pref.isPushEnabled()) {
            boolean pushOk = pushService.sendPush(userId, saved);
            if (pushOk) {
                saved.setPushSent(true);
                saved.setDelivered(true);
                saved.setDeliveredAt(LocalDateTime.now());
                notificationRepository.save(saved);
            }
        }

        // Send WebSocket for real-time in-app
        try {
            wsService.sendNotificationToUser(userId, saved);
        } catch (Exception e) {
            log.debug("WebSocket send failed for user {}, notification still saved", userId);
        }

        log.info("Notification generated: type={}, user={}, channel={}", type, userId, channel);
        return Optional.of(saved);
    }

    /**
     * Dev/test only: uses real templates but bypasses dedup and quiet hours.
     */
    @Transactional
    public Optional<Notification> generateNotificationForTest(Long userId, NotificationType type) {
        NotificationPreference pref = preferenceRepository.findById(userId)
                .orElse(NotificationPreference.builder().userId(userId).build());
        String dedupKey = "test:" + userId + ":" + type + ":" + System.currentTimeMillis();
        return createAndSave(userId, type, null, pref, DeliveryChannel.BOTH, dedupKey, null, null, null);
    }

    /**
     * Dev/test only: bypasses dedup, quiet hours, and daily push limits.
     */
    @Transactional
    public Notification sendTestNotification(Long userId, String title, String body, String deeplink) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(NotificationType.MINI_INSIGHT)
                .category(NotificationCategory.SYSTEM)
                .title(title)
                .body(body)
                .deeplink(deeplink)
                .deliveryChannel(DeliveryChannel.BOTH)
                .priority(Priority.HIGH)
                .sourceModule("test")
                .dedupKey("test:" + userId + ":" + System.currentTimeMillis())
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        Notification saved = notificationRepository.save(notification);

        boolean pushOk = pushService.sendPush(userId, saved);
        if (pushOk) {
            saved.setPushSent(true);
            saved.setDelivered(true);
            saved.setDeliveredAt(LocalDateTime.now());
            notificationRepository.save(saved);
        }

        try {
            wsService.sendNotificationToUser(userId, saved);
        } catch (Exception ignored) {}

        log.info("[TEST] Notification sent: user={}, title={}, pushOk={}", userId, title, pushOk);
        return saved;
    }

    @Transactional
    public Notification sendDirectNotification(Long userId, InternalDirectNotificationRequest request) {
        if (request.dedupKey() != null && !request.dedupKey().isBlank()) {
            Optional<Notification> existing = notificationRepository.findByDedupKey(request.dedupKey().trim());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        NotificationPreference pref = preferenceRepository.findById(userId)
                .orElse(NotificationPreference.builder().userId(userId).build());

        DeliveryChannel requestedChannel = parseEnum(
                request.deliveryChannel(),
                DeliveryChannel.class,
                DeliveryChannel.BOTH
        );
        DeliveryChannel finalChannel = pref.isPushEnabled()
                ? requestedChannel
                : DeliveryChannel.IN_APP;

        Notification notification = Notification.builder()
                .userId(userId)
                .type(parseEnum(request.type(), NotificationType.class, NotificationType.PLANNER_REMINDER))
                .category(parseEnum(request.category(), NotificationCategory.class, NotificationCategory.REMINDER))
                .priority(parseEnum(request.priority(), Priority.class, Priority.NORMAL))
                .title(request.title().trim())
                .body(request.body().trim())
                .deeplink(blankToNull(request.deeplink()))
                .deliveryChannel(finalChannel)
                .sourceModule(blankToNull(request.sourceModule()))
                .templateKey(blankToNull(request.templateKey()))
                .variantKey(blankToNull(request.variantKey()))
                .metadata(blankToNull(request.metadata()))
                .dedupKey(blankToNull(request.dedupKey()))
                .expiresAt(LocalDateTime.now().plusHours(resolveExpiryHours(request.expiresInHours())))
                .build();

        Notification saved = notificationRepository.save(notification);

        if (finalChannel != DeliveryChannel.IN_APP) {
            boolean pushOk = pushService.sendPush(userId, saved);
            if (pushOk) {
                saved.setPushSent(true);
                saved.setDelivered(true);
                saved.setDeliveredAt(LocalDateTime.now());
                saved = notificationRepository.save(saved);
            }
        }

        try {
            wsService.sendNotificationToUser(userId, saved);
        } catch (Exception e) {
            log.debug("Direct notification websocket send failed for user {}", userId);
        }

        log.info("Direct notification generated: type={}, user={}, dedupKey={}",
                saved.getType(), userId, saved.getDedupKey());
        return saved;
    }

    private NotificationCategory categorizeType(NotificationType type) {
        return switch (type) {
            case DAILY_SUMMARY, MINI_INSIGHT, NUMEROLOGY_CHECKIN -> NotificationCategory.DAILY;
            case ENERGY_UPDATE -> NotificationCategory.INTRADAY;
            case WEEKLY_SUMMARY -> NotificationCategory.WEEKLY;
            case PRAYER_REMINDER, MEDITATION_REMINDER, PLANNER_REMINDER, DREAM_REMINDER, EVENING_CHECKIN ->
                    NotificationCategory.REMINDER;
            case RE_ENGAGEMENT -> NotificationCategory.BEHAVIORAL;
            case AI_ANALYSIS_COMPLETE, COMPATIBILITY_UPDATE, PRODUCT_UPDATE -> NotificationCategory.SYSTEM;
        };
    }

    private Priority determinePriority(NotificationType type) {
        return switch (type) {
            case DAILY_SUMMARY, WEEKLY_SUMMARY, AI_ANALYSIS_COMPLETE, COMPATIBILITY_UPDATE -> Priority.HIGH;
            case RE_ENGAGEMENT -> Priority.NORMAL;
            case ENERGY_UPDATE, MINI_INSIGHT, NUMEROLOGY_CHECKIN -> Priority.LOW;
            default -> Priority.NORMAL;
        };
    }

    private LocalDateTime calculateExpiry(NotificationType type) {
        return switch (type) {
            case DAILY_SUMMARY, ENERGY_UPDATE, MINI_INSIGHT, NUMEROLOGY_CHECKIN -> LocalDateTime.now().plusDays(1);
            case WEEKLY_SUMMARY -> LocalDateTime.now().plusDays(7);
            case PRAYER_REMINDER, MEDITATION_REMINDER, PLANNER_REMINDER, EVENING_CHECKIN, DREAM_REMINDER ->
                    LocalDateTime.now().plusHours(12);
            case RE_ENGAGEMENT -> LocalDateTime.now().plusDays(3);
            case AI_ANALYSIS_COMPLETE, COMPATIBILITY_UPDATE -> LocalDateTime.now().plusDays(14);
            case PRODUCT_UPDATE -> LocalDateTime.now().plusDays(30);
        };
    }

    private RouteTarget resolveRouteTarget(
            NotificationType type,
            NotificationTemplateService.NotificationTemplate template,
            AnalysisType analysisType
    ) {
        if (type == NotificationType.AI_ANALYSIS_COMPLETE && analysisType != null) {
            return routeTargetForAnalysis(analysisType);
        }
        return new RouteTarget(template.moduleKey(), template.deeplink());
    }

    private RouteTarget routeTargetForAnalysis(AnalysisType analysisType) {
        return switch (analysisType) {
            case DREAM -> new RouteTarget("dream_analysis", "/(tabs)/dreams");
            case NUMEROLOGY -> new RouteTarget("numerology", "/numerology?entry_point=push_ai_analysis");
            case COMPATIBILITY -> new RouteTarget("compatibility", "/(tabs)/compatibility");
            case HOROSCOPE -> new RouteTarget("weekly_horoscope", "/(tabs)/horoscope");
            case NATAL_CHART -> new RouteTarget("daily_transits", "/(tabs)/natal-chart");
            case ASTROLOGY -> new RouteTarget("daily_transits", "/(tabs)/calendar");
            case TAROT, ORACLE -> new RouteTarget("daily_transits", "/daily-summary?entry_point=push_ai_analysis");
        };
    }

    private int resolveExpiryHours(Integer expiresInHours) {
        if (expiresInHours == null || expiresInHours <= 0) {
            return 24;
        }
        return Math.min(expiresInHours, 24 * 14);
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        if (maxLength <= 3) {
            return value.substring(0, maxLength);
        }
        return value.substring(0, maxLength - 3) + "...";
    }

    private <E extends Enum<E>> E parseEnum(String raw, Class<E> enumType, E fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return Enum.valueOf(enumType, raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }

    private record RouteTarget(String moduleKey, String deeplink) {}
}
