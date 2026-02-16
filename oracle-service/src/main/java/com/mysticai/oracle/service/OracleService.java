package com.mysticai.oracle.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.oracle.dto.*;
import com.mysticai.oracle.prompt.OraclePromptTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreaker;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreakerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OracleService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final ReactiveCircuitBreakerFactory circuitBreakerFactory;

    /**
     * Fetches the Grand Synthesis - the mystical secret of the day.
     * Aggregates data from Numerology, Astrology (Natal Chart), and Dreams.
     */
    public Mono<OracleResponse> getDailySecret(Long userId, String name, String birthDate) {
        log.info("Fetching daily secret for user: {}", userId);

        // Fetch data from all services in parallel
        Mono<NumerologyData> numerologyMono = fetchNumerologyData(name, birthDate);
        Mono<NatalChartData> natalChartMono = fetchNatalChartData(userId);
        Mono<DreamData> dreamMono = fetchRecentDream(userId);
        Mono<String> transitsMono = fetchCurrentTransits();

        return Mono.zip(numerologyMono, natalChartMono, dreamMono, transitsMono)
                .map(tuple -> {
                    GrandSynthesisRequest request = new GrandSynthesisRequest(
                            tuple.getT1(),
                            tuple.getT2(),
                            tuple.getT3(),
                            tuple.getT4()
                    );
                    return generateSecret(request);
                })
                .onErrorResume(e -> {
                    log.error("Error fetching daily secret: {}", e.getMessage());
                    return Mono.just(createFallbackResponse());
                });
    }

    private Mono<NumerologyData> fetchNumerologyData(String name, String birthDate) {
        ReactiveCircuitBreaker circuitBreaker = circuitBreakerFactory.create("numerology-service");
        
        Mono<NumerologyData> remoteCall = webClientBuilder.build()
                .get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("lb")
                        .host("numerology-service")
                        .path("/api/v1/numerology/calculate")
                        .queryParam("name", name)
                        .queryParam("birthDate", birthDate)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::parseNumerologyResponse);
        
        return circuitBreaker.run(remoteCall, throwable -> {
            log.warn("Circuit breaker activated for numerology-service: {}", throwable.getMessage());
            return Mono.just(new NumerologyData(null, null, null, null));
        });
    }

    private NumerologyData parseNumerologyResponse(JsonNode response) {
        return new NumerologyData(
                response.has("lifePathNumber") ? response.get("lifePathNumber").asInt() : null,
                response.has("soulUrgeNumber") ? response.get("soulUrgeNumber").asInt() : null,
                response.has("destinyNumber") ? response.get("destinyNumber").asInt() : null,
                response.has("summary") ? response.get("summary").asText() : null
        );
    }

    private Mono<NatalChartData> fetchNatalChartData(Long userId) {
        ReactiveCircuitBreaker circuitBreaker = circuitBreakerFactory.create("astrology-service");
        
        Mono<NatalChartData> remoteCall = webClientBuilder.build()
                .get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("lb")
                        .host("astrology-service")
                        .path("/api/v1/astrology/natal-charts/user/{userId}/latest")
                        .build(userId))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::parseNatalChartResponse);
        
        return circuitBreaker.run(remoteCall, throwable -> {
            log.warn("Circuit breaker activated for astrology-service: {}", throwable.getMessage());
            return Mono.just(new NatalChartData(null, null, null, List.of(), null));
        });
    }

    private NatalChartData parseNatalChartResponse(JsonNode response) {
        String sunSign = response.has("sunSign") ? response.get("sunSign").asText() : null;
        String moonSign = response.has("moonSign") ? response.get("moonSign").asText() : null;
        String risingSign = response.has("risingSign") ? response.get("risingSign").asText() : null;
        String interpretation = response.has("aiInterpretation") ? response.get("aiInterpretation").asText() : null;

        List<NatalChartData.PlanetPosition> planets = List.of();
        if (response.has("planets") && response.get("planets").isArray()) {
            planets = response.get("planets").findValues("").stream()
                    .map(node -> new NatalChartData.PlanetPosition(
                            node.has("planet") ? node.get("planet").asText() : "",
                            node.has("sign") ? node.get("sign").asText() : "",
                            node.has("degree") ? node.get("degree").asInt() : 0,
                            node.has("house") ? node.get("house").asText() : ""
                    ))
                    .toList();
        }

        return new NatalChartData(sunSign, moonSign, risingSign, planets, interpretation);
    }

    private Mono<DreamData> fetchRecentDream(Long userId) {
        ReactiveCircuitBreaker circuitBreaker = circuitBreakerFactory.create("dream-service");
        
        Mono<DreamData> remoteCall = webClientBuilder.build()
                .get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("lb")
                        .host("dream-service")
                        .path("/api/v1/dreams/recent")
                        .build())
                .header("X-User-Id", userId.toString())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::parseDreamResponse);
        
        return circuitBreaker.run(remoteCall, throwable -> {
            log.warn("Circuit breaker activated for dream-service: {}", throwable.getMessage());
            return Mono.just(new DreamData(null, null, null, null));
        });
    }

    private DreamData parseDreamResponse(JsonNode response) {
        return new DreamData(
                response.has("dreamText") ? response.get("dreamText").asText() : null,
                response.has("mood") ? response.get("mood").asText() : null,
                response.has("recordedAt") ? LocalDateTime.parse(response.get("recordedAt").asText()) : null,
                response.has("aiInterpretation") ? response.get("aiInterpretation").asText() : null
        );
    }

    private Mono<String> fetchCurrentTransits() {
        // For now, return empty - this could be enhanced to fetch from astrology service
        return Mono.just("");
    }

    private OracleResponse generateSecret(GrandSynthesisRequest request) {
        String prompt = OraclePromptTemplates.createGrandSynthesisPrompt(request);
        
        // For now, generate a mystical message based on available data
        // In production, this would call the AI Orchestrator
        String secret = generateMysticalSecret(request);
        
        String numerologyInsight = request.numerology() != null && request.numerology().summary() != null
                ? request.numerology().summary()
                : "Kader sayilarin bugun seninle konusuyor.";
        
        String astrologyInsight = request.natalChart() != null && request.natalChart().aiInterpretation() != null
                ? request.natalChart().aiInterpretation()
                : "Gokyuzundeki gezegenler senin icin ozel bir dansa hazirlaniyor.";
        
        String dreamInsight = request.recentDream() != null && request.recentDream().aiInterpretation() != null
                ? request.recentDream().aiInterpretation()
                : "Bilincaltin bugun sana ozel mesajlarla dolu.";
        
        return new OracleResponse(
                secret,
                numerologyInsight,
                astrologyInsight,
                dreamInsight,
                "Gunun Sirri basariyla olusturuldu."
        );
    }

    private String generateMysticalSecret(GrandSynthesisRequest request) {
        StringBuilder secret = new StringBuilder();
        
        if (request.numerology() != null && request.numerology().lifePathNumber() != null) {
            secret.append(request.numerology().lifePathNumber()).append(" yasam yolunda, ");
        }
        
        if (request.natalChart() != null && request.natalChart().risingSign() != null) {
            secret.append(request.natalChart().risingSign()).append(" maskesiyle yuruyen sen, ");
        }
        
        secret.append("bugun gokyuzunde ozel bir enerji var. ");
        
        if (request.recentDream() != null && request.recentDream().dreamText() != null) {
            secret.append("Ruyanin getirdigi mesajlar bugun yolunu aydinlatiyor. ");
        }
        
        secret.append("Içindeki bilgelige guven ve kozmik akisinla ilerle.");
        
        return secret.toString();
    }

    private OracleResponse createFallbackResponse() {
        return new OracleResponse(
                "Bugun kozmik enerjiler seninle. Ic sesine kulak ver ve evrenin mesajlarina acik ol.",
                "Kader sayilarin seni koruyor.",
                "Yildizlar senin icin parliyor.",
                "Ruyalarin sana rehberlik ediyor.",
                "Varsayilan mesaj gosteriliyor - tum servisler erisilebilir degil."
        );
    }
}
