package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.PushTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class PushServiceTest {

    @Mock PushTokenRepository pushTokenRepository;

    @Test
    void shouldIncludeNotificationMetadataInExpoPayload() {
        PushService service = new PushService(pushTokenRepository);
        Notification notification = Notification.builder()
                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .title("Yeni bildirim")
                .body("Detay hazir")
                .deeplink("/(tabs)/calendar")
                .type(Notification.NotificationType.AI_ANALYSIS_COMPLETE)
                .category(Notification.NotificationCategory.SYSTEM)
                .sourceModule("daily_transits")
                .templateKey("ai_analysis_complete")
                .variantKey("v2")
                .build();

        Map<String, Object> payload = service.buildExpoPayload("ExponentPushToken[test-token]", notification);

        assertThat(payload).containsEntry("to", "ExponentPushToken[test-token]");
        assertThat(payload).containsEntry("title", "Yeni bildirim");
        assertThat(payload).containsEntry("body", "Detay hazir");
        assertThat(payload).containsKey("data");

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        assertThat(data).containsEntry("notificationId", "11111111-1111-1111-1111-111111111111");
        assertThat(data).containsEntry("deeplink", "/(tabs)/calendar");
        assertThat(data).containsEntry("type", "AI_ANALYSIS_COMPLETE");
        assertThat(data).containsEntry("category", "SYSTEM");
        assertThat(data).containsEntry("sourceModule", "daily_transits");
        assertThat(data).containsEntry("templateKey", "ai_analysis_complete");
        assertThat(data).containsEntry("variantKey", "v2");
    }
}
