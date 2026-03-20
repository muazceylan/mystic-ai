package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification.NotificationType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationTemplateServiceTest {

    private final NotificationTemplateService service = new NotificationTemplateService();
    private static final String HOME_DEEPLINK = "/(tabs)/home";

    @Test
    void shouldReturnModuleSpecificTemplateForDreamReminder() {
        NotificationTemplateService.NotificationTemplate template =
                service.getTemplate(NotificationType.DREAM_REMINDER, "tr", 42L);

        assertThat(template.moduleKey()).isEqualTo("dream_analysis");
        assertThat(template.deeplink()).startsWith("/(tabs)/dreams");
    }

    @Test
    void shouldReturnReEngagementTemplateBoundToKnownModule() {
        NotificationTemplateService.NotificationTemplate template =
                service.getTemplate(NotificationType.RE_ENGAGEMENT, "en", 99L);

        assertThat(template.moduleKey()).isIn(
                "home",
                "daily_transits",
                "weekly_horoscope",
                "dream_analysis",
                "spiritual",
                "numerology",
                "compatibility"
        );
        assertThat(template.title()).isNotBlank();
        assertThat(template.body()).isNotBlank();
    }

    @Test
    void shouldNotUseHomeRouteForModuleDrivenTemplates() {
        NotificationType[] types = {
                NotificationType.DAILY_SUMMARY,
                NotificationType.EVENING_CHECKIN,
                NotificationType.MINI_INSIGHT,
                NotificationType.RE_ENGAGEMENT,
                NotificationType.AI_ANALYSIS_COMPLETE,
                NotificationType.PRODUCT_UPDATE
        };

        for (NotificationType type : types) {
            for (long userId = 0; userId < 30; userId++) {
                NotificationTemplateService.NotificationTemplate template =
                        service.getTemplate(type, "tr", userId);
                assertThat(template.deeplink())
                        .as("type=%s userId=%s", type, userId)
                        .isNotEqualTo(HOME_DEEPLINK);
            }
        }
    }
}
