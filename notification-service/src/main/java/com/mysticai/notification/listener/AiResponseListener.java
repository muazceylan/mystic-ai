package com.mysticai.notification.listener;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.service.WebSocketNotificationService;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ listener for AI analysis response events.
 * Sends real-time notifications to users when their AI analysis is complete.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiResponseListener {

    private final WebSocketNotificationService notificationService;

    @RabbitListener(queues = "ai.responses.notification.queue")
    public void handleAiResponse(AiAnalysisResponseEvent event) {
        log.info("Received AI response event for user {}: {}", 
                event.userId(), event.analysisType());

        try {
            // Create notification based on analysis type
            Notification.AnalysisType analysisType = mapAnalysisType(event.analysisType());
            String title = generateTitle(analysisType);
            String message = generateMessage(analysisType);

            // Send notification to user
            notificationService.sendNotification(
                    event.userId(),
                    event.correlationId(),
                    analysisType,
                    title,
                    message,
                    event.originalPayload()
            );

            log.info("Notification sent successfully for user {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to send notification for user {}: {}", 
                    event.userId(), e.getMessage(), e);
        }
    }

    /**
     * Map AiAnalysisEvent.AnalysisType to Notification.AnalysisType.
     */
    private Notification.AnalysisType mapAnalysisType(
            com.mysticai.common.event.AiAnalysisEvent.AnalysisType type) {
        return switch (type) {
            case INTERPRETATION -> Notification.AnalysisType.DREAM;
            case PREDICTION -> Notification.AnalysisType.TAROT;
            case GUIDANCE -> Notification.AnalysisType.ASTROLOGY;
            case SUMMARY -> Notification.AnalysisType.NUMEROLOGY;
            case NATAL_CHART -> Notification.AnalysisType.NATAL_CHART;
            case SWOT, PERIODIC, VISION -> Notification.AnalysisType.ORACLE;
        };
    }

    /**
     * Generate notification title based on analysis type.
     */
    private String generateTitle(Notification.AnalysisType type) {
        return switch (type) {
            case DREAM -> "Ruyaniz Yorumlandi!";
            case TAROT -> "Tarot Aciliminiz Hazir!";
            case ASTROLOGY -> "Astroloji Analiziniz Tamamlandi!";
            case NUMEROLOGY -> "Numeroloji Hesaplamaniz Hazir!";
            case NATAL_CHART -> "Dogum Haritaniz Olusturuldu!";
            case ORACLE -> "Gunun Sirri Hazir!";
        };
    }

    /**
     * Generate notification message based on analysis type.
     */
    private String generateMessage(Notification.AnalysisType type) {
        return switch (type) {
            case DREAM -> "Ruya yorumunuz hazir. Gizli mesajlari ogrenmek icin tiklayin!";
            case TAROT -> "Tarot kartlariniz acildi. Geleceginizin sirlarini kesfedin!";
            case ASTROLOGY -> "Astroloji analiziniz tamamlandi. Yildizlar sizin icin ne diyor?";
            case NUMEROLOGY -> "Numeroloji hesaplamaniz hazir. Sayilarin gizemini kesfedin!";
            case NATAL_CHART -> "Dogum haritaniz olusturuldu. Kaderinizi ogrenmek icin tiklayin!";
            case ORACLE -> "Gunun sirri hazir. Bugun sizin icin ne getiriyor?";
        };
    }
}
