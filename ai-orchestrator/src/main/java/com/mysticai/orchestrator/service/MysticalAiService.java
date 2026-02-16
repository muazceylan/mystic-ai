package com.mysticai.orchestrator.service;

import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.orchestrator.prompt.MysticalPromptTemplates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * Service for generating mystical AI interpretations using Spring AI ChatClient.
 * Combines the appropriate prompt template with the AI model for deep analysis.
 */
@Service
public class MysticalAiService {

    private static final Logger logger = LoggerFactory.getLogger(MysticalAiService.class);

    private final ChatClient chatClient;
    private final MysticalPromptTemplates promptTemplates;
    private final MockInterpretationService mockInterpretationService;

    public MysticalAiService(ChatClient chatClient, MysticalPromptTemplates promptTemplates,
                             MockInterpretationService mockInterpretationService) {
        this.chatClient = chatClient;
        this.promptTemplates = promptTemplates;
        this.mockInterpretationService = mockInterpretationService;
    }

    /**
     * Generates a mystical interpretation based on the analysis event.
     */
    public String generateInterpretation(AiAnalysisEvent event) {
        String prompt = buildPrompt(event);
        
        logger.info("Generating interpretation for correlationId: {}, source: {}", 
                event.correlationId(), event.sourceService());
        
        try {
            String response = callAiModel(prompt);
            
            logger.info("AI interpretation generated for correlationId: {}, response length: {}", 
                    event.correlationId(), response.length());
            
            return response;
        } catch (Exception e) {
            logger.error("Error generating AI interpretation for correlationId: {}", 
                    event.correlationId(), e);
            throw new RuntimeException("AI interpretation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Builds the appropriate prompt based on the event type.
     */
    private String buildPrompt(AiAnalysisEvent event) {
        // Handle specific analysis types first
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.SWOT) {
            return promptTemplates.getSwotAnalysisPrompt(
                    extractFromPayload(event.payload(), "birthChart"),
                    extractFromPayload(event.payload(), "currentTransits"),
                    extractFromPayload(event.payload(), "question")
            );
        }

        if (event.analysisType() == AiAnalysisEvent.AnalysisType.PERIODIC) {
            return promptTemplates.getPeriodicAnalysisPrompt(
                    extractFromPayload(event.payload(), "sunSign"),
                    extractFromPayload(event.payload(), "moonSign"),
                    extractFromPayload(event.payload(), "period"),
                    extractFromPayload(event.payload(), "natalChart")
            );
        }

        if (event.analysisType() == AiAnalysisEvent.AnalysisType.NATAL_CHART) {
            return promptTemplates.getNatalChartInterpretationPrompt(event.payload());
        }
        
        return switch (event.sourceService()) {
            case DREAM -> {
                String dreamContent = extractDreamContent(event.payload());
                yield promptTemplates.getDreamInterpretationPrompt(dreamContent);
            }
            case TAROT -> {
                String cardInfo = extractCardInfo(event.payload());
                String question = extractQuestion(event.payload());
                yield promptTemplates.getTarotInterpretationPrompt(cardInfo, question);
            }
            case ASTROLOGY -> {
                String chartInfo = extractChartInfo(event.payload());
                yield promptTemplates.getAstrologyInterpretationPrompt(chartInfo);
            }
            case NUMEROLOGY -> {
                String numerologyInfo = event.payload();
                yield promptTemplates.getGenericInterpretationPrompt(event);
            }
            default -> promptTemplates.getGenericInterpretationPrompt(event);
        };
    }

    /**
     * Calls the AI model via ChatClient with mock fallback on failure.
     */
    private String callAiModel(String prompt) {
        try {
            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            logger.warn("AI API call failed, using mock fallback: {}", e.getMessage());
            return mockInterpretationService.generateFallback(prompt);
        }
    }

    private String extractDreamContent(String payload) {
        if (payload == null || payload.isEmpty()) {
            return "Rüya içeriği mevcut değil";
        }
        
        // Try to extract dreamText from JSON payload
        if (payload.contains("dreamText")) {
            int start = payload.indexOf("dreamText") + 11;
            int end = payload.indexOf("\"", start);
            if (end > start) {
                return payload.substring(start, end).replace("\\n", "\n").replace("\\\"", "\"");
            }
        }
        
        return payload;
    }

    private String extractCardInfo(String payload) {
        if (payload == null || payload.isEmpty()) {
            return "Kart bilgisi mevcut değil";
        }
        return payload;
    }

    private String extractQuestion(String payload) {
        if (payload == null || payload.isEmpty()) {
            return "Soru sorulmamış";
        }
        return payload;
    }

    private String extractChartInfo(String payload) {
        if (payload == null || payload.isEmpty()) {
            return "Harita bilgisi mevcut değil";
        }
        return payload;
    }

    /**
     * Extracts a value from JSON-like payload by key.
     */
    private String extractFromPayload(String payload, String key) {
        if (payload == null || payload.isEmpty()) {
            return key + " mevcut değil";
        }
        
        String searchKey = "\"" + key + "\":";
        int keyIndex = payload.indexOf(searchKey);
        
        if (keyIndex == -1) {
            // Try with space after colon
            searchKey = "\"" + key + "\": ";
            keyIndex = payload.indexOf(searchKey);
        }
        
        if (keyIndex == -1) {
            return key + " mevcut değil";
        }
        
        int start = keyIndex + searchKey.length();
        int end = payload.indexOf(",", start);
        if (end == -1) {
            end = payload.indexOf("}", start);
        }
        
        if (end == -1) {
            return key + " mevcut değil";
        }
        
        String value = payload.substring(start, end).trim()
                .replace("\"", "")
                .replace("\\n", "\n");
        
        return value.isEmpty() ? key + " mevcut değil" : value;
    }
}
