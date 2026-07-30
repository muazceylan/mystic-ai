package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.DreamExpansionRequest;
import com.mysticai.astrology.entity.DreamEntry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Component
public class DreamExpansionAiClient {

    private static final String INTERNAL_HEADER = "X-Internal-Service-Key";
    private final RestClient restClient;
    private final String internalGatewayKey;

    public DreamExpansionAiClient(
            @Value("${ai-orchestrator.url:http://localhost:8084}") String serviceUrl,
            @Value("${internal.gateway.key}") String internalGatewayKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(45_000);
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .requestFactory(factory)
                .build();
        this.internalGatewayKey = internalGatewayKey;
    }

    public String generate(DreamEntry dream, DreamExpansionRequest request, String historySummary) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("expansionType", request.expansionType().name());
        body.put("dreamText", dream.getText());
        body.put("baseAnalysis", dream.getAnalysisJson() != null
                ? dream.getAnalysisJson() : Objects.toString(dream.getInterpretation(), ""));
        body.put("targetElement", Objects.toString(request.targetElement(), ""));
        body.put("historySummary", historySummary);
        body.put("locale", request.locale() != null ? request.locale() : "tr");
        return restClient.post()
                .uri("/api/ai/dream/expand")
                .header(INTERNAL_HEADER, internalGatewayKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
    }
}
