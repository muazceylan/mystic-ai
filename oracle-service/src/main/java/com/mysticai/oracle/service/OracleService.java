package com.mysticai.oracle.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.oracle.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreaker;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreakerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OracleService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final ReactiveCircuitBreakerFactory circuitBreakerFactory;
    private final StringRedisTemplate redisTemplate;

    @Value("${internal.gateway.key}")
    private String internalGatewayKey;

    private static final String ORACLE_CACHE_PREFIX = "oracle:daily:";
    private static final String ORACLE_PROMPT_VERSION = "oracle-home-v2";

    /**
     * Main entry point. Checks Redis cache first (key = oracle:daily:{userId}:{date}).
     * Returns cached result if today's record exists; otherwise fetches, computes, and caches.
     */
    public Mono<OracleResponse> getDailySecret(Long userId, String name, String birthDate,
                                               String maritalStatus, String focusPoint) {
        String cacheKey = ORACLE_CACHE_PREFIX + userId + ":" + LocalDate.now();
        return checkDailyCache(cacheKey)
                .switchIfEmpty(computeDailySecret(userId, name, birthDate, maritalStatus, focusPoint, cacheKey));
    }

    public Mono<HomeBriefResponse> getHomeBrief(
            Long userId,
            String username,
            String name,
            String birthDate,
            String maritalStatus,
            String focusPoint) {

        Mono<OracleResponse> oracleMono = getDailySecret(userId, name, birthDate, maritalStatus, focusPoint);
        Mono<List<HomeBriefResponse.WeeklyCard>> weeklyCardsMono = fetchWeeklyCards(userId);

        return Mono.zip(oracleMono, weeklyCardsMono)
                .map(tuple -> {
                    OracleResponse oracle = tuple.getT1();
                    List<HomeBriefResponse.WeeklyCard> weeklyCards = tuple.getT2();
                    String displayName = firstNonBlank(name, username, "Kullanici");
                    String dailyEnergy = normalizeHomeCopy(
                            firstNonBlank(oracle.dailyVibe(), oracle.message(), "Bugün ritmini sakin tut, netlik geliyor."),
                            "Bugün ritmini sakin tut, netlik geliyor.",
                            120);
                    String transitHeadline = normalizeHomeCopy(
                            firstNonBlank(oracle.transitHeadline(), oracle.astrologyInsight(), "Günün akışı bugün lehine dönüyor."),
                            "Günün akışı bugün lehine dönüyor.",
                            96);
                    String actionMessage = normalizeHomeAction(
                            firstNonBlank(oracle.message(), "Küçük ama net bir adım at."),
                            focusPoint);
                    String transitSummary = normalizeHomeSummary(
                            firstNonBlank(oracle.transitSummary(), oracle.numerologyInsight(), "Dengeyi korudukça hızlanacaksın."),
                            actionMessage,
                            transitHeadline,
                            dailyEnergy,
                            focusPoint);

                    return new HomeBriefResponse(
                            "Merhaba " + displayName + ", bugün haritanda neler var bakalım.",
                            dailyEnergy,
                            transitHeadline,
                            transitSummary,
                            oracle.transitPoints(),
                            toSingleSentence(oracle.secret(), "Bugün sezgine güven.", 110),
                            actionMessage,
                            weeklyCards,
                            new HomeBriefResponse.Meta(
                                    firstNonBlank(oracle.promptVersion(), ORACLE_PROMPT_VERSION),
                                    firstNonBlank(oracle.promptVariant(), "A"),
                                    oracle.readabilityScore(),
                                    oracle.impactScore()
                            ),
                            oracle.generatedAt()
                    );
                });
    }

    // ─── Cache helpers ────────────────────────────────────────────────────────────

    private Mono<OracleResponse> checkDailyCache(String cacheKey) {
        return Mono.<OracleResponse>fromCallable(() -> {
                    String cached = redisTemplate.opsForValue().get(cacheKey);
                    if (cached == null) return null;
                    OracleResponse response = objectMapper.readValue(cached, OracleResponse.class);
                    log.debug("Oracle daily cache hit for key {}", cacheKey);
                    return response;
                })
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(r -> r != null ? Mono.just(r) : Mono.empty())
                .onErrorResume(e -> {
                    log.debug("Daily oracle cache miss for key {}: {}", cacheKey, e.getMessage());
                    return Mono.empty();
                });
    }

    private void persistDailyCache(String cacheKey, OracleResponse response) {
        try {
            LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
            LocalDateTime midnightUtc = nowUtc.toLocalDate().plusDays(1).atStartOfDay();
            long ttlSeconds = Math.max(Duration.between(nowUtc, midnightUtc).getSeconds(), 300L);
            redisTemplate.opsForValue().set(
                    cacheKey, objectMapper.writeValueAsString(response), ttlSeconds, TimeUnit.SECONDS);
            log.debug("Cached oracle secret for key {} (TTL {}s)", cacheKey, ttlSeconds);
        } catch (Exception e) {
            log.debug("Failed to cache oracle response for key {}: {}", cacheKey, e.getMessage());
        }
    }

    // ─── Core computation ─────────────────────────────────────────────────────────

    private Mono<OracleResponse> computeDailySecret(Long userId, String name, String birthDate,
                                                     String maritalStatus, String focusPoint,
                                                     String cacheKey) {
        log.info("Computing daily secret for user: {}", userId);

        Mono<NumerologyData> numerologyMono = fetchNumerologyData(name, birthDate);
        Mono<NatalChartData> natalChartMono = fetchNatalChartData(userId);
        Mono<DreamData> dreamMono = fetchRecentDream(userId);
        Mono<SkyPulseSummary> skyPulseMono = fetchSkyPulseSummary();

        return Mono.zip(numerologyMono, natalChartMono, dreamMono, skyPulseMono)
                .flatMap(tuple -> {
                    SkyPulseSummary sky = tuple.getT4();
                    GrandSynthesisRequest synthesis = new GrandSynthesisRequest(
                            tuple.getT1(),
                            tuple.getT2(),
                            tuple.getT3(),
                            sky.moonPhase(),
                            sky.moonSignTurkish(),
                            sky.retrogradePlanets()
                    );

                    String promptVariant = choosePromptVariant(userId);
                    // Build the AI request with all user context
                    AiSynthesisRequest aiRequest = buildAiRequest(
                            synthesis, name, birthDate, maritalStatus, focusPoint,
                            ORACLE_PROMPT_VERSION, promptVariant);

                    // Call AI Orchestrator, retry with opposite prompt variant on weak output,
                    // and always fall back to static synthesis if remote call fails/returns empty.
                    return callAiOrchestrator(aiRequest)
                            .flatMap(primary -> {
                                if (!shouldRetryWithAlternateVariant(primary)) {
                                    return Mono.just(primary);
                                }
                                return retryWithAlternateVariant(aiRequest, primary);
                            })
                            .switchIfEmpty(Mono.fromSupplier(() -> {
                                log.warn("AI oracle response is empty, switching to static synthesis");
                                return generateStaticSecret(synthesis);
                            }))
                            .onErrorResume(error -> {
                                log.warn("AI oracle request failed, switching to static synthesis: {}", error.getMessage());
                                return Mono.just(generateStaticSecret(synthesis));
                            });
                })
                .doOnSuccess(response -> persistDailyCache(cacheKey, response))
                .onErrorResume(e -> {
                    log.error("Error fetching daily secret data: {}", e.getMessage());
                    return Mono.just(createFallbackResponse());
                });
    }

    // ─── AI Orchestrator Call ─────────────────────────────────────────────────────

    private Mono<OracleResponse> callAiOrchestrator(AiSynthesisRequest aiRequest) {
        ReactiveCircuitBreaker cb = circuitBreakerFactory.create("ai-orchestrator");

        Mono<OracleResponse> remoteCall = webClientBuilder.build()
                .post()
                .uri(uriBuilder -> uriBuilder
                        .scheme("lb")
                        .host("ai-orchestrator")
                        .path("/api/ai/oracle/daily-secret")
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(aiRequest)
                .retrieve()
                .bodyToMono(String.class)
                .map(raw -> parseAiResponse(raw, aiRequest.promptVersion(), aiRequest.promptVariant()))
                .doOnSuccess(r -> log.info("AI oracle response received successfully"));

        return cb.run(remoteCall, throwable -> {
            log.warn("AI Orchestrator circuit breaker activated: {}", throwable.getMessage());
            return Mono.empty(); // triggers onErrorReturn in caller
        });
    }

    /**
     * Parses the AI JSON response into OracleResponse.
     * If the AI returned invalid JSON (e.g., plain prose), treats it as the secret field.
     */
    private OracleResponse parseAiResponse(String raw, String promptVersion, String promptVariant) {
        // Strip markdown fences if AI added them despite instructions
        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("^```[a-z]*\\s*", "").replaceAll("```\\s*$", "").trim();
        }

        try {
            AiOracleResponse ai = objectMapper.readValue(json, AiOracleResponse.class);
            List<String> transitPoints = normalizeTransitPoints(
                    ai.transitPoints(), ai.astrologyInsight(), ai.numerologyInsight(), ai.dreamInsight(), ai.message());
            String resolvedSecret = toSingleSentence(
                    firstNonBlank(ai.secret(), ai.dailyVibe(), ai.message(), "Bugün sezgine güven."),
                    "Bugün sezgine güven.",
                    110);
            String resolvedDailyVibe = toSingleSentence(
                    firstNonBlank(ai.dailyVibe(), ai.message(), "Bugün ritmini sade tut."),
                    "Bugün ritmini sade tut.",
                    120);
            String safeHeadline = stripTechnicalJargon(
                    nvl(ai.transitHeadline(), nvl(ai.astrologyInsight(), "Günün akışı lehine dönüyor.")));
            String safeSummary = stripTechnicalJargon(
                    nvl(ai.transitSummary(), nvl(ai.message(), computeDayTheme())));
            List<String> safeTransitPoints = transitPoints.stream()
                    .map(this::stripTechnicalJargon)
                    .map(p -> toSingleSentence(p, "", 120))
                    .filter(p -> !p.isBlank())
                    .limit(3)
                    .toList();
            if (safeTransitPoints.size() < 3) {
                safeTransitPoints = normalizeTransitPoints(
                        safeTransitPoints,
                        safeSummary,
                        "Bugün iletişimde net kal.",
                        "Önceliğini tek başlıkta topla.");
            }

            int readabilityScore = ai.readabilityScore() != null
                    ? clamp(ai.readabilityScore(), 0, 100)
                    : computeReadabilityScore(resolvedSecret, safeSummary, String.join(" ", safeTransitPoints));
            int impactScore = ai.impactScore() != null
                    ? clamp(ai.impactScore(), 0, 100)
                    : computeImpactScore(safeHeadline, resolvedSecret, ai.message());

            return new OracleResponse(
                    resolvedSecret,
                    nvl(ai.numerologyInsight(), null),
                    nvl(ai.astrologyInsight(), null),
                    nvl(ai.dreamInsight(), null),
                    resolvedDailyVibe,
                    safeHeadline,
                    safeSummary,
                    safeTransitPoints,
                    firstNonBlank(ai.promptVersion(), promptVersion, ORACLE_PROMPT_VERSION),
                    firstNonBlank(ai.promptVariant(), promptVariant, "A"),
                    readabilityScore,
                    impactScore,
                    LocalDateTime.now(),
                    nvl(ai.message(), computeDayTheme())
            );
        } catch (JsonProcessingException e) {
            log.warn("AI returned non-JSON response, using as secret: {}", e.getMessage());
            // AI returned prose — use first sentence as secret
            String secret = toSingleSentence(json, "Bugün sezgine güven.", 110);
            int readabilityScore = computeReadabilityScore(secret);
            int impactScore = computeImpactScore(secret);
            return new OracleResponse(
                    secret,
                    null,
                    null,
                    null,
                    null,
                    "Bugünün teması: netlik ve hamle",
                    "Teknik detaya takılmadan bugüne odaklan.",
                    List.of("Ritmini koru.", "Önceliğini tek başlığa indir.", "Küçük ama net bir adım at."),
                    promptVersion,
                    promptVariant,
                    readabilityScore,
                    impactScore,
                    LocalDateTime.now(),
                    computeDayTheme()
            );
        }
    }

    private String nvl(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    private String choosePromptVariant(Long userId) {
        if (userId == null) return "A";
        return (Math.abs(userId) % 2 == 0) ? "A" : "B";
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private String normalizeHomeCopy(String value, String fallback, int maxLength) {
        String source = stripTechnicalJargon(firstNonBlank(value, fallback));
        return toSingleSentence(source, fallback, maxLength);
    }

    private String normalizeHomeAction(String action, String focusPoint) {
        String cleaned = normalizeHomeCopy(action, "Küçük ama net bir adım at.", 110);
        String lower = cleaned.toLowerCase(Locale.ROOT);
        if (lower.contains("harekete geç")) {
            return actionFallbackByFocus(focusPoint);
        }
        return cleaned;
    }

    private String normalizeHomeSummary(
            String summary,
            String actionMessage,
            String headline,
            String dailyEnergy,
            String focusPoint) {
        String cleaned = normalizeHomeCopy(summary, "Dengeyi korudukça hızlanacaksın.", 120);
        String lower = cleaned.toLowerCase(Locale.ROOT);

        if (lower.contains("evdeki detaylar") && lower.contains("harekete geçirecek")) {
            return "Ev ve düzenle ilgili küçük işleri netleştirmen bugün karar almayı kolaylaştırır.";
        }

        if (isWeakNarrative(cleaned)) {
            String alt = firstNonBlank(actionMessage, headline, dailyEnergy);
            if (!alt.isBlank() && !isWeakNarrative(alt)) {
                return toSingleSentence(alt, "Bugün tek bir öncelik seçip onu tamamla.", 120);
            }
            return actionFallbackByFocus(focusPoint);
        }
        return cleaned;
    }

    private boolean isWeakNarrative(String text) {
        String normalized = firstNonBlank(text).toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || normalized.length() < 24) return true;
        return normalized.contains("detaylar seni harekete geçirecek")
                || normalized.contains("seni harekete geçirecek")
                || normalized.contains("evdeki detaylar")
                || normalized.contains("genel akış")
                || normalized.contains("enerji akışı")
                || normalized.contains("kozmik enerji");
    }

    private String actionFallbackByFocus(String focusPoint) {
        String focus = firstNonBlank(focusPoint).toLowerCase(Locale.ROOT);
        if (focus.contains("kariyer")) {
            return "İş tarafında tek bir görevi bitirmeye odaklanman bugün görünür sonuç verir.";
        }
        if (focus.contains("aile") || focus.contains("ev")) {
            return "Ev ve aile düzeninde tek bir eksik işi tamamlaman günün akışını rahatlatır.";
        }
        if (focus.contains("para")) {
            return "Maddi konularda küçük bir plan güncellemesi yapmak bugün gereksiz stresi azaltır.";
        }
        if (focus.contains("ilişki") || focus.contains("ask")) {
            return "İlişkilerde net bir cümleyle beklentini söylemen bugün yanlış anlaşılmayı azaltır.";
        }
        return "Bugün tek bir öncelik seçip onu tamamlaman günün geri kalanını netleştirir.";
    }

    private List<String> normalizeTransitPoints(List<String> points, String... fallbacks) {
        List<String> normalized = new ArrayList<>();

        if (points != null) {
            for (String point : points) {
                String clean = toSingleSentence(point, "");
                if (!clean.isBlank()) {
                    normalized.add(clean);
                }
            }
        }

        if (normalized.isEmpty() && fallbacks != null) {
            for (String fallback : fallbacks) {
                String clean = toSingleSentence(fallback, "");
                if (!clean.isBlank()) {
                    normalized.add(clean);
                }
                if (normalized.size() >= 3) break;
            }
        }

        if (normalized.isEmpty()) {
            normalized = List.of(
                    "Gunun ritmini sakin tut.",
                    "Iletisimde net kal.",
                    "Kucuk ama net bir adim at.");
        }

        if (normalized.size() > 3) {
            return normalized.subList(0, 3);
        }
        return normalized;
    }

    private String toSingleSentence(String value, String fallback) {
        return toSingleSentence(value, fallback, 140);
    }

    private String toSingleSentence(String value, String fallback, int maxLength) {
        String source = firstNonBlank(value, fallback);
        if (source.isBlank()) return "";
        String cleaned = source.replaceAll("\\s+", " ").trim();
        String[] parts = cleaned.split("[.!?]");
        String sentence = parts.length > 0 ? parts[0].trim() : cleaned;
        if (sentence.length() > maxLength) {
            sentence = sentence.substring(0, maxLength).replaceAll("\\s+\\S*$", "").trim();
        }
        return sentence.isBlank() ? "" : sentence + ".";
    }

    private String stripTechnicalJargon(String value) {
        if (value == null || value.isBlank()) return "";
        return value
                .replaceAll("(?i)\\b(kavusum|kare|ucgen|karsit|transit|orb|derece|ev)\\b", "")
                .replaceAll("(?i)\\b(kavuşum|üçgen|karşıt|retro|retrograd|teknik gösterge)\\b", "")
                .replaceAll("\\d+\\s*°", "")
                .replaceAll("\\s+", " ")
                .replaceAll("\\s+([.,;:])", "$1")
                .trim();
    }

    private int computeReadabilityScore(String... parts) {
        String text = String.join(" ", parts == null ? new String[0] : parts).trim();
        if (text.isBlank()) return 55;
        String[] words = text.split("\\s+");
        double avgWordLen = java.util.Arrays.stream(words).mapToInt(String::length).average().orElse(6.0);
        int longWords = (int) java.util.Arrays.stream(words).filter(w -> w.length() > 10).count();
        int score = (int) Math.round(96 - (avgWordLen * 7) - (longWords * 0.8));
        return clamp(score, 35, 98);
    }

    private int computeImpactScore(String... parts) {
        String text = String.join(" ", parts == null ? new String[0] : parts).toLowerCase();
        if (text.isBlank()) return 50;
        String[] impactTokens = {"net", "hamle", "firsat", "destek", "guc", "hiz", "odak", "denge", "riski", "sans"};
        int hits = 0;
        for (String token : impactTokens) {
            if (text.contains(token)) hits++;
        }
        int score = 42 + (hits * 8);
        if (text.contains("!")) score += 4;
        return clamp(score, 30, 98);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private boolean shouldRetryWithAlternateVariant(OracleResponse response) {
        if (response == null) return true;
        int impact = response.impactScore() != null ? response.impactScore() : 50;
        int readability = response.readabilityScore() != null ? response.readabilityScore() : 55;
        int points = response.transitPoints() != null ? response.transitPoints().size() : 0;
        boolean weakSecret = response.secret() == null || response.secret().length() < 24;
        boolean weakMessage = response.message() == null || response.message().isBlank();
        return impact < 55 || readability < 45 || points < 2 || weakSecret || weakMessage;
    }

    private Mono<OracleResponse> retryWithAlternateVariant(AiSynthesisRequest request, OracleResponse primary) {
        String alternateVariant = "A".equalsIgnoreCase(request.promptVariant()) ? "B" : "A";
        AiSynthesisRequest alternateRequest = withPromptVariant(request, alternateVariant);
        log.info("Retrying oracle prompt with variant {} due to low quality primary response", alternateVariant);

        return callAiOrchestrator(alternateRequest)
                .onErrorResume(error -> {
                    log.warn("Alternate variant {} failed: {}", alternateVariant, error.getMessage());
                    return Mono.empty();
                })
                .switchIfEmpty(Mono.just(primary))
                .map(alternate -> qualityScore(alternate) >= qualityScore(primary) ? alternate : primary);
    }

    private int qualityScore(OracleResponse response) {
        if (response == null) return 0;
        int impact = response.impactScore() != null ? response.impactScore() : 50;
        int readability = response.readabilityScore() != null ? response.readabilityScore() : 55;
        int pointsBonus = response.transitPoints() != null ? Math.min(response.transitPoints().size(), 3) * 5 : 0;
        int messageBonus = (response.message() != null && !response.message().isBlank()) ? 8 : 0;
        return impact + readability + pointsBonus + messageBonus;
    }

    // ─── Build AI Request ─────────────────────────────────────────────────────────

    private AiSynthesisRequest buildAiRequest(GrandSynthesisRequest synthesis,
                                               String name, String birthDate,
                                               String maritalStatus, String focusPoint,
                                               String promptVersion, String promptVariant) {
        NumerologyData num = synthesis.numerology();
        NatalChartData chart = synthesis.natalChart();
        DreamData dream = synthesis.recentDream();

        return new AiSynthesisRequest(
                name,
                birthDate,
                maritalStatus,
                focusPoint,
                num != null ? num.lifePathNumber() : null,
                num != null ? num.destinyNumber() : null,
                num != null ? num.soulUrgeNumber() : null,
                chart != null ? chart.sunSign() : null,
                chart != null ? chart.moonSign() : null,
                chart != null ? chart.risingSign() : null,
                synthesis.moonPhase(),
                synthesis.moonSignToday(),
                synthesis.retrogradePlanets(),
                dream != null ? dream.dreamText() : null,
                dream != null ? dream.mood() : null,
                dream != null ? dream.aiInterpretation() : null,
                promptVersion,
                promptVariant
        );
    }

    private AiSynthesisRequest withPromptVariant(AiSynthesisRequest req, String promptVariant) {
        return new AiSynthesisRequest(
                req.name(),
                req.birthDate(),
                req.maritalStatus(),
                req.focusPoint(),
                req.lifePathNumber(),
                req.destinyNumber(),
                req.soulUrgeNumber(),
                req.sunSign(),
                req.moonSign(),
                req.risingSign(),
                req.moonPhase(),
                req.moonSignToday(),
                req.retrogradePlanets(),
                req.dreamText(),
                req.dreamMood(),
                req.dreamInterpretation(),
                req.promptVersion(),
                promptVariant
        );
    }

    // ─── Downstream Service Fetchers ──────────────────────────────────────────────

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
                .header("X-Internal-Gateway-Key", internalGatewayKey)
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
                .header("X-Internal-Gateway-Key", internalGatewayKey)
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

        return new NatalChartData(sunSign, moonSign, risingSign, List.of(), interpretation);
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
                .header("X-Internal-Gateway-Key", internalGatewayKey)
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

    private Mono<SkyPulseSummary> fetchSkyPulseSummary() {
        ReactiveCircuitBreaker circuitBreaker = circuitBreakerFactory.create("astrology-service");

        Mono<SkyPulseSummary> remoteCall = webClientBuilder.build()
                .get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("lb")
                        .host("astrology-service")
                        .path("/api/v1/astrology/sky-pulse")
                        .build())
                .header("X-Internal-Gateway-Key", internalGatewayKey)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::parseSkyPulseResponse);

        return circuitBreaker.run(remoteCall, throwable -> {
            log.warn("Circuit breaker activated for sky-pulse: {}", throwable.getMessage());
            return Mono.just(new SkyPulseSummary(null, null, List.of()));
        });
    }

    private SkyPulseSummary parseSkyPulseResponse(JsonNode response) {
        String moonPhase = response.has("moonPhase") ? response.get("moonPhase").asText() : null;
        String moonSignTurkish = response.has("moonSignTurkish") ? response.get("moonSignTurkish").asText() : null;

        List<String> retroList = new ArrayList<>();
        if (response.has("retrogradePlanets") && response.get("retrogradePlanets").isArray()) {
            response.get("retrogradePlanets").forEach(n -> retroList.add(n.asText()));
        }
        return new SkyPulseSummary(moonPhase, moonSignTurkish, retroList);
    }

    private Mono<List<HomeBriefResponse.WeeklyCard>> fetchWeeklyCards(Long userId) {
        ReactiveCircuitBreaker circuitBreaker = circuitBreakerFactory.create("astrology-service");

        Mono<List<HomeBriefResponse.WeeklyCard>> remoteCall = webClientBuilder.build()
                .get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("lb")
                        .host("astrology-service")
                        .path("/api/v1/astrology/weekly-swot")
                        .queryParam("userId", userId)
                        .build())
                .header("X-Internal-Gateway-Key", internalGatewayKey)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::parseWeeklyCards);

        return circuitBreaker.run(remoteCall, throwable -> {
            log.warn("Circuit breaker activated for weekly-swot: {}", throwable.getMessage());
            return Mono.just(List.of());
        });
    }

    private List<HomeBriefResponse.WeeklyCard> parseWeeklyCards(JsonNode node) {
        return List.of(
                toWeeklyCard("strength", "ICSEL GUC", "#7C4DFF", node.path("strength")),
                toWeeklyCard("opportunity", "ALTIN FIRSAT", "#009F73", node.path("opportunity")),
                toWeeklyCard("threat", "KRITIK UYARI", "#E14B4B", node.path("threat")),
                toWeeklyCard("weakness", "ENERJI KAYBI", "#E08A00", node.path("weakness"))
        );
    }

    private HomeBriefResponse.WeeklyCard toWeeklyCard(
            String key,
            String title,
            String accent,
            JsonNode source) {
        String headline = source.path("headline").asText("Bu alan bu hafta aktif.");
        String subtext = source.path("subtext").asText("Detaylari acmak icin karta dokun.");
        String quickTip = source.path("quickTip").asText("Ritmini koru ve odagini dagitma.");
        return new HomeBriefResponse.WeeklyCard(key, title, headline, subtext, quickTip, accent);
    }

    // ─── Static Fallback (circuit breaker fallback for AI) ───────────────────────

    /**
     * Generates a static-but-contextual secret when AI is unavailable.
     * Uses natal chart and numerology data to personalize as much as possible.
     */
    private OracleResponse generateStaticSecret(GrandSynthesisRequest request) {
        int dayOfYear = LocalDate.now().getDayOfYear();

        String secret = buildContextualSecret(request, dayOfYear);

        String numerologyInsight = (request.numerology() != null && request.numerology().summary() != null)
                ? request.numerology().summary()
                : buildNumerologyFallback(request.numerology(), dayOfYear);

        String astrologyInsight = buildAstrologyFallback(
                request.natalChart(), request.retrogradePlanets(), request.moonPhase());

        String dreamInsight = (request.recentDream() != null && request.recentDream().aiInterpretation() != null)
                ? request.recentDream().aiInterpretation()
                : buildDreamFallback(request.recentDream(), dayOfYear);

        return new OracleResponse(
                toSingleSentence(secret, "Bugun sezgine guven."),
                numerologyInsight,
                astrologyInsight,
                dreamInsight,
                null,
                toSingleSentence(astrologyInsight, "Gunun akisi lehine donuyor."),
                toSingleSentence(numerologyInsight, "Dengeni korudukca netlik artacak."),
                normalizeTransitPoints(null, astrologyInsight, numerologyInsight, dreamInsight),
                ORACLE_PROMPT_VERSION,
                "A",
                computeReadabilityScore(secret, astrologyInsight, numerologyInsight),
                computeImpactScore(secret, astrologyInsight),
                LocalDateTime.now(),
                computeDayTheme()
        );
    }

    private String buildContextualSecret(GrandSynthesisRequest request, int day) {
        StringBuilder sb = new StringBuilder();

        if (request.numerology() != null && request.numerology().lifePathNumber() != null) {
            sb.append(getLifePathTodayFocus(request.numerology().lifePathNumber(), day)).append(" ");
        }
        if (request.natalChart() != null && request.natalChart().risingSign() != null) {
            sb.append(getRisingSignTone(request.natalChart().risingSign(), LocalDate.now().getDayOfWeek().getValue()));
        }

        String result = sb.toString().trim();
        if (result.isEmpty()) return getFallbackSecret(day);
        return result;
    }

    private String buildNumerologyFallback(NumerologyData num, int day) {
        if (num == null || num.lifePathNumber() == null) {
            return "Sayılarının titreşimi bugün kararlarında belirleyici bir rehberlik sunuyor.";
        }
        return "Yaşam yolu sayın " + num.lifePathNumber() + " bugün odağını netleştiriyor; "
                + "kader sayın " + (num.destinyNumber() != null ? num.destinyNumber() : "?")
                + " ise harekete geçmen için en doğru zamanı gösteriyor.";
    }

    private String buildAstrologyFallback(NatalChartData chart, List<String> retroList, String moonPhase) {
        StringBuilder sb = new StringBuilder();

        if (retroList != null && !retroList.isEmpty()) {
            sb.append(String.join(", ", retroList.subList(0, Math.min(retroList.size(), 2))))
              .append(" retroda — bu gezegenlerin alanlarında bugün dikkatli ve gözlemci ol. ");
        } else {
            sb.append("Gökyüzü bugün temiz; gezegenler ileri gidiyor ve hamlelerini destekliyor. ");
        }

        if (moonPhase != null) {
            sb.append(moonPhase).append(" enerjisi duygusal tonunu belirliyor. ");
        }

        if (chart != null && chart.sunSign() != null && chart.risingSign() != null) {
            sb.append(chart.sunSign()).append(" güneşin ").append(chart.risingSign())
              .append(" yükselen kombinasyonu bugün özgün bir avantaj yaratıyor.");
        }

        return sb.toString().trim();
    }

    private String buildDreamFallback(DreamData dream, int day) {
        if (dream == null || dream.mood() == null) {
            return null;
        }
        String mood = dream.mood().toLowerCase();
        if (mood.contains("mutlu") || mood.contains("joy")) return "Rüyadan taşınan sevinç bugün motivasyonuna ekstra katman ekliyor.";
        if (mood.contains("korku") || mood.contains("fear")) return "Rüyandaki endişe bilinçaltının dikkatini çekmek istediği bir konunun sinyali; bugün o konuyu çözümle.";
        if (mood.contains("sakin") || mood.contains("calm")) return "Rüyadan gelen dinginlik enerjisi bugün doğru anı beklemeyi sağlıyor.";
        if (mood.contains("kizgin") || mood.contains("anger")) return "Rüyandaki gerginlik içinde ifade bulamayan bir duygunun sinyali; bugün o duyguya ses ver.";
        return "Bilinçaltının gece sana bıraktığı mesaj, bugün dikkatini çeken ilk anlarda saklı.";
    }

    // ─── Life Path + Rising Sign helpers (kept minimal) ──────────────────────────

    private String getLifePathTodayFocus(int number, int day) {
        String[][] pool = {
            {},
            {"Liderlik enerjin en parlak halinde; ilk adımı sen at.", "Bağımsız düşüncen bugün seni öne taşıyacak.", "Öncü hamleni yapmak için doğru an."},
            {"Dinleme yeteneğin bugün en güçlü silahın.", "İki taraf arasındaki köprüyü yalnızca sen kurabilirsin.", "Sezgin bugün iki katı keskin."},
            {"Söyleyen değil, söyleyiş biçimi belirleyici; kelimelerini seç.", "Yaratıcı çözüm sıradan yoldan çok daha hızlı sonuç getirir.", "İfade etmek için doğru gün; sessiz kalma."},
            {"Sistemli adım bugün kaotik koşturmadan uzağa götürür.", "Planlama enerjin zirvede; kısa bir not büyük fark yaratabilir.", "Temeli sağlam at; bugün yaptığın haftalarca taşınacak."},
            {"Rutin dışından gelen ilk teklifi ciddiye al.", "Esnekliğin bugün en büyük avantajın.", "Beklenmedik değişim seni doğrudan istediğinin kalbine götürebilir."},
            {"Sevdiklerine bugün yapacağın küçük jestın etkisi büyük olacak.", "Bakım enerjin çevrende bir gerilimi sessizce çözer.", "Kalbinden gelen karar bugün hem seni hem etrafındakileri rahatlatır."},
            {"Cevaplar sessizliğin içinde; bugün 10 dakika yalnız kal.", "Sezgin bağırsağa inmiş durumda; ilk hissettiğini bir kez sorgula.", "Derin soru bugün yüzeysel cevapla kapanmayacak; araştır."},
            {"Hedefin net olduğunda her kapı açılacak; belirsizlikle bekleme.", "Yönetim kararı için doğru zaman; dinlemeye hazırlar.", "Maddi hamle için enerji ve zemin bir arada bugün."},
            {"Bırakmak için tam zamanı; tutunduğun şey yeni kapıyı engelliyor.", "Büyük resme baktığında bugünkü sınırın aslında sınır olmadığını görürsün.", "Başkasına yaptığın küçük iyilik bugün sana misliyle geri döner."},
        };
        if (number >= 1 && number <= 9) {
            String[] v = pool[number];
            return v[day % v.length];
        }
        return switch (number) {
            case 11 -> "Sezgisel frekansın bugün çok yüksek; kalbinin sesi doğruyu gösteriyor.";
            case 22 -> "Büyük vizyonunu bugün somut bir adıma dönüştürme vakti.";
            case 33 -> "Birine rehberlik etme fırsatı bugün önüne gelecek; kaçırma.";
            default -> "Sayılarının enerjisi bugün seninle.";
        };
    }

    private String getRisingSignTone(String risingSign, int dayOfWeek) {
        if (risingSign == null) return "";
        return switch (risingSign.toUpperCase()) {
            case "ARIES", "KOC" -> dayOfWeek <= 3 ? "Koç yükselenin cesur hamlesi normalde beklediğinden hızlı sonuç verir." : "Koç enerjin birikti; perşembeyi geçmeyen kararlarını bugün al.";
            case "TAURUS", "BOGA" -> "Boğa yükselenin sağlam adımları bugün güveni pekiştirir; aceleci değil, olgun zamanlama seç.";
            case "GEMINI", "IKIZLER" -> "İkizler yükselenin sözleri bugün normaldenden daha etkili; kelimeni bilerek kullan.";
            case "CANCER", "YENGEC" -> "Yengeç yükselenin sezgileri bugün çok keskin; duygusal sinyallere kulak ver.";
            case "LEO", "ASLAN" -> "Aslan yükselenin sahneye çıkma enerjisi zirvede; görünür olmaktan çekinme.";
            case "VIRGO", "BASAK" -> "Başak yükselenin detay görüşü bugün küçük bir hatayı erkenden yakalamanı sağlar.";
            case "LIBRA", "TERAZI" -> "Terazi yükselenin diplomatik duruşu bugün gergin ortamı yumşatır; arabulucu ol.";
            case "SCORPIO", "AKREP" -> "Akrep yükselenin derinlik okuma yeteneği bugün maskenin arkasını görmeni sağlar.";
            case "SAGITTARIUS", "YAY" -> "Yay yükselenin iyimser enerjisi bugün fırsatları coğer; büyük resmi görünce hamle yap.";
            case "CAPRICORN", "OGLAK" -> "Oğlak yükselenin kararlılığı bugün uzun vadeli adım için tam gereken gücü veriyor.";
            case "AQUARIUS", "KOVA" -> "Kova yükselenin benzersiz bakış açısı bugün çıkmazdaki yolu görecek; paylaş.";
            case "PISCES", "BALIK" -> "Balık yükselenin empatisi bugün karşılıklı anlayışı derinleştirir; sezginle konuş.";
            default -> "";
        };
    }

    private String getFallbackSecret(int day) {
        String[] secrets = {
            "İçinde taşıdığın bilgelik, bugün seni en doğru yönde yönlendiriyor; sessiz anlarda duyduğun o sese güven.",
            "Bugün fark etmeden attığın bir adım ilerleyen günlerin kapısını açıyor; her hareketin bir anlamı var.",
            "Zihnindeki en büyük engel aslında en büyük fırsatını gizliyor; bugün o perdeyi aralamak için doğru gün.",
            "Vazgeçmeyi düşündüğün şeyde hâlâ bir kor kalmış; bugün ona bir kez daha bak.",
            "Doğru insan doğru anda karşına çıkacak; sadece açık kal.",
            "En büyük kaos anında gelen fikir en değerlisidir; o fikri yaz, sakla.",
            "Küçük adımlar bugün büyük bir mesafe demek; 'yeterince büyük değil' düşüncesini bir kenara bırak.",
            "Beklediğin cevap soru sormayı bıraktığında gelecek; bırak ve izle.",
            "İleri bakarken arkanda bıraktığın enerji bugün seni hızlandırıyor; taşımayı bırak.",
            "Bugün sana gelen fırsatın ambalajı sıradan görünebilir; içeriğe bak."
        };
        return secrets[day % secrets.length];
    }

    private String computeDayTheme() {
        String[] themes = {
            "Dönüşüm", "Odak", "Sezgi", "Cesaret", "Sabır",
            "Berraklık", "Bağlantı", "Güç", "Yenilenme", "Tamamlanma",
            "Yaratıcılık", "Denge", "İlerleme", "Güvene Açılma"
        };
        return "Bugünün enerjisi: " + themes[LocalDate.now().getDayOfYear() % themes.length];
    }

    // ─── Full Fallback (all downstream services failed) ───────────────────────────

    private OracleResponse createFallbackResponse() {
        int dayOfYear = LocalDate.now().getDayOfYear();
        int dayOfWeek = LocalDate.now().getDayOfWeek().getValue();

        String[] secrets = {
            "İçindeki bilgelik bugün seni doğru cevaplara götürüyor; dışarıdan biri değil, sen biliyorsun.",
            "Bugün bir şeyi yapma veya yapmama arasındaki gecikme, aslında cevabın kendisi.",
            "Zihnin meşgul, ama kalbin net; bugün kalbini dinle.",
            "İçinde tuttuğun o düşünce, paylaşıldığında beklenmedik bir kapı açabilir.",
            "Bir adım at; manzara ancak adım attıktan sonra değişiyor.",
            "Bugün tekrarlayan bir duygu fark edeceksin; o duygu sana ne söylüyor?",
            "Doğru hamle geçmiş deneyiminde gizli; bir an düşün, orası seni yönlendiriyor.",
        };
        String[] astrologyFallbacks = {
            "Gezegenler bugün senin hesaplamadığın bir şeyi hesaplıyor; sürprizlere açık ol.",
            "Gökyüzündeki dans bugün senin lehine dönüyor; açılan kapıyı görme fırsatını kaçırma.",
            "Bugünün astrolojik enerjisi seni koreografisi bozuk adımlardan kurtarmak üzere ayarlandı.",
        };

        return new OracleResponse(
                toSingleSentence(secrets[dayOfYear % secrets.length], "Bugun sezgine guven."),
                "Sayılarının titreşimi bugün kararlarında belirleyici bir rehberlik sunuyor.",
                astrologyFallbacks[(dayOfYear + dayOfWeek) % astrologyFallbacks.length],
                null,
                null,
                "Gunun ritmi degisiyor, odagini netlestir.",
                "Kucuk ama net hamlelerin sonuca daha hizli goturecek.",
                List.of(
                        "Iletisimde gereksiz ayrintidan kac.",
                        "Onceligini tek bir basliga indir.",
                        "Bugun bitirebilecegin bir isi mutlaka tamamla."
                ),
                ORACLE_PROMPT_VERSION,
                "A",
                70,
                68,
                LocalDateTime.now(),
                computeDayTheme()
        );
    }

    // ─── Inner record for sky-pulse ───────────────────────────────────────────────

    private record SkyPulseSummary(String moonPhase, String moonSignTurkish, List<String> retrogradePlanets) {}

    // ─── Inner record mirroring OracleInterpretationRequest ──────────────────────

    private record AiSynthesisRequest(
            String name, String birthDate, String maritalStatus, String focusPoint,
            Integer lifePathNumber, Integer destinyNumber, Integer soulUrgeNumber,
            String sunSign, String moonSign, String risingSign,
            String moonPhase, String moonSignToday, List<String> retrogradePlanets,
            String dreamText, String dreamMood, String dreamInterpretation,
            String promptVersion, String promptVariant
    ) {}
}
