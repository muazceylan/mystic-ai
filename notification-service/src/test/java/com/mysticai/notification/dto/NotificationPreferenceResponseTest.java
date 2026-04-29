package com.mysticai.notification.dto;

import com.mysticai.notification.entity.NotificationPreference;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationPreferenceResponseTest {

    @Test
    void shouldSerializeLegacyPreferenceWithMissingOptionalValues() {
        NotificationPreference preference = NotificationPreference.builder()
                .userId(42L)
                .frequencyLevel(null)
                .preferredTimeSlot(null)
                .quietHoursStart(null)
                .quietHoursEnd(null)
                .timezone(" ")
                .build();

        NotificationPreferenceResponse response = NotificationPreferenceResponse.from(preference);

        assertThat(response.frequencyLevel()).isEqualTo("BALANCED");
        assertThat(response.preferredTimeSlot()).isEqualTo("MORNING");
        assertThat(response.quietHoursStart()).isEqualTo("22:30");
        assertThat(response.quietHoursEnd()).isEqualTo("08:00");
        assertThat(response.timezone()).isEqualTo("Europe/Istanbul");
    }
}
