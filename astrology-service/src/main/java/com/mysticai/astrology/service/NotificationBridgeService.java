package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.entity.PlannerReminder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationBridgeService {

    private static final String INTERNAL_GATEWAY_HEADER = "X-Internal-Gateway-Key";
    private static final String INTERNAL_SERVICE_HEADER = "X-Internal-Service-Key";

    private final ObjectMapper objectMapper;

    @Value("${notification-service.url:http://localhost:8088}")
    private String notificationServiceUrl;

    @Value("${internal.gateway.key}")
    private String internalGatewayKey;

    public void sendPlannerReminder(PlannerReminder reminder) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", reminder.getMessageTitle());
        payload.put("body", reminder.getMessageBody());
        payload.put("deeplink", extractDeeplink(reminder.getPayloadJson()));
        payload.put("type", "PLANNER_REMINDER");
        payload.put("category", "REMINDER");
        payload.put("priority", "NORMAL");
        payload.put("deliveryChannel", "BOTH");
        payload.put("sourceModule", "planner");
        payload.put("templateKey", "planner_user_reminder");
        payload.put("variantKey", reminder.getType().name().toLowerCase());
        payload.put("metadata", reminder.getPayloadJson());
        payload.put("dedupKey", "planner-reminder:" + reminder.getId());
        payload.put("expiresInHours", 24);

        RestClient.create(notificationServiceUrl)
                .post()
                .uri("/api/v1/notifications/internal/direct")
                .contentType(MediaType.APPLICATION_JSON)
                .header(INTERNAL_GATEWAY_HEADER, internalGatewayKey)
                .header(INTERNAL_SERVICE_HEADER, internalGatewayKey)
                .header("X-User-Id", String.valueOf(reminder.getUserId()))
                .body(payload)
                .retrieve()
                .toBodilessEntity();
    }

    private String extractDeeplink(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return "/(tabs)/calendar";
        }
        try {
            Map<?, ?> payload = objectMapper.readValue(payloadJson, Map.class);
            Object deeplink = payload.get("deeplink");
            if (deeplink instanceof String value && !value.isBlank()) {
                return value;
            }
        } catch (Exception ex) {
            log.debug("Planner reminder deeplink parse failed: {}", ex.getMessage());
        }
        return "/(tabs)/calendar";
    }
}
