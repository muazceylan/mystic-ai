package com.mysticai.orchestrator.listener;

import com.mysticai.orchestrator.config.RabbitMQConfig;
import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import com.mysticai.orchestrator.service.AnalysisResultPublisher;
import com.mysticai.orchestrator.service.MysticalAiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Listener for AI analysis requests from various services (Dream, Tarot, Astrology, etc.).
 * Processes incoming analysis requests and generates AI-based interpretations.
 */
@Component
public class AiRequestListener {

    private static final Logger logger = LoggerFactory.getLogger(AiRequestListener.class);

    private final MysticalAiService mysticalAiService;
    private final AnalysisResultPublisher resultPublisher;

    public AiRequestListener(MysticalAiService mysticalAiService, AnalysisResultPublisher resultPublisher) {
        this.mysticalAiService = mysticalAiService;
        this.resultPublisher = resultPublisher;
    }

    @RabbitListener(queues = RabbitMQConfig.AI_REQUESTS_QUEUE)
    public void handleAiAnalysisRequest(AiAnalysisEvent event) {
        logger.info("Received AI analysis request - correlationId: {}, source: {}, type: {}",
                event.correlationId(), event.sourceService(), event.analysisType());

        try {
            // Generate AI interpretation using Spring AI
            String interpretation = mysticalAiService.generateInterpretation(event);
            
            logger.info("AI interpretation generated - correlationId: {}, result length: {}, result: {}",
                    event.correlationId(), interpretation.length(),interpretation);
            
            // Create and publish success response
            AiAnalysisResponseEvent response = AiAnalysisResponseEvent.success(event, interpretation);
            resultPublisher.publishSuccess(response);
            
            logger.info("Analysis result published - correlationId: {}", event.correlationId());
            
        } catch (Exception e) {
            logger.error("Error processing AI analysis request - correlationId: {}, error: {}",
                    event.correlationId(), e.getMessage(), e);
            
            // Publish failure response
            AiAnalysisResponseEvent response = AiAnalysisResponseEvent.failure(event, e.getMessage());
            resultPublisher.publishFailure(response);
        }
    }
}
