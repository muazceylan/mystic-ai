package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.Notification.AnalysisType;
import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationPreferenceRepository;
import com.mysticai.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationGenerationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock NotificationPreferenceRepository preferenceRepository;
    @Mock NotificationTemplateService templateService;
    @Mock NotificationDispatchService dispatchService;
    @Mock PushService pushService;
    @Mock WebSocketNotificationService wsService;

    @InjectMocks NotificationGenerationService service;

    @Test
    void shouldUseTemplateModuleAsSourceModule() {
        Long userId = 42L;
        NotificationPreference pref = NotificationPreference.builder()
                .userId(userId)
                .pushEnabled(false)
                .build();

        NotificationTemplateService.NotificationTemplate template =
                new NotificationTemplateService.NotificationTemplate(
                        "energy_update",
                        "tr",
                        1,
                        "daily_transits",
                        "Enerji ritmi degisti",
                        "Takvimdeki yeni pencereyi yakalarsan bugun daha akici ilerlersin.",
                        "/(tabs)/calendar"
                );

        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(pref));
        when(templateService.getTemplate(eq(NotificationType.ENERGY_UPDATE), isNull(), eq(userId))).thenReturn(template);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<Notification> result = service.generateNotificationForTest(userId, NotificationType.ENERGY_UPDATE);

        assertThat(result).isPresent();
        Notification saved = result.orElseThrow();
        assertThat(saved.getSourceModule()).isEqualTo("daily_transits");
        assertThat(saved.getTemplateKey()).isEqualTo("energy_update");
        assertThat(saved.getVariantKey()).isEqualTo("v1");

        verify(pushService, never()).sendPush(any(), any());
        verify(wsService).sendNotificationToUser(eq(userId), any(Notification.class));
    }

    @Test
    void shouldRouteAiAnalysisToRelatedModuleInsteadOfHome() {
        Long userId = 77L;
        NotificationPreference pref = NotificationPreference.builder()
                .userId(userId)
                .pushEnabled(false)
                .build();

        NotificationTemplateService.NotificationTemplate template =
                new NotificationTemplateService.NotificationTemplate(
                        "ai_analysis_complete",
                        "tr",
                        0,
                        "notifications",
                        "AI analizin tamamlandi",
                        "Rapor hazir.",
                        "/(tabs)/notifications"
                );

        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(pref));
        when(dispatchService.evaluate(eq(userId), eq(NotificationType.AI_ANALYSIS_COMPLETE), eq(pref)))
                .thenReturn(NotificationDispatchService.DispatchDecision.PUSH_AND_IN_APP);
        when(dispatchService.buildDedupKey(eq(userId), eq(NotificationType.AI_ANALYSIS_COMPLETE)))
                .thenReturn("77:AI_ANALYSIS_COMPLETE:test");
        when(templateService.getTemplate(eq(NotificationType.AI_ANALYSIS_COMPLETE), isNull(), eq(userId)))
                .thenReturn(template);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<Notification> result =
                service.generateNotification(userId, NotificationType.AI_ANALYSIS_COMPLETE, null, AnalysisType.ASTROLOGY);

        assertThat(result).isPresent();
        Notification saved = result.orElseThrow();
        assertThat(saved.getDeeplink()).isEqualTo("/(tabs)/calendar");
        assertThat(saved.getSourceModule()).isEqualTo("daily_transits");
        assertThat(saved.getAnalysisType()).isEqualTo(AnalysisType.ASTROLOGY);
    }

    @Test
    void shouldPersistCorrelationIdAndMetadataForAiResponses() {
        Long userId = 91L;
        UUID correlationId = UUID.randomUUID();
        NotificationPreference pref = NotificationPreference.builder()
                .userId(userId)
                .pushEnabled(false)
                .build();

        NotificationTemplateService.NotificationTemplate template =
                new NotificationTemplateService.NotificationTemplate(
                        "ai_analysis_complete",
                        "tr",
                        0,
                        "notifications",
                        "AI analizin tamamlandi",
                        "Rapor hazir.",
                        "/(tabs)/notifications"
                );

        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(pref));
        when(dispatchService.evaluate(eq(userId), eq(NotificationType.AI_ANALYSIS_COMPLETE), eq(pref)))
                .thenReturn(NotificationDispatchService.DispatchDecision.IN_APP_ONLY);
        when(dispatchService.buildDedupKey(eq(userId), eq(NotificationType.AI_ANALYSIS_COMPLETE)))
                .thenReturn("91:AI_ANALYSIS_COMPLETE:test");
        when(templateService.getTemplate(eq(NotificationType.AI_ANALYSIS_COMPLETE), isNull(), eq(userId)))
                .thenReturn(template);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<Notification> result = service.generateNotification(
                userId,
                NotificationType.AI_ANALYSIS_COMPLETE,
                null,
                AnalysisType.NATAL_CHART,
                correlationId,
                "{\"chartId\":91}"
        );

        assertThat(result).isPresent();
        Notification saved = result.orElseThrow();
        assertThat(saved.getCorrelationId()).isEqualTo(correlationId);
        assertThat(saved.getMetadata()).isEqualTo("{\"chartId\":91}");
        assertThat(saved.getAnalysisType()).isEqualTo(AnalysisType.NATAL_CHART);
    }
}
