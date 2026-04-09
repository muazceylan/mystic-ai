package com.mysticai.notification.dto;

import com.mysticai.notification.entity.Notification;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationResponseTest {

    @Test
    void shouldSerializeNotificationTimesWithSystemOffset() {
        TimeZone previous = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        try {
            Notification notification = Notification.builder()
                    .userId(42L)
                    .title("Welcome")
                    .body("Fresh notification")
                    .createdAt(LocalDateTime.of(2026, 4, 9, 16, 0))
                    .readAt(LocalDateTime.of(2026, 4, 9, 16, 5))
                    .seenAt(LocalDateTime.of(2026, 4, 9, 16, 1))
                    .build();

            NotificationResponse response = NotificationResponse.from(notification);

            assertThat(response.createdAt()).isEqualTo(notification.getCreatedAt().atOffset(ZoneOffset.UTC));
            assertThat(response.readAt()).isEqualTo(notification.getReadAt().atOffset(ZoneOffset.UTC));
            assertThat(response.seenAt()).isEqualTo(notification.getSeenAt().atOffset(ZoneOffset.UTC));
        } finally {
            TimeZone.setDefault(previous);
        }
    }
}
