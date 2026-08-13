package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thin internal client for the ai-orchestrator plan-refinement endpoint.
 *
 * Mirrors {@link com.mysticai.astrology.service.DreamExpansionAiClient}: the orchestrator owns
 * provider selection, retry and cooldown, so nothing here talks to a model provider directly.
 * Failures are returned as null rather than thrown — the caller's contract is that the plan is
 * served with rule-based copy whenever refinement is unavailable.
 */
@Component
@Slf4j
public class PersonalPlanAiClient {

    private static final String INTERNAL_HEADER = "X-Internal-Service-Key";

    private final RestClient restClient;
    private final String internalGatewayKey;

    public PersonalPlanAiClient(
            @Value("${ai-orchestrator.url:http://localhost:8084}") String serviceUrl,
            @Value("${internal.gateway.key}") String internalGatewayKey,
            PersonalPlanProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getAiConnectTimeoutMs());
        factory.setReadTimeout(properties.getAiReadTimeoutMs());
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .requestFactory(factory)
                .build();
        this.internalGatewayKey = internalGatewayKey;
    }

    /**
     * @param items slots to reword; each map carries id, kind, title and body
     * @return raw JSON body, or null when the orchestrator is unavailable or errors
     */
    public String refine(String locale, List<Map<String, String>> items) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("locale", locale);
        body.put("items", items);
        try {
            return restClient.post()
                    .uri("/api/ai/plan/refine")
                    .header(INTERNAL_HEADER, internalGatewayKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("Personal plan refinement call failed ({}); serving rule-based copy.",
                    e.getClass().getSimpleName());
            return null;
        }
    }
}
