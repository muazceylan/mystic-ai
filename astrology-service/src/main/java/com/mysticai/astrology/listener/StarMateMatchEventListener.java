package com.mysticai.astrology.listener;

import com.mysticai.astrology.event.StarMateMatchEvent;
import com.mysticai.astrology.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StarMateMatchEventListener {

    private final PushNotificationService pushNotificationService;

    @EventListener
    public void onStarMateMatch(StarMateMatchEvent event) {
        log.info("StarMate match event received: matchId={}, users=({}, {}) score={}",
                event.matchId(), event.userAId(), event.userBId(), event.compatibilityScore());

        String title = "Yıldız Eşi: Yeni Eşleşme ✨";
        String body = event.compatibilityScore() != null
                ? "Kozmik eşleşme oluştu! Uyum skorunuz %" + event.compatibilityScore()
                : "Kozmik eşleşme oluştu! Sohbete başla.";

        try {
            pushNotificationService.sendToUser(event.userAId(), title, body);
            pushNotificationService.sendToUser(event.userBId(), title, body);
        } catch (Exception e) {
            log.warn("Failed to send StarMate match push notifications for matchId={}: {}", event.matchId(), e.getMessage());
        }
    }
}
