package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.PushToken;
import com.mysticai.notification.repository.PushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushService {

    private final PushTokenRepository pushTokenRepository;

    @Value("${expo.push.url:https://exp.host/--/api/v2/push/send}")
    private String expoPushUrl;

    @Value("${expo.push.enabled:true}")
    private boolean pushEnabled;

    @Transactional
    public void registerToken(Long userId, String token, String platform) {
        registerToken(userId, token, platform, null, null, null);
    }

    @Transactional
    public void registerToken(Long userId, String token, String platform,
                               String deviceId, String appVersion, String environment) {
        Optional<PushToken> existing = pushTokenRepository.findByToken(token);
        if (existing.isPresent()) {
            PushToken pt = existing.get();
            // Token moved to a different user (e.g. device reused) — rebind
            if (!pt.getUserId().equals(userId)) {
                pt.setUserId(userId);
                pt.setActive(true);
                pt.setInvalidReason(null);
            } else if (!pt.isActive()) {
                // Reactivate a previously deactivated token for same user
                pt.setActive(true);
                pt.setInvalidReason(null);
            }
            // Always refresh last-seen metadata
            pt.setLastSeenAt(java.time.LocalDateTime.now());
            if (deviceId != null) pt.setDeviceId(deviceId);
            if (appVersion != null) pt.setAppVersion(appVersion);
            if (environment != null) pt.setEnvironment(environment);
            pushTokenRepository.save(pt);
        } else {
            pushTokenRepository.save(PushToken.builder()
                    .userId(userId)
                    .token(token)
                    .platform(platform != null ? platform : "unknown")
                    .deviceId(deviceId)
                    .appVersion(appVersion)
                    .environment(environment != null ? environment : "production")
                    .build());
        }
        log.info("Push token registered for userId: {}", userId);
    }

    @Transactional
    public void deactivateToken(String token) {
        pushTokenRepository.findByToken(token).ifPresent(pt -> invalidateToken(pt, "ManualDeactivation"));
        log.info("Push token deactivated: {}...", token.substring(0, Math.min(20, token.length())));
    }

    public boolean sendPush(Long userId, Notification notification) {
        List<PushToken> tokens = pushTokenRepository.findAllByUserIdAndActiveTrue(userId);
        if (tokens.isEmpty()) {
            log.debug("No active push tokens for userId: {}", userId);
            return false;
        }

        boolean anySent = false;
        for (PushToken pt : tokens) {
            boolean sent = sendSingle(pt, notification.getTitle(),
                    notification.getBody(), notification.getDeeplink());
            if (sent) anySent = true;
        }
        return anySent;
    }

    private boolean sendSingle(PushToken pt, String title, String body, String deeplink) {
        String token = pt.getToken();
        String tokenPrefix = token.substring(0, Math.min(20, token.length()));

        if (!pushEnabled) {
            log.debug("[PUSH-MOCK] to={}... | title={} | body={}", tokenPrefix, title, body);
            return true;
        }
        try {
            RestClient client = RestClient.create(expoPushUrl);

            Map<String, Object> payload = new HashMap<>();
            payload.put("to", token);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("sound", "default");
            payload.put("priority", "high");
            payload.put("channelId", "mysticai-notifications");
            if (deeplink != null && !deeplink.isBlank()) {
                payload.put("data", Map.of("deeplink", deeplink));
            }

            String response = client.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            log.debug("Push sent to {}...: {}", tokenPrefix, response);

            if (response != null) {
                if (response.contains("DeviceNotRegistered")) {
                    log.warn("Token no longer registered, deactivating: {}...", tokenPrefix);
                    invalidateToken(pt, "DeviceNotRegistered");
                    return false;
                }
                if (response.contains("InvalidCredentials")) {
                    log.warn("Invalid credentials for token {}...", tokenPrefix);
                    invalidateToken(pt, "InvalidCredentials");
                    return false;
                }
            }

            // Mark successful delivery on the token
            pt.setLastDeliveredAt(LocalDateTime.now());
            pushTokenRepository.save(pt);
            return true;

        } catch (Exception e) {
            log.warn("Failed to send push to {}...: {}", tokenPrefix, e.getMessage());
            return false;
        }
    }

    // No @Transactional — always called within sendSingle which runs in caller's transaction
    public void invalidateToken(PushToken pt, String reason) {
        pt.setActive(false);
        pt.setInvalidReason(reason);
        pushTokenRepository.save(pt);
    }
}
