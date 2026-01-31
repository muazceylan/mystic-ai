package com.mysticai.orchestrator.listener;

import com.mysticai.orchestrator.config.RabbitMQConfig;
import com.mysticai.orchestrator.dto.TarotInterpretationRequest;
import com.mysticai.orchestrator.dto.TarotInterpretationResponse;
import com.mysticai.orchestrator.service.TarotInterpretationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TarotInterpretationListener {

    private final TarotInterpretationService interpretationService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConfig.AI_INTERPRETATION_QUEUE)
    public void handleTarotInterpretation(TarotInterpretationRequest request) {
        log.info("Received interpretation request for reading: {}", request.readingId());

        try {
            TarotInterpretationResponse response = interpretationService.interpret(request);

            log.info("Successfully interpreted reading: {}", request.readingId());

            // Notify completion (optional - for real-time updates)
            notifyCompletion(response);

        } catch (Exception e) {
            log.error("Failed to interpret reading: {}. Error: {}", request.readingId(), e.getMessage(), e);
            handleError(request, e);
        }
    }

    private void notifyCompletion(TarotInterpretationResponse response) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.AI_EXCHANGE,
                    RabbitMQConfig.NOTIFICATION_ROUTING_KEY,
                    response
            );
            log.debug("Sent completion notification for reading: {}", response.readingId());
        } catch (Exception e) {
            log.warn("Failed to send notification for reading: {}", response.readingId(), e);
        }
    }

    private void handleError(TarotInterpretationRequest request, Exception e) {
        // Could implement retry logic, dead letter queue, or error notifications here
        log.error("Error processing reading {}: {}", request.readingId(), e.getMessage());
    }
}
