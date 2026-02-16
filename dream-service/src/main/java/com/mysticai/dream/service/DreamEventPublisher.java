package com.mysticai.dream.service;

import com.mysticai.dream.config.RabbitMQConfig;
import com.mysticai.common.event.AiAnalysisEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class DreamEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(DreamEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public DreamEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publishes a dream analysis request to the AI Orchestrator queue.
     * This triggers asynchronous AI analysis of the dream.
     */
    public void publishDreamAnalysisRequest(Long userId, String dreamText, Long dreamId) {
        AiAnalysisEvent event = new AiAnalysisEvent(
                userId,
                dreamText,
                AiAnalysisEvent.SourceService.DREAM,
                AiAnalysisEvent.AnalysisType.INTERPRETATION
        );
        
        // Add correlation info to payload for tracking
        String enrichedPayload = String.format("""
            {
                "dreamId": %d,
                "userId": %d,
                "dreamText": "%s"
            }
            """, dreamId, userId, dreamText.replace("\"", "\\\""));

        AiAnalysisEvent enrichedEvent = new AiAnalysisEvent(
                userId,
                enrichedPayload,
                AiAnalysisEvent.SourceService.DREAM,
                AiAnalysisEvent.AnalysisType.INTERPRETATION
        );

        logger.info("Publishing dream analysis request - correlationId: {}, dreamId: {}, userId: {}",
                enrichedEvent.correlationId(), dreamId, userId);

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.AI_EXCHANGE,
                RabbitMQConfig.AI_REQUEST_ROUTING_KEY,
                enrichedEvent
        );

        logger.debug("Dream analysis request published successfully - correlationId: {}",
                enrichedEvent.correlationId());
    }
}
