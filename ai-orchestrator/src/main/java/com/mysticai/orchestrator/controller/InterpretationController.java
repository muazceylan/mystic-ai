package com.mysticai.orchestrator.controller;

import com.mysticai.orchestrator.dto.OracleInterpretationRequest;
import com.mysticai.orchestrator.service.MysticalAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class InterpretationController {

    private final MysticalAiService mysticalAiService;

    /**
     * POST /api/ai/oracle/daily-secret
     *
     * Synchronous oracle synthesis endpoint called by oracle-service.
     * Accepts full user context and returns the AI-generated JSON string.
     * This is an internal service-to-service endpoint — not exposed via gateway.
     */
    @PostMapping(value = "/oracle/daily-secret", consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> oracleDailySecret(@RequestBody OracleInterpretationRequest request) {
        try {
            String aiJson = mysticalAiService.generateOracleInterpretation(request);
            return ResponseEntity.ok(aiJson);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(null);
        }
    }

    /**
     * POST /api/ai/dream/extract-symbols
     *
     * Synchronous dream symbol extraction called by astrology-service.
     * Returns JSON array of core symbolic elements from the dream text.
     */
    @PostMapping(value = "/dream/extract-symbols",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> extractDreamSymbols(@RequestBody java.util.Map<String, String> body) {
        String dreamText = body.getOrDefault("dreamText", "");
        if (dreamText.isBlank()) {
            return ResponseEntity.ok("[]");
        }
        try {
            String symbols = mysticalAiService.extractDreamSymbols(dreamText);
            return ResponseEntity.ok(symbols);
        } catch (Exception e) {
            return ResponseEntity.ok("[]");
        }
    }

    /**
     * POST /api/ai/dream/symbol-meaning
     *
     * Returns Jungian psychological meaning for a dream symbol.
     * Body: {symbolName, userCount, houseAssociation}
     */
    @PostMapping(value = "/dream/symbol-meaning",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getSymbolMeaning(@RequestBody java.util.Map<String, Object> body) {
        String symbolName = (String) body.getOrDefault("symbolName", "");
        int userCount = body.containsKey("userCount") ? ((Number) body.get("userCount")).intValue() : 1;
        String house = (String) body.getOrDefault("houseAssociation", "Bilinmiyor");
        if (symbolName.isBlank()) return ResponseEntity.ok("{}");
        try {
            return ResponseEntity.ok(mysticalAiService.getSymbolMeaning(symbolName, userCount, house));
        } catch (Exception e) {
            return ResponseEntity.ok("{}");
        }
    }

    /**
     * POST /api/ai/dream/collective-pulse-reason
     *
     * Returns astro reasoning text for collective dream pulse.
     * Body: {topSymbols, currentTransits}
     */
    @PostMapping(value = "/dream/collective-pulse-reason",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> collectivePulseReason(@RequestBody java.util.Map<String, String> body) {
        String symbols = body.getOrDefault("topSymbols", "");
        String transits = body.getOrDefault("currentTransits", "");
        if (symbols.isBlank()) return ResponseEntity.ok("Kolektif bilinçdışı harekete geçiyor.");
        try {
            return ResponseEntity.ok(mysticalAiService.getCollectivePulseReason(symbols, transits));
        } catch (Exception e) {
            return ResponseEntity.ok("Gökyüzündeki gezegenler bugün kolektif bilinçdışını harekete geçiriyor.");
        }
    }

    /**
     * Health check for AI service
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("AI Orchestrator is running");
    }
}
