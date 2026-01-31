package com.mysticai.orchestrator.controller;

import com.mysticai.orchestrator.config.RabbitMQConfig;
import com.mysticai.orchestrator.dto.TarotInterpretationRequest;
import com.mysticai.orchestrator.dto.TarotInterpretationResponse;
import com.mysticai.orchestrator.service.TarotInterpretationService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class InterpretationController {

    private final TarotInterpretationService interpretationService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Synchronous interpretation - waits for AI response
     */
    @PostMapping("/interpret/tarot")
    public ResponseEntity<TarotInterpretationResponse> interpretSync(
            @RequestBody TarotInterpretationRequest request
    ) {
        TarotInterpretationResponse response = interpretationService.interpret(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Asynchronous interpretation - queues for processing
     */
    @PostMapping("/interpret/tarot/async")
    public ResponseEntity<String> interpretAsync(
            @RequestBody TarotInterpretationRequest request
    ) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.AI_EXCHANGE,
                RabbitMQConfig.AI_ROUTING_KEY,
                request
        );
        return ResponseEntity.accepted()
                .body("Interpretation queued for reading: " + request.readingId());
    }

    /**
     * Get cached interpretation from Redis
     */
    @GetMapping("/interpret/tarot/{readingId}")
    public ResponseEntity<TarotInterpretationResponse> getCachedInterpretation(
            @PathVariable Long readingId
    ) {
        TarotInterpretationResponse cached = interpretationService.getCachedInterpretation(readingId);
        if (cached == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(cached);
    }

    /**
     * Health check for AI service
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("AI Orchestrator is running");
    }
}
