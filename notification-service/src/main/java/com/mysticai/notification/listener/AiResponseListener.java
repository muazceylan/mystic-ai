package com.mysticai.notification.listener;

import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.service.NotificationGenerationService;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiResponseListener {

    private final NotificationGenerationService generationService;
    private final NotificationRepository notificationRepository;

    @RabbitListener(queues = "ai.responses.notification.queue")
    public void handleAiResponse(AiAnalysisResponseEvent event) {
        log.info("Received AI response event for user {}: {}",
                event.userId(), event.analysisType());

        try {
            if (!event.success()) {
                log.warn("Skipping notification for failed AI response correlationId={}", event.correlationId());
                return;
            }

            if (event.correlationId() != null
                    && notificationRepository.findByCorrelationId(event.correlationId()).isPresent()) {
                log.info("Skipping duplicate AI response notification correlationId={}", event.correlationId());
                return;
            }

            Notification.AnalysisType analysisType = mapAnalysisType(event.analysisType());
            NotificationType notifType = mapToNotificationType(analysisType);

            generationService.generateNotification(
                    event.userId(),
                    notifType,
                    null,
                    analysisType,
                    event.correlationId(),
                    event.originalPayload()
            );

            log.info("Notification sent successfully for user {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to send notification for user {}: {}",
                    event.userId(), e.getMessage(), e);
        }
    }

    private NotificationType mapToNotificationType(Notification.AnalysisType analysisType) {
        return switch (analysisType) {
            case COMPATIBILITY -> NotificationType.COMPATIBILITY_UPDATE;
            default -> NotificationType.AI_ANALYSIS_COMPLETE;
        };
    }

    private Notification.AnalysisType mapAnalysisType(AiAnalysisEvent.AnalysisType type) {
        return switch (type) {
            case INTERPRETATION,DREAM_SYNTHESIS,MONTHLY_DREAM_STORY,SYMBOL_MEANING,COLLECTIVE_PULSE_REASON -> Notification.AnalysisType.DREAM;
            case PREDICTION -> Notification.AnalysisType.TAROT;
            case GUIDANCE -> Notification.AnalysisType.ASTROLOGY;
            case SUMMARY -> Notification.AnalysisType.NUMEROLOGY;
            case NATAL_CHART -> Notification.AnalysisType.NATAL_CHART;
            case SWOT, PERIODIC, VISION, LUCKY_DATES, WEEKLY_SWOT -> Notification.AnalysisType.ORACLE;
            case RELATIONSHIP_ANALYSIS -> Notification.AnalysisType.COMPATIBILITY;
            case HOROSCOPE_FUSION -> Notification.AnalysisType.HOROSCOPE;
        };
    }
}
