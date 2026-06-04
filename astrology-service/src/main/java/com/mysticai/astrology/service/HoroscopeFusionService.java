package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import jakarta.annotation.PostConstruct;
import com.mysticai.astrology.service.upstream.FreeHoroscopeApiClient;
import com.mysticai.astrology.service.upstream.OhmandaClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class HoroscopeFusionService {

    private final FreeHoroscopeApiClient freeHoroscopeApiClient;
    private final OhmandaClient ohmandaClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai-orchestrator.url:http://localhost:8084}")
    private String orchestratorUrl;

    private final RestTemplate aiRestTemplate = new RestTemplate();

    private static final Duration DAILY_TTL = Duration.ofHours(6);
    private static final Duration WEEKLY_TTL = Duration.ofHours(24);
    private static final int MIN_EDITORIAL_TEXT_LENGTH = 40;
    private static final String[] ENGLISH_MARKERS = {
            " the ", " and ", " with ", " this ", " that ", " your ", " you ",
            " today ", " week ", " energy ", " focus ", " avoid ", " should ", " can "
    };
    private static final String[] TURKISH_MARKERS = {
            " bugün ", " hafta ", " enerji ", " odak ", " dikkat ", " gökyüzü ",
            " için ", " ve ", " ile ", " olabilir ", " destekleyebilir ", " işaret edebilir "
    };
    private static final String[] TEMPLATE_ARTIFACT_MARKERS = {
            "as an ai",
            "i cannot",
            "i can't",
            "translation:",
            "çeviri:",
            "işte çeviri",
            "metnin çevirisi",
            "source text",
            "output:",
            "```",
            "###"
    };
    private static final String[] ENGLISH_REMAINDER_TOKENS = {
            "dearest", "favorite", "favourite", "vibe", "harmony", "healing",
            "frustration", "procrastination", "leadership", "opportunities",
            "warnings", "romantic", "interactions", "practice", "journey"
    };
    private static final String[] MIXED_ASTRO_TOKENS = {
            "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
            "sun", "moon", "mercury", "venus", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "kheiron", "luna",
            "conjunction", "sextile", "square", "trine", "opposition", "unique"
    };
    private static final String TURKISH_SIGN_ALTERNATION =
            "koç|boğa|ikizler|yengeç|aslan|başak|terazi|akrep|yay|oğlak|kova|balık";
    private static final String ENGLISH_SIGN_ALTERNATION =
            "aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces";
    private static final Map<String, String> TURKISH_SIGN_NAMES = Map.ofEntries(
            Map.entry("aries", "Koç"),
            Map.entry("taurus", "Boğa"),
            Map.entry("gemini", "İkizler"),
            Map.entry("cancer", "Yengeç"),
            Map.entry("leo", "Aslan"),
            Map.entry("virgo", "Başak"),
            Map.entry("libra", "Terazi"),
            Map.entry("scorpio", "Akrep"),
            Map.entry("sagittarius", "Yay"),
            Map.entry("capricorn", "Oğlak"),
            Map.entry("aquarius", "Kova"),
            Map.entry("pisces", "Balık")
    );
    private static final Map<String, String> ENGLISH_SIGN_NAMES = Map.ofEntries(
            Map.entry("aries", "Aries"),
            Map.entry("taurus", "Taurus"),
            Map.entry("gemini", "Gemini"),
            Map.entry("cancer", "Cancer"),
            Map.entry("leo", "Leo"),
            Map.entry("virgo", "Virgo"),
            Map.entry("libra", "Libra"),
            Map.entry("scorpio", "Scorpio"),
            Map.entry("sagittarius", "Sagittarius"),
            Map.entry("capricorn", "Capricorn"),
            Map.entry("aquarius", "Aquarius"),
            Map.entry("pisces", "Pisces")
    );
    private static final Pattern TURKISH_DIRECT_SALUTATION = Pattern.compile(
            "\\bsevgili\\s+(" + TURKISH_SIGN_ALTERNATION + ")(\\s+burcu)?\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern ENGLISH_DIRECT_SALUTATION = Pattern.compile(
            "\\bdear\\s+(" + ENGLISH_SIGN_ALTERNATION + ")(\\s+sign)?\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TURKISH_DIRECT_SUBJECT = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + TURKISH_SIGN_ALTERNATION + ")\\s+burcu"
                    + "(?=\\s*(?:,|için\\b|olarak\\b|bugün\\b|bu\\s+(?:hafta|dönem)\\b))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TURKISH_DIRECT_PLURAL = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + TURKISH_SIGN_ALTERNATION + ")(?:lar|ler)"
                    + "(?=\\s+(?:bugün|bu\\s+(?:hafta|dönem)|için|olarak)\\b|[,.;:])",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TURKISH_DIRECT_SIGN_SUBJECT = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + TURKISH_SIGN_ALTERNATION + ")"
                    + "(?=\\s+(?:için\\b|bugün\\b|bu\\s+(?:hafta|dönem)\\b|olarak\\b))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern ENGLISH_DIRECT_SUBJECT = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + ENGLISH_SIGN_ALTERNATION + ")(\\s+sign)?"
                    + "(?=\\s*(?:,|today\\b|this\\s+(?:week|period)\\b|for\\b|as\\b))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    @PostConstruct
    void configureAiRestTemplate() {
        for (HttpMessageConverter<?> converter : aiRestTemplate.getMessageConverters()) {
            if (converter instanceof StringHttpMessageConverter stringConverter) {
                stringConverter.setDefaultCharset(StandardCharsets.UTF_8);
            }
        }
    }

    public HoroscopeResponse getHoroscope(String sign, String period, String lang) {
        String dateLabel = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String cacheKey = buildCacheKey(sign, period, lang, dateLabel);

        // 1. Check Redis cache
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("Horoscope cache HIT: {}", cacheKey);
                HoroscopeResponse cachedResponse;
                if (cached instanceof HoroscopeResponse hr) {
                    cachedResponse = hr;
                } else {
                    cachedResponse = objectMapper.convertValue(cached, HoroscopeResponse.class);
                }
                if (cachedResponse.getSources() != null) {
                    return normalizeResponse(cachedResponse, sign, lang);
                }
                log.info("Cached response missing sources, re-fetching: {}", cacheKey);
            }
        } catch (Exception e) {
            log.warn("Redis read failed for {}: {}", cacheKey, e.getMessage());
        }

        // 2. Fetch: Ohmanda first, FreeHoroscope as fallback
        List<UpstreamSource> sources = new ArrayList<>();
        String rawText = null;

        // Try Ohmanda
        try {
            UpstreamSource ohmanda = ohmandaClient.fetch(sign);
            if (ohmanda != null && ohmanda.getText() != null && !ohmanda.getText().isBlank()) {
                String normalized = normalizeText(ohmanda.getText());
                ohmanda.setText(normalized);
                rawText = normalized;
                sources.add(ohmanda);
            }
        } catch (Exception e) {
            log.warn("Ohmanda failed for {}: {}", sign, e.getMessage());
        }

        // Fallback: FreeHoroscope
        if (rawText == null) {
            try {
                UpstreamSource freeApi = freeHoroscopeApiClient.fetch(sign, period);
                if (freeApi != null && freeApi.getText() != null && !freeApi.getText().isBlank()) {
                    String normalized = normalizeText(freeApi.getText());
                    freeApi.setText(normalized);
                    rawText = normalized;
                    sources.add(freeApi);
                }
            } catch (Exception e) {
                log.warn("FreeHoroscopeApi failed for {}: {}", sign, e.getMessage());
            }
        }

        if (rawText == null) {
            return tryStaleCache(cacheKey, sign, period, lang, dateLabel);
        }

        // 3. Localize to editorial Turkish when requested
        String finalText = rawText;
        if ("tr".equalsIgnoreCase(lang)) {
            finalText = localizeGeneralTextForTurkish(rawText, sign, period);
        }
        finalText = normalizeText(finalText);

        // 4. Build response
        HoroscopeResponse response = normalizeResponse(HoroscopeResponse.builder()
                .date(dateLabel)
                .period(period)
                .sign(sign)
                .language(lang)
                .highlights(List.of())
                .sections(HoroscopeSections.builder().general(finalText).build())
                .meta(null)
                .sources(sources)
                .build(), sign, lang);

        // 5. Cache
        Duration ttl = period.equals("weekly") ? WEEKLY_TTL : DAILY_TTL;
        try {
            redisTemplate.opsForValue().set(cacheKey, response, ttl);
        } catch (Exception e) {
            log.warn("Redis write failed for {}: {}", cacheKey, e.getMessage());
        }

        return response;
    }

    private String localizeGeneralTextForTurkish(String rawText, String sign, String period) {
        String baseText = alignDirectSignReferencesForTurkish(normalizeText(rawText), sign);
        if (!nonBlank(baseText)) {
            return rawText;
        }

        if (isLikelyTurkish(baseText) && passesTurkishQualityGate(baseText, sign)) {
            log.debug("Skipping editorial localization because source already passes Turkish quality gate");
            return alignDirectSignReferencesForTurkish(normalizeMixedAstroTermsForTurkish(baseText), sign);
        }

        String editorial = translateEditorialToTurkish(baseText, sign, period);
        String repairedEditorial = repairTurkishTextSegments(editorial, sign, period);
        if ((passesTurkishQualityGate(repairedEditorial, sign) || isUsableRepairedTurkish(repairedEditorial, sign))
                && endsWithSentenceTerminator(repairedEditorial)) {
            return repairedEditorial;
        }
        if (nonBlank(editorial) && !endsWithSentenceTerminator(repairedEditorial)) {
            log.warn("Editorial localization appears truncated (does not end with sentence terminator), trying legacy fallback");
        } else if (nonBlank(editorial)) {
            log.warn("Editorial localization could not be repaired enough, trying legacy fallback");
        }

        String legacy = translateToTurkishLegacy(baseText);
        String repairedLegacy = repairTurkishTextSegments(legacy, sign, period);
        if ((passesTurkishQualityGate(repairedLegacy, sign) || isUsableRepairedTurkish(repairedLegacy, sign))
                && endsWithSentenceTerminator(repairedLegacy)) {
            log.info("Using legacy TR translation after editorial fallback");
            return repairedLegacy;
        }
        if (nonBlank(legacy)) {
            log.warn("Legacy translation could not be repaired enough, using normalized upstream text");
        }

        String normalizedFallback = repairTurkishTextSegments(baseText, sign, period);
        if (passesTurkishQualityGate(normalizedFallback, sign) || isUsableRepairedTurkish(normalizedFallback, sign)) {
            return normalizedFallback;
        }

        log.warn("Using deterministic Turkish horoscope fallback for {} {}", sign, period);
        return buildTurkishFallbackText(sign, period);
    }

    private String translateEditorialToTurkish(String sourceText, String sign, String period) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("sourceText", sourceText);
            payload.put("sign", sign);
            payload.put("period", period);
            payload.put("locale", "tr");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAcceptCharset(List.of(StandardCharsets.UTF_8));

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);

            ResponseEntity<String> aiResponse = aiRestTemplate.postForEntity(
                    orchestratorUrl + "/api/ai/horoscope/translate-editorial", entity, String.class);

            if (aiResponse.getStatusCode().is2xxSuccessful() && aiResponse.getBody() != null) {
                return cleanupLocalizedText(aiResponse.getBody());
            }
        } catch (Exception e) {
            log.warn("Editorial translation failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Legacy simple translation path used as a fallback when editorial localization
     * is unavailable or fails quality gates.
     */
    private String translateToTurkishLegacy(String englishText) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("systemPrompt",
                    "You are a translator. Translate the given English horoscope text to natural, fluent Turkish. " +
                    "Do NOT add any interpretation, commentary, or extra content. " +
                    "Just translate the text as-is. Return only the translated text, nothing else.");
            payload.put("userPrompt", englishText);
            payload.put("expectJsonResponse", false);
            payload.put("simple", true);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAcceptCharset(List.of(StandardCharsets.UTF_8));

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);
            ResponseEntity<String> aiResponse = aiRestTemplate.postForEntity(
                    orchestratorUrl + "/api/ai/horoscope/fuse", entity, String.class);

            if (aiResponse.getStatusCode().is2xxSuccessful() && aiResponse.getBody() != null) {
                return cleanupLocalizedText(aiResponse.getBody());
            }
        } catch (Exception e) {
            log.warn("Legacy translation failed: {}", e.getMessage());
        }
        return null;
    }

    private String cleanupLocalizedText(String raw) {
        if (raw == null) {
            return null;
        }

        String text = repairMojibake(normalizeText(raw));
        if (text == null) {
            return null;
        }
        text = text.trim();
        if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'"))) {
            text = text.substring(1, text.length() - 1).trim();
        }

        text = text.replaceAll("(?iu)^(çeviri|translation)\\s*[:\\-]\\s*", "")
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();

        text = normalizeMixedAstroTermsForTurkish(text);

        return text.isBlank() ? null : text;
    }

    private boolean passesTurkishQualityGate(String candidate) {
        if (!nonBlank(candidate)) {
            return false;
        }
        String text = candidate.trim();
        if (text.length() < MIN_EDITORIAL_TEXT_LENGTH) {
            return false;
        }
        if (looksEnglishDominant(text)) {
            return false;
        }
        if (containsMixedAstroToken(text)) {
            return false;
        }
        if (containsEnglishRemainderToken(text)) {
            return false;
        }
        if (containsSuspiciousTurkishArtifacts(text)) {
            return false;
        }
        return !containsTemplateArtifact(text);
    }

    private boolean passesTurkishQualityGate(String candidate, String sign) {
        return passesTurkishQualityGate(candidate)
                && !containsWrongDirectSignReference(candidate, sign);
    }

    private boolean containsTemplateArtifact(String text) {
        String lower = " " + text.toLowerCase(Locale.ROOT) + " ";
        for (String marker : TEMPLATE_ARTIFACT_MARKERS) {
            if (lower.contains(marker)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsMixedAstroToken(String text) {
        if (!nonBlank(text)) {
            return false;
        }
        for (String token : MIXED_ASTRO_TOKENS) {
            if (text.matches("(?iu).*\\b" + java.util.regex.Pattern.quote(token) + "\\b.*")) {
                return true;
            }
        }
        return false;
    }

    private boolean containsEnglishRemainderToken(String text) {
        if (!nonBlank(text)) {
            return false;
        }
        for (String token : ENGLISH_REMAINDER_TOKENS) {
            if (text.matches("(?iu).*\\b" + java.util.regex.Pattern.quote(token) + "\\p{L}*\\b.*")) {
                return true;
            }
        }
        return false;
    }

    private boolean containsSuspiciousTurkishArtifacts(String text) {
        if (!nonBlank(text)) {
            return false;
        }
        if (text.contains("Ã") || text.contains("Ä") || text.contains("Å")) {
            return true;
        }
        if (text.matches("(?iu).*\\b(" + TURKISH_SIGN_ALTERNATION + ")['’]l[ıiuü]\\b.*")) {
            return true;
        }
        if (text.matches("(?iu).*\\b(" + TURKISH_SIGN_ALTERNATION + ")\\s+ayı\\b.*")) {
            return true;
        }
        if (text.matches("(?iu).*\\b(favorit|deyar|allarl|kızımlağ|kizimlag)\\p{L}*\\b.*")) {
            return true;
        }
        return text.matches("(?iu).*\\bsenin\\s+şakalara\\b.*");
    }

    private boolean isUsableRepairedTurkish(String candidate) {
        if (!nonBlank(candidate)) {
            return false;
        }
        String text = candidate.trim();
        if (text.length() < MIN_EDITORIAL_TEXT_LENGTH) {
            return false;
        }
        if (containsTemplateArtifact(text) || containsSuspiciousTurkishArtifacts(text)) {
            return false;
        }
        return !looksEnglishDominant(text) && !containsMixedAstroToken(text) && !containsEnglishRemainderToken(text);
    }

    private boolean isUsableRepairedTurkish(String candidate, String sign) {
        return isUsableRepairedTurkish(candidate)
                && !containsWrongDirectSignReference(candidate, sign);
    }

    private boolean isLikelyTurkish(String text) {
        if (!nonBlank(text)) {
            return false;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.matches(".*[çğıöşü].*")) {
            return true;
        }

        int turkishHits = countMarkerHits(lower, TURKISH_MARKERS);
        int englishHits = countMarkerHits(lower, ENGLISH_MARKERS);
        return turkishHits >= 2 && englishHits <= 1;
    }

    private boolean looksEnglishDominant(String text) {
        if (!nonBlank(text)) {
            return true;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        int englishHits = countMarkerHits(lower, ENGLISH_MARKERS);
        int turkishHits = countMarkerHits(lower, TURKISH_MARKERS);
        boolean hasTurkishChars = lower.matches(".*[çğıöşü].*");
        return englishHits >= 4 || (englishHits >= 2 && turkishHits == 0 && !hasTurkishChars);
    }

    private int countMarkerHits(String text, String[] markers) {
        String padded = " " + text + " ";
        int hits = 0;
        for (String marker : markers) {
            if (padded.contains(marker)) {
                hits++;
            }
        }
        return hits;
    }

    private boolean nonBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean endsWithSentenceTerminator(String text) {
        if (!nonBlank(text)) return false;
        String trimmed = text.trim();
        char last = trimmed.charAt(trimmed.length() - 1);
        return last == '.' || last == '!' || last == '?' || last == '…';
    }

    private String repairMojibake(String input) {
        if (!nonBlank(input)) {
            return input;
        }
        if (!(input.contains("Ã") || input.contains("Ä") || input.contains("Å"))) {
            return input;
        }
        try {
            return new String(input.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return input;
        }
    }

    private String normalizeMixedAstroTermsForTurkish(String text) {
        if (!nonBlank(text)) {
            return text;
        }
        String normalized = repairMojibake(text);
        normalized = normalized.replaceAll("(?iu)\\baries\\b", "Koç");
        normalized = normalized.replaceAll("(?iu)\\btaurus\\b", "Boğa");
        normalized = normalized.replaceAll("(?iu)\\bgemini\\b", "İkizler");
        normalized = normalized.replaceAll("(?iu)\\bcancer\\b", "Yengeç");
        normalized = normalized.replaceAll("(?iu)\\bleo\\b", "Aslan");
        normalized = normalized.replaceAll("(?iu)\\bvirgo\\b", "Başak");
        normalized = normalized.replaceAll("(?iu)\\blibra\\b", "Terazi");
        normalized = normalized.replaceAll("(?iu)\\bscorpio\\b", "Akrep");
        normalized = normalized.replaceAll("(?iu)\\bsagittarius\\b", "Yay");
        normalized = normalized.replaceAll("(?iu)\\bcapricorn\\b", "Oğlak");
        normalized = normalized.replaceAll("(?iu)\\baquarius\\b", "Kova");
        normalized = normalized.replaceAll("(?iu)\\bpisces\\b", "Balık");
        normalized = normalized.replaceAll("(?iu)\\bsun\\b", "Güneş");
        normalized = normalized.replaceAll("(?iu)\\bmoon\\b", "Ay");
        normalized = normalized.replaceAll("(?iu)\\bluna\\b", "Ay");
        normalized = normalized.replaceAll("(?iu)\\bchiron\\b", "Kiron");
        normalized = normalized.replaceAll("(?iu)\\bkheiron\\b", "Kiron");
        normalized = normalized.replaceAll("(?iu)\\bunique\\b", "özgün");
        normalized = normalized.replaceAll("(?iu)\\bdearest\\b", "Sevgili");
        normalized = normalized.replaceAll("(?iu)\\bfavou?rite\\b", "sevgili");
        normalized = normalized.replaceAll("(?iu)\\bfavorit\\b", "sevgili");
        normalized = normalized.replaceAll("(?iu)\\bdeyar\\b", "sevgili");
        normalized = normalized.replaceAll("(?iu)\\ballarl\\p{L}*\\b", "rahatlayacaksın");
        normalized = normalized.replaceAll("(?iu)\\bkızımlağ\\p{L}*\\b", "gerilimin");
        normalized = normalized.replaceAll("(?iu)\\bkizimlag\\p{L}*\\b", "gerilimin");
        normalized = normalized.replaceAll("(?iu)\\bvibe\\b", "hava");
        normalized = normalized.replaceAll("(?iu)\\bharmony\\b", "uyum");
        normalized = normalized.replaceAll("(?iu)\\bhealing\\b", "iyileşme");
        normalized = normalized.replaceAll("(?iu)\\bfrustration\\p{L}*\\b", "gerilim");
        normalized = normalized.replaceAll("(?iu)\\bprocrastination\\b", "erteleme");
        normalized = normalized.replaceAll("(?iu)\\bprokrastinasyon\\b", "erteleme");
        normalized = normalized.replaceAll("(?iu)\\bleadership\\b", "liderlik");
        normalized = normalized.replaceAll("(?iu)\\bopportunities\\b", "fırsatlar");
        normalized = normalized.replaceAll("(?iu)\\bwarnings\\b", "uyarılar");
        normalized = normalized.replaceAll("(?iu)\\bromantic\\b", "romantik");
        normalized = normalized.replaceAll("(?iu)\\binteractions\\b", "etkileşimler");
        normalized = normalized.replaceAll("(?iu)\\bpractices\\b", "pratikler");
        normalized = normalized.replaceAll("(?iu)\\bpractice\\b", "pratik");
        normalized = normalized.replaceAll("(?iu)\\bjourney\\b", "yolculuk");
        normalized = normalized.replaceAll("(?iu)\\bconjunction\\b", "kavuşum");
        normalized = normalized.replaceAll("(?iu)\\bsextile\\b", "altmışlık");
        normalized = normalized.replaceAll("(?iu)\\bsquare\\b", "kare");
        normalized = normalized.replaceAll("(?iu)\\btrine\\b", "üçgen");
        normalized = normalized.replaceAll("(?iu)\\bopposition\\b", "karşıt");
        normalized = normalized.replaceAll("(?iu)\\b(" + TURKISH_SIGN_ALTERNATION + ")['’]l[ıiuü]\\b", "$1 burcu");
        normalized = normalized.replaceAll("(?iu)\\b(" + TURKISH_SIGN_ALTERNATION + ")\\s+ayı\\b", "$1 burcundaki Ay");
        normalized = normalized.replaceAll("(?iu)\\bsevgili\\s+seni\\s+sevgili\\s+(" + TURKISH_SIGN_ALTERNATION + ")\\b", "Sevgili $1");
        normalized = normalized.replaceAll("(?iu)\\bsevgili\\s+seni\\s+ve\\s+sevgili\\s+(" + TURKISH_SIGN_ALTERNATION + ")\\b", "Sevgili $1");
        normalized = normalized.replaceAll("(?iu)\\bsevgili\\s+(" + TURKISH_SIGN_ALTERNATION + "),\\s*sevgili\\s+\\1\\b", "Sevgili $1");
        normalized = normalized.replaceAll("(?iu)\\bsenin\\s+şakalara\\b", "şakalarına");
        normalized = normalized.replaceAll("(?iu)\\btuhaf\\b", "özgün");
        normalized = normalized.replaceAll("(?iu)\\bgarip\\b", "alışılmadık");
        normalized = normalized.replaceAll("(?iu)\\bözgün\\s+ve\\s+özgün\\b", "en özgün");
        normalized = normalized.replaceAll("(?m)^#{1,6}\\s*", "");
        normalized = normalized.replaceAll("\\s{2,}", " ").trim();
        return normalized;
    }

    private String repairTurkishTextSegments(String text, String sign, String period) {
        if (!nonBlank(text)) {
            return null;
        }
        String normalized = alignDirectSignReferencesForTurkish(cleanupLocalizedText(text), sign);
        if (!nonBlank(normalized)) {
            return null;
        }
        if (isUsableRepairedTurkish(normalized, sign)) {
            return normalized;
        }

        String[] segments = normalized.split("(?<=[.!?])\\s+");
        List<String> repaired = new ArrayList<>();
        boolean keptAnyOriginalSegment = false;
        for (String segment : segments) {
            String cleaned = alignDirectSignReferencesForTurkish(normalizeMixedAstroTermsForTurkish(segment), sign);
            if (isUsableRepairedTurkish(cleaned, sign) || isShortButTurkish(cleaned, sign)) {
                repaired.add(cleaned);
                keptAnyOriginalSegment = true;
            } else if (nonBlank(cleaned)) {
                repaired.add(buildTurkishFallbackSentence(sign, period));
            }
        }
        if (!keptAnyOriginalSegment) {
            return null;
        }
        String joined = String.join(" ", repaired).replaceAll("\\s{2,}", " ").trim();
        return nonBlank(joined) ? joined : null;
    }

    private boolean isShortButTurkish(String text) {
        if (!nonBlank(text)) {
            return false;
        }
        return text.toLowerCase(Locale.ROOT).matches(".*[çğıöşü].*")
                && !containsTemplateArtifact(text)
                && !containsSuspiciousTurkishArtifacts(text)
                && !containsEnglishRemainderToken(text)
                && !containsMixedAstroToken(text)
                && !looksEnglishDominant(text);
    }

    private boolean isShortButTurkish(String text, String sign) {
        return isShortButTurkish(text) && !containsWrongDirectSignReference(text, sign);
    }

    private String buildTurkishFallbackSentence(String sign, String period) {
        String signName = turkishSignName(sign);
        if ("weekly".equalsIgnoreCase(period)) {
            return signName + " için bu bölümde ana mesaj, acele etmeden önceliklerini sadeleştirmen ve iletişimde net kalman.";
        }
        return signName + " için bu bölümde ana mesaj, bugün enerjini dağıtmadan sakin ve uygulanabilir bir adım seçmen.";
    }

    private String buildTurkishFallbackText(String sign, String period) {
        String signName = turkishSignName(sign);
        if ("weekly".equalsIgnoreCase(period)) {
            return signName + " için bu hafta, acele kararlar yerine sade ve net adımlar daha destekleyici görünüyor. "
                    + "Önceliklerini toparla, seni yoran konuları tek tek ele al ve iletişimde açık kal. "
                    + "Küçük ama düzenli ilerleme, hafta sonunda kendini daha dengede hissetmeni sağlayabilir.";
        }
        return signName + " için bugün, enerjini dağıtmadan en önemli konuya odaklanmak iyi gelebilir. "
                + "Duygularını bastırmak yerine sakin bir dille ifade et; böylece hem ilişkilerde hem günlük işlerinde daha rahat ilerlersin.";
    }

    private String turkishSignName(String sign) {
        String signKey = normalizeSignKey(sign);
        if (signKey == null) {
            return sign == null ? "Bugün" : sign;
        }
        return TURKISH_SIGN_NAMES.get(signKey);
    }

    private String englishSignName(String sign) {
        String signKey = normalizeSignKey(sign);
        if (signKey == null) {
            return sign == null ? "Today" : sign;
        }
        return ENGLISH_SIGN_NAMES.get(signKey);
    }

    private String normalizeSignKey(String sign) {
        if (!nonBlank(sign)) {
            return null;
        }
        String normalized = sign.trim().toLowerCase(Locale.ROOT)
                .replace("\u0307", "")
                .replace("ğ", "g")
                .replace("ü", "u")
                .replace("ş", "s")
                .replace("ı", "i")
                .replace("ö", "o")
                .replace("ç", "c")
                .replaceAll("[^a-z]", "");
        return switch (normalized) {
            case "aries", "koc" -> "aries";
            case "taurus", "boga" -> "taurus";
            case "gemini", "ikizler" -> "gemini";
            case "cancer", "yengec" -> "cancer";
            case "leo", "aslan" -> "leo";
            case "virgo", "basak" -> "virgo";
            case "libra", "terazi" -> "libra";
            case "scorpio", "akrep" -> "scorpio";
            case "sagittarius", "yay" -> "sagittarius";
            case "capricorn", "oglak" -> "capricorn";
            case "aquarius", "kova" -> "aquarius";
            case "pisces", "balik" -> "pisces";
            default -> null;
        };
    }

    private String alignDirectSignReferences(String text, String sign, String lang) {
        if (lang != null && lang.toLowerCase(Locale.ROOT).startsWith("tr")) {
            return alignDirectSignReferencesForTurkish(text, sign);
        }
        return alignDirectSignReferencesForEnglish(text, sign);
    }

    private String alignDirectSignReferencesForTurkish(String text, String sign) {
        if (!nonBlank(text) || normalizeSignKey(sign) == null) {
            return text;
        }
        String expected = turkishSignName(sign);
        String aligned = TURKISH_DIRECT_SALUTATION.matcher(text)
                .replaceAll(match -> "Sevgili " + expected + (match.group(2) == null ? "" : match.group(2)));
        aligned = ENGLISH_DIRECT_SALUTATION.matcher(aligned)
                .replaceAll(match -> "Sevgili " + expected);
        aligned = TURKISH_DIRECT_SUBJECT.matcher(aligned)
                .replaceAll(match -> match.group(1) + expected + " burcu");
        aligned = TURKISH_DIRECT_PLURAL.matcher(aligned)
                .replaceAll(match -> match.group(1) + expected + " burcu");
        aligned = TURKISH_DIRECT_SIGN_SUBJECT.matcher(aligned)
                .replaceAll(match -> match.group(1) + expected);
        return aligned;
    }

    private String alignDirectSignReferencesForEnglish(String text, String sign) {
        if (!nonBlank(text) || normalizeSignKey(sign) == null) {
            return text;
        }
        String expected = englishSignName(sign);
        String aligned = ENGLISH_DIRECT_SALUTATION.matcher(text)
                .replaceAll(match -> "Dear " + expected + (match.group(2) == null ? "" : match.group(2)));
        aligned = ENGLISH_DIRECT_SUBJECT.matcher(aligned)
                .replaceAll(match -> match.group(1) + expected + (match.group(3) == null ? "" : match.group(3)));
        return aligned;
    }

    private boolean containsWrongDirectSignReference(String text, String sign) {
        String expectedKey = normalizeSignKey(sign);
        if (!nonBlank(text) || expectedKey == null) {
            return false;
        }
        return containsWrongDirectSignReference(text, expectedKey, TURKISH_DIRECT_SALUTATION, 1)
                || containsWrongDirectSignReference(text, expectedKey, ENGLISH_DIRECT_SALUTATION, 1)
                || containsWrongDirectSignReference(text, expectedKey, TURKISH_DIRECT_SUBJECT, 2)
                || containsWrongDirectSignReference(text, expectedKey, TURKISH_DIRECT_PLURAL, 2)
                || containsWrongDirectSignReference(text, expectedKey, TURKISH_DIRECT_SIGN_SUBJECT, 2)
                || containsWrongDirectSignReference(text, expectedKey, ENGLISH_DIRECT_SUBJECT, 2);
    }

    private boolean containsWrongDirectSignReference(String text, String expectedKey, Pattern pattern, int signGroup) {
        var matcher = pattern.matcher(text);
        while (matcher.find()) {
            String matchedKey = normalizeSignKey(matcher.group(signGroup));
            if (matchedKey != null && !matchedKey.equals(expectedKey)) {
                return true;
            }
        }
        return false;
    }

    private HoroscopeResponse tryStaleCache(String cacheKey, String sign, String period,
                                              String lang, String dateLabel) {
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String staleKey = buildCacheKey(sign, period, lang, yesterday);
        try {
            Object stale = redisTemplate.opsForValue().get(staleKey);
            if (stale != null) {
                log.info("Returning stale cache for {}", staleKey);
                if (stale instanceof HoroscopeResponse hr) return normalizeResponse(hr, sign, lang);
                return normalizeResponse(objectMapper.convertValue(stale, HoroscopeResponse.class), sign, lang);
            }
        } catch (Exception ignored) {}

        log.error("No upstream sources and no stale cache for {} {} {}", sign, period, lang);
        return null;
    }

    private String buildCacheKey(String sign, String period, String lang, String date) {
        return String.format("horoscope:%s:%s:%s:%s", period, sign, lang, date);
    }

    private HoroscopeResponse normalizeResponse(HoroscopeResponse response, String expectedSign, String lang) {
        if (response == null) return null;

        HoroscopeSections sections = response.getSections();
        if (sections != null) {
            String normalizedGeneral = normalizeText(sections.getGeneral());
            sections.setGeneral(alignDirectSignReferences(normalizedGeneral, expectedSign, lang));
        }

        if (response.getSources() != null) {
            for (UpstreamSource source : response.getSources()) {
                if (source != null) {
                    source.setText(normalizeText(source.getText()));
                }
            }
        }
        return response;
    }

    private String normalizeText(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return raw;
        if (!(trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("\""))) {
            return raw;
        }

        try {
            JsonNode parsed = objectMapper.readTree(trimmed);
            String extracted = extractText(parsed);
            return (extracted != null && !extracted.isBlank()) ? extracted : raw;
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String extractText(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isTextual()) {
            String value = node.asText();
            return value == null || value.isBlank() ? null : value;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                String found = extractText(child);
                if (found != null && !found.isBlank()) return found;
            }
            return null;
        }
        if (!node.isObject()) return null;

        String[] directKeys = {"horoscope", "horoscope_data", "text", "message", "general", "content", "description"};
        for (String key : directKeys) {
            String found = extractText(node.get(key));
            if (found != null && !found.isBlank()) return found;
        }

        String[] nestedKeys = {"data", "result", "payload", "response"};
        for (String key : nestedKeys) {
            String found = extractText(node.get(key));
            if (found != null && !found.isBlank()) return found;
        }

        return null;
    }
}
