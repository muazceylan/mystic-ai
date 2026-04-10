package com.mysticai.notification.listener;

import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.service.NotificationGenerationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiResponseListenerTest {

    @Mock NotificationGenerationService generationService;
    @Mock NotificationRepository notificationRepository;

    @InjectMocks AiResponseListener listener;

    @Test
    void shouldGenerateNotificationOnceForSuccessfulNatalChartResponse() {
        UUID correlationId = UUID.randomUUID();
        AiAnalysisResponseEvent event = new AiAnalysisResponseEvent(
                correlationId,
                42L,
                "{\"chartId\":99}",
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.NATAL_CHART,
                "{\"summary\":\"ok\"}",
                true,
                null,
                LocalDateTime.now()
        );

        when(notificationRepository.findByCorrelationId(correlationId)).thenReturn(Optional.empty());

        listener.handleAiResponse(event);

        verify(generationService).generateNotification(
                eq(42L),
                eq(Notification.NotificationType.AI_ANALYSIS_COMPLETE),
                eq(null),
                eq(Notification.AnalysisType.NATAL_CHART),
                eq(correlationId),
                eq("{\"chartId\":99}")
        );
    }

    @Test
    void shouldSkipDuplicateCorrelationId() {
        UUID correlationId = UUID.randomUUID();
        AiAnalysisResponseEvent event = new AiAnalysisResponseEvent(
                correlationId,
                42L,
                "{\"chartId\":99}",
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.NATAL_CHART,
                "{\"summary\":\"ok\"}",
                true,
                null,
                LocalDateTime.now()
        );

        when(notificationRepository.findByCorrelationId(correlationId))
                .thenReturn(Optional.of(Notification.builder().userId(42L).build()));

        listener.handleAiResponse(event);

        verify(generationService, never()).generateNotification(
                eq(42L),
                eq(Notification.NotificationType.AI_ANALYSIS_COMPLETE),
                eq(null),
                eq(Notification.AnalysisType.NATAL_CHART),
                eq(correlationId),
                eq("{\"chartId\":99}")
        );
    }

    @Test
    void shouldSkipFailedAiResponses() {
        UUID correlationId = UUID.randomUUID();
        AiAnalysisResponseEvent event = new AiAnalysisResponseEvent(
                correlationId,
                42L,
                "{\"chartId\":99}",
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.NATAL_CHART,
                null,
                false,
                "boom",
                LocalDateTime.now()
        );

        listener.handleAiResponse(event);

        verify(notificationRepository, never()).findByCorrelationId(correlationId);
        verify(generationService, never()).generateNotification(
                eq(42L),
                eq(Notification.NotificationType.AI_ANALYSIS_COMPLETE),
                eq(null),
                eq(Notification.AnalysisType.NATAL_CHART),
                eq(correlationId),
                eq("{\"chartId\":99}")
        );
    }
}
