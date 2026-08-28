package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Synchronous bridge to the AI orchestrator for natal interpretation.
 *
 * <p>Goes through the orchestrator rather than a provider SDK on purpose: provider selection,
 * fallback chains, cooldowns and timeouts already live there, and duplicating that here would
 * create a second, divergent AI stack.</p>
 *
 * <p>The call is synchronous because a portrait is generated once per chart and then cached — the
 * caller is a background-friendly path, not a screen render. The read timeout is generous for the
 * same reason: a slow first generation is far better than a failed one.</p>
 */
@Slf4j
@Component
public class NatalPortraitAiClient {

    private static final String INTERNAL_HEADER = "X-Internal-Service-Key";

    private final RestClient restClient;
    private final String internalGatewayKey;

    public NatalPortraitAiClient(
            @Value("${ai-orchestrator.url:http://localhost:8084}") String serviceUrl,
            @Value("${internal.gateway.key}") String internalGatewayKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(90_000);
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .requestFactory(factory)
                .build();
        this.internalGatewayKey = internalGatewayKey;
    }

    /**
     * @param correction non-null on the retry pass, describing exactly what the validator rejected
     *                   so the model can fix that specific claim instead of regenerating blindly.
     */
    public String generatePortrait(NormalizedNatalChart chart, String locale, String correction) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("chart", chart);
        body.put("locale", locale);
        if (correction != null && !correction.isBlank()) {
            body.put("correction", correction);
        }
        return restClient.post()
                .uri("/api/ai/natal/portrait")
                .header(INTERNAL_HEADER, internalGatewayKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
    }

    /** "Haritama Sor" — a free-text question answered strictly from the user's own chart. */
    public String askChart(NormalizedNatalChart chart, String locale, String question) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("chart", chart);
        body.put("locale", locale);
        body.put("question", question);
        return restClient.post()
                .uri("/api/ai/natal/ask")
                .header(INTERNAL_HEADER, internalGatewayKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
    }
}
