package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.DreamExpansionConfigResponse;
import com.mysticai.astrology.dto.DreamExpansionType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Component
public class DreamExpansionMonetizationClient {

    private static final String INTERNAL_HEADER = "X-Internal-Service-Key";
    private final RestClient restClient;
    private final String internalGatewayKey;

    public DreamExpansionMonetizationClient(
            @Value("${notification-service.url:http://localhost:8088}") String serviceUrl,
            @Value("${internal.gateway.key}") String internalGatewayKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .requestFactory(factory)
                .build();
        this.internalGatewayKey = internalGatewayKey;
    }

    public DreamExpansionConfigResponse getConfig(Long userId) {
        return restClient.get()
                .uri(uri -> uri.path("/api/v1/monetization/internal/dream-expansions/config")
                        .queryParam("userId", userId).build())
                .header(INTERNAL_HEADER, internalGatewayKey)
                .retrieve()
                .body(DreamExpansionConfigResponse.class);
    }

    public ReservationResponse reserve(Long userId, Long dreamId,
                                       DreamExpansionType expansionType, String idempotencyKey,
                                       String pricingVersion) {
        return restClient.post()
                .uri("/api/v1/monetization/internal/dream-expansions/reservations")
                .header(INTERNAL_HEADER, internalGatewayKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "userId", userId,
                        "dreamId", dreamId,
                        "expansionType", expansionType.name(),
                        "idempotencyKey", "dream-expansion:" + idempotencyKey,
                        "pricingVersion", pricingVersion
                ))
                .retrieve()
                .body(ReservationResponse.class);
    }

    public ReservationResponse settle(UUID reservationId, Long userId, UUID expansionId,
                                      String promptVersion, boolean commit) {
        return restClient.post()
                .uri("/api/v1/monetization/internal/dream-expansions/reservations/{id}/{operation}",
                        reservationId, commit ? "commit" : "cancel")
                .header(INTERNAL_HEADER, internalGatewayKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "userId", userId,
                        "expansionId", expansionId,
                        "promptVersion", promptVersion
                ))
                .retrieve()
                .body(ReservationResponse.class);
    }

    public record ReservationResponse(
            UUID reservationId,
            String status,
            int cost,
            int currentBalance,
            UUID ledgerTransactionId,
            LocalDateTime expiresAt
    ) {}
}
