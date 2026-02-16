package com.mysticai.dream.listener;

import com.mysticai.dream.config.RabbitMQConfig;
import com.mysticai.dream.entity.Dream;
import com.mysticai.dream.repository.DreamRepository;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listener for AI analysis response events from the AI Orchestrator.
 * Updates dream records with the generated interpretations.
 */
@Component
public class DreamResponseListener {

    private static final Logger logger = LoggerFactory.getLogger(DreamResponseListener.class);

    private final DreamRepository dreamRepository;

    public DreamResponseListener(DreamRepository dreamRepository) {
        this.dreamRepository = dreamRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.AI_RESPONSES_QUEUE)
    @Transactional
    public void handleAnalysisResponse(AiAnalysisResponseEvent response) {
        logger.info("Received AI analysis response - correlationId: {}, success: {}",
                response.correlationId(), response.success());

        if (response.sourceService() != com.mysticai.common.event.AiAnalysisEvent.SourceService.DREAM) {
            logger.debug("Ignoring response for non-DREAM service: {}", response.sourceService());
            return;
        }

        Long dreamId = extractDreamId(response.originalPayload());
        if (dreamId == null) {
            logger.error("Could not extract dreamId from response - correlationId: {}", 
                    response.correlationId());
            return;
        }

        try {
            Dream dream = dreamRepository.findById(dreamId)
                    .orElseThrow(() -> new IllegalArgumentException("Dream not found with id: " + dreamId));

            if (response.success()) {
                // Update dream with interpretation
                dream.setInterpretationStatus(Dream.InterpretationStatus.COMPLETED);
                dream.setInterpretation(response.interpretation());
                logger.info("Dream {} interpretation completed - correlationId: {}", 
                        dreamId, response.correlationId());
            } else {
                // Mark as failed
                dream.setInterpretationStatus(Dream.InterpretationStatus.FAILED);
                logger.error("Dream {} interpretation failed - correlationId: {}, error: {}", 
                        dreamId, response.correlationId(), response.errorMessage());
            }

            dreamRepository.save(dream);
            logger.info("Dream {} updated with interpretation status: {}", 
                    dreamId, dream.getInterpretationStatus());

        } catch (Exception e) {
            logger.error("Error processing AI response for dream {} - correlationId: {}, error: {}",
                    dreamId, response.correlationId(), e.getMessage(), e);
        }
    }

    private Long extractDreamId(String payload) {
        if (payload == null || !payload.contains("dreamId")) {
            return null;
        }
        try {
            int start = payload.indexOf("dreamId") + 9;
            int end = payload.indexOf(",", start);
            if (end == -1) {
                end = payload.indexOf("}", start);
            }
            String idStr = payload.substring(start, end).trim();
            return Long.parseLong(idStr);
        } catch (Exception e) {
            return null;
        }
    }
}
