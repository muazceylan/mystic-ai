package com.mysticai.vision.messaging;

import com.mysticai.vision.entity.VisionAnalysis;
import com.mysticai.vision.repository.VisionAnalysisRepository;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Vision Response Listener - AI Orchestrator'dan gelen görsel analiz yanıtlarını dinler.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VisionResponseListener {

    private final VisionAnalysisRepository visionRepository;

    @RabbitListener(queues = "ai.responses.vision.queue")
    @Transactional
    public void handleVisionResponse(AiAnalysisResponseEvent event) {
        log.info("Received vision analysis response for correlationId: {}", event.correlationId());

        try {
            visionRepository.findByCorrelationId(event.correlationId())
                    .ifPresentOrElse(
                            analysis -> updateAnalysis(analysis, event),
                            () -> log.warn("Vision analysis not found for correlationId: {}", 
                                    event.correlationId())
                    );
        } catch (Exception e) {
            log.error("Error processing vision response for correlationId: {}", 
                    event.correlationId(), e);
        }
    }

    private void updateAnalysis(VisionAnalysis analysis, AiAnalysisResponseEvent event) {
        if (event.success()) {
            analysis.setAiInterpretation(event.interpretation());
            analysis.setStatus(VisionAnalysis.AnalysisStatus.COMPLETED);
            analysis.setCompletedAt(event.processedAt());
            log.info("Vision analysis completed for user {}: {}", 
                    analysis.getUserId(), analysis.getId());
        } else {
            analysis.setStatus(VisionAnalysis.AnalysisStatus.FAILED);
            analysis.setAiInterpretation("Analiz sırasında bir hata oluştu: " + event.errorMessage());
            log.error("Vision analysis failed for user {}: {}", 
                    analysis.getUserId(), event.errorMessage());
        }
        
        visionRepository.save(analysis);
    }
}
