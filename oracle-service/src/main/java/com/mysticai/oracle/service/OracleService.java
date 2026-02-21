package com.mysticai.oracle.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.oracle.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OracleService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final ReactiveCircuitBreakerFactory circuitBreakerFactory;
    private final StringRedisTemplate redisTemplate;

    private static final String ORACLE_CACHE_PREFIX = "oracle:daily:";

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

                    // Build the AI request with all user context
                    AiSynthesisRequest aiRequest = buildAiRequest(
                            synthesis, name, birthDate, maritalStatus, focusPoint);

                    // Call AI Orchestrator, fall back to static on failure
                    return callAiOrchestrator(aiRequest)
                            .onErrorReturn(generateStaticSecret(synthesis));
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
                .map(this::parseAiResponse)
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
    private OracleResponse parseAiResponse(String raw) {
        // Strip markdown fences if AI added them despite instructions
        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("^```[a-z]*\\s*", "").replaceAll("```\\s*$", "").trim();
        }

        try {
            AiOracleResponse ai = objectMapper.readValue(json, AiOracleResponse.class);
            return new OracleResponse(
                    nvl(ai.secret(), "Bugün içindeki sese güven; o sesi sessiz anlarda duyabilirsin."),
                    nvl(ai.numerologyInsight(), null),
                    nvl(ai.astrologyInsight(), null),
                    nvl(ai.dreamInsight(), null),
                    nvl(ai.dailyVibe(), null),
                    LocalDateTime.now(),
                    nvl(ai.message(), computeDayTheme())
            );
        } catch (JsonProcessingException e) {
            log.warn("AI returned non-JSON response, using as secret: {}", e.getMessage());
            // AI returned prose — use first sentence as secret
            String secret = json.split("[.!?]")[0].trim();
            if (secret.length() > 150) secret = secret.substring(0, 150).trim();
            return new OracleResponse(secret, null, null, null, null, LocalDateTime.now(), computeDayTheme());
        }
    }

    private String nvl(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    // ─── Build AI Request ─────────────────────────────────────────────────────────

    private AiSynthesisRequest buildAiRequest(GrandSynthesisRequest synthesis,
                                               String name, String birthDate,
                                               String maritalStatus, String focusPoint) {
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
                dream != null ? dream.aiInterpretation() : null
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

        return new OracleResponse(secret, numerologyInsight, astrologyInsight, dreamInsight,
                null, LocalDateTime.now(), computeDayTheme());
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
                secrets[dayOfYear % secrets.length],
                "Sayılarının titreşimi bugün kararlarında belirleyici bir rehberlik sunuyor.",
                astrologyFallbacks[(dayOfYear + dayOfWeek) % astrologyFallbacks.length],
                null,
                null,
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
            String dreamText, String dreamMood, String dreamInterpretation
    ) {}
}
