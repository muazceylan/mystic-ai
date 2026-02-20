package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.entity.DreamPushToken;
import com.mysticai.astrology.repository.DreamPushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Scheduled jobs for Dream Notifications.
 *
 * Night Prediction  — 23:00 every day: Checks moon transits, sends prediction push if condition met.
 * Morning Recall    —  8:00 every day: "Don't forget your dream!" push to all registered users.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DreamNotificationScheduler {

    private final DreamPushTokenRepository tokenRepository;
    private final PushNotificationService pushService;
    private final TransitCalculator transitCalculator;

    private static final Set<String> DREAM_MOON_SIGNS = Set.of(
            "Pisces", "Balık", "Scorpio", "Akrep"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 23:00 — Night Cosmic Prediction
    // ─────────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 23 * * *")
    public void sendNightPrediction() {
        log.info("Running night dream prediction scheduler");

        try {
            List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(LocalDate.now());

            boolean isDreamActive = isDreamActivated(transits);
            if (!isDreamActive) {
                log.info("Moon not in dream-activating position, skipping night notification");
                return;
            }

            String moonSign = transits.stream()
                    .filter(p -> "Moon".equalsIgnoreCase(p.planet()) || "Ay".equalsIgnoreCase(p.planet()))
                    .map(p -> p.sign())
                    .findFirst().orElse("");

            String title = "🌙 Bu Gece Kozmik Mesajlar Yoğun";
            String body = buildNightMessage(moonSign, transits);

            List<Long> allUserIds = getDistinctUserIds();
            log.info("Sending night prediction to {} users", allUserIds.size());
            allUserIds.forEach(uid -> pushService.sendToUser(uid, title, body));

        } catch (Exception e) {
            log.error("Night prediction scheduler failed: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 08:00 — Morning Dream Recall
    // ─────────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 8 * * *")
    public void sendMorningRecall() {
        log.info("Running morning dream recall scheduler");

        try {
            String title = "🌅 Rüyanı Hatırlıyor musun?";
            String body = "Unutmadan sesli kaydet — bilinçdışı mesajlar sabahın ilk anında en tazedir.";

            List<Long> allUserIds = getDistinctUserIds();
            log.info("Sending morning recall to {} users", allUserIds.size());
            allUserIds.forEach(uid -> pushService.sendToUser(uid, title, body));

        } catch (Exception e) {
            log.error("Morning recall scheduler failed: {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private boolean isDreamActivated(List<PlanetPosition> transits) {
        return transits.stream()
                .filter(p -> "Moon".equalsIgnoreCase(p.planet()) || "Ay".equalsIgnoreCase(p.planet()))
                .anyMatch(p -> DREAM_MOON_SIGNS.contains(p.sign()));
    }

    private String buildNightMessage(String moonSign, List<PlanetPosition> transits) {
        boolean neptuneDream = transits.stream()
                .anyMatch(p -> ("Neptune".equalsIgnoreCase(p.planet()) || "Neptün".equalsIgnoreCase(p.planet()))
                        && (p.sign().contains("Pisces") || p.sign().contains("Balık")
                            || p.sign().contains("Scorpio") || p.sign().contains("Akrep")));

        if (!moonSign.isEmpty()) {
            String signTr = translateSign(moonSign);
            if (neptuneDream) {
                return String.format(
                        "Ay %s burcunda ve Neptün bilinçdışıyla uyumda. " +
                        "Bu gece sezgilerin çok güçlü; rüyalarındaki sembollere dikkat et.", signTr);
            }
            return String.format(
                    "Ay %s burcunda — rüyalar bu gece özellikle anlamlı mesajlar taşıyacak. " +
                    "Sabah uyandığında hemen kaydet.", signTr);
        }
        return "Bu gece sezgilerin çok güçlü; rüyalarındaki sembollere dikkat et.";
    }

    private String translateSign(String sign) {
        return switch (sign.toLowerCase()) {
            case "pisces" -> "Balık";
            case "scorpio" -> "Akrep";
            case "cancer" -> "Yengeç";
            case "aries" -> "Koç";
            case "taurus" -> "Boğa";
            case "gemini" -> "İkizler";
            case "leo" -> "Aslan";
            case "virgo" -> "Başak";
            case "libra" -> "Terazi";
            case "sagittarius" -> "Yay";
            case "capricorn" -> "Oğlak";
            case "aquarius" -> "Kova";
            default -> sign;
        };
    }

    private List<Long> getDistinctUserIds() {
        return tokenRepository.findAll().stream()
                .map(DreamPushToken::getUserId)
                .distinct()
                .collect(Collectors.toList());
    }
}
