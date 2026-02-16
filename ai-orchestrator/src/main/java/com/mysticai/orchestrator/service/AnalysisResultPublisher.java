package com.mysticai.orchestrator.service;

import com.mysticai.orchestrator.config.RabbitMQConfig;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/**
 * Publishes AI analysis results to the responses queue.
 * Allows source services to consume and process the interpretations.
 */
@Service
public class AnalysisResultPublisher {

    private static final Logger logger = LoggerFactory.getLogger(AnalysisResultPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public AnalysisResultPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publishes a successful analysis result to the responses queue.
     */
    public void publishSuccess(AiAnalysisResponseEvent response) {
        logger.info("Publishing successful analysis result - correlationId: {}", 
                response.correlationId());
        
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.AI_EXCHANGE,
                RabbitMQConfig.AI_RESPONSE_ROUTING_KEY,
                response
        );
        
        logger.debug("Analysis result published to queue - correlationId: {}", 
                response.correlationId());
    }

    /**
     * Publishes a failed analysis result to the responses queue.
     */
    public void publishFailure(AiAnalysisResponseEvent response) {
        logger.error("Publishing failed analysis result - correlationId: {}, error: {}", 
                response.correlationId(), response.errorMessage());
        
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.AI_EXCHANGE,
                RabbitMQConfig.AI_RESPONSE_ROUTING_KEY,
                response
        );
    }
}
