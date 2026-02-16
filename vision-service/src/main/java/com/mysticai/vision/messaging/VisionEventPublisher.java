package com.mysticai.vision.messaging;

import com.mysticai.vision.event.VisionAnalysisEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Vision Event Publisher - AI Orchestrator'a görsel analiz isteklerini gönderir.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VisionEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${mystic.rabbitmq.exchange:ai.exchange}")
    private String exchange;

    @Value("${mystic.rabbitmq.vision-routing-key:ai.vision.analysis}")
    private String visionRoutingKey;

    /**
     * Vision analiz isteğini RabbitMQ'ya gönder.
     */
    public void publishVisionAnalysisRequest(VisionAnalysisEvent event) {
        log.info("Publishing vision analysis request for user {}: {}", 
                event.userId(), event.correlationId());
        
        try {
            rabbitTemplate.convertAndSend(exchange, visionRoutingKey, event);
            log.info("Vision analysis request published successfully: {}", event.correlationId());
        } catch (Exception e) {
            log.error("Failed to publish vision analysis request: {}", event.correlationId(), e);
            throw new RuntimeException("Failed to publish vision analysis request", e);
        }
    }
}
