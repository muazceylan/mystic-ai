package com.mysticai.astrology.service;

import com.mysticai.astrology.entity.DreamPushToken;
import com.mysticai.astrology.repository.DreamPushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Sends push notifications via Expo's Push API.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final DreamPushTokenRepository tokenRepository;

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    public void registerToken(Long userId, String token, String platform) {
        tokenRepository.findByToken(token).ifPresentOrElse(
                existing -> {
                    // Token already registered, nothing to do
                    if (!existing.getUserId().equals(userId)) {
                        existing.setUserId(userId);
                        tokenRepository.save(existing);
                    }
                },
                () -> tokenRepository.save(DreamPushToken.builder()
                        .userId(userId)
                        .token(token)
                        .platform(platform != null ? platform : "unknown")
                        .build())
        );
        log.info("Push token registered for userId: {}", userId);
    }

    public void sendToUser(Long userId, String title, String body) {
        List<DreamPushToken> tokens = tokenRepository.findAllByUserId(userId);
        if (tokens.isEmpty()) {
            log.debug("No push tokens found for userId: {}", userId);
            return;
        }
        tokens.forEach(t -> sendSingle(t.getToken(), title, body));
    }

    public void sendToAllUsers(String title, String body, List<Long> userIds) {
        userIds.forEach(uid -> sendToUser(uid, title, body));
    }

    private void sendSingle(String token, String title, String body) {
        try {
            RestClient client = RestClient.create(EXPO_PUSH_URL);
            Map<String, Object> payload = Map.of(
                    "to", token,
                    "title", title,
                    "body", body,
                    "sound", "default",
                    "priority", "high",
                    "channelId", "dream-notifications"
            );

            String response = client.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            log.info("Push sent to token {}: {}", token.substring(0, Math.min(20, token.length())), response);
        } catch (Exception e) {
            log.warn("Failed to send push to token {}: {}", token.substring(0, Math.min(20, token.length())), e.getMessage());
        }
    }
}
