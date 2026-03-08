package com.mysticai.notification.listener;

import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.service.PushService;
import com.mysticai.notification.service.WebSocketNotificationService;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiResponseListener {

    private final WebSocketNotificationService notificationService;
    private final PushService pushService;

    @RabbitListener(queues = "ai.responses.notification.queue")
    public void handleAiResponse(AiAnalysisResponseEvent event) {
        log.info("Received AI response event for user {}: {}",
                event.userId(), event.analysisType());

        try {
            Notification.AnalysisType analysisType = mapAnalysisType(event.analysisType());
            String title = generateTitle(analysisType);
            String message = generateMessage(analysisType);

            notificationService.sendNotification(
                    event.userId(),
                    event.correlationId(),
                    analysisType,
                    title,
                    message,
                    event.originalPayload()
            );

            // Also send push notification
            Notification pushNotif = Notification.builder()
                    .title(title)
                    .body(message)
                    .deeplink(getDeeplinkForAnalysisType(analysisType))
                    .build();
            pushService.sendPush(event.userId(), pushNotif);

            log.info("Notification sent successfully for user {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to send notification for user {}: {}",
                    event.userId(), e.getMessage(), e);
        }
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

    private String generateTitle(Notification.AnalysisType type) {
        return switch (type) {
            case DREAM -> "Ruyaniz Yorumlandi!";
            case TAROT -> "Tarot Aciliminiz Hazir!";
            case ASTROLOGY -> "Astroloji Analiziniz Tamamlandi!";
            case NUMEROLOGY -> "Numeroloji Hesaplamaniz Hazir!";
            case NATAL_CHART -> "Dogum Haritaniz Olusturuldu!";
            case ORACLE -> "Gunun Sirri Hazir!";
            case COMPATIBILITY -> "Uyum Analiziniz Tamamlandi!";
            case HOROSCOPE -> "Burc Yorumunuz Hazir!";
        };
    }

    private String generateMessage(Notification.AnalysisType type) {
        return switch (type) {
            case DREAM -> "Ruya yorumunuz hazir. Gizli mesajlari ogrenmek icin tiklayin!";
            case TAROT -> "Tarot kartlariniz acildi. Geleceginizin sirlarini kesfedin!";
            case ASTROLOGY -> "Astroloji analiziniz tamamlandi. Yildizlar sizin icin ne diyor?";
            case NUMEROLOGY -> "Numeroloji hesaplamaniz hazir. Sayilarin gizemini kesfedin!";
            case NATAL_CHART -> "Dogum haritaniz olusturuldu. Kaderinizi ogrenmek icin tiklayin!";
            case ORACLE -> "Gunun sirri hazir. Bugun sizin icin ne getiriyor?";
            case COMPATIBILITY -> "Uyum analiziniz hazir. Kozmik baglantinizi kesfedin!";
            case HOROSCOPE -> "Burc yorumunuz hazir. Yildizlarin mesajini okumak icin tiklayin!";
        };
    }

    private String getDeeplinkForAnalysisType(Notification.AnalysisType type) {
        return switch (type) {
            case DREAM -> "/(tabs)/dreams";
            case TAROT, ASTROLOGY, NUMEROLOGY, ORACLE -> "/(tabs)/home";
            case NATAL_CHART -> "/(tabs)/natal-chart";
            case COMPATIBILITY -> "/(tabs)/compatibility";
            case HOROSCOPE -> "/(tabs)/horoscope";
        };
    }
}
