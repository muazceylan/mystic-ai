package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.service.upstream.FreeHoroscopeApiClient;
import com.mysticai.astrology.service.upstream.OhmandaClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

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
                    return normalizeResponse(cachedResponse);
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

        // 3. Translate to Turkish if needed
        String finalText = rawText;
        if ("tr".equalsIgnoreCase(lang)) {
            String translated = translateToTurkish(rawText);
            if (translated != null) {
                finalText = translated;
            }
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
                .build());

        // 5. Cache
        Duration ttl = period.equals("weekly") ? WEEKLY_TTL : DAILY_TTL;
        try {
            redisTemplate.opsForValue().set(cacheKey, response, ttl);
        } catch (Exception e) {
            log.warn("Redis write failed for {}: {}", cacheKey, e.getMessage());
        }

        return response;
    }

    /**
     * Translate English horoscope text to Turkish using AI orchestrator.
     * Returns null if translation fails (caller should use original text).
     */
    private String translateToTurkish(String englishText) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("systemPrompt",
                    "You are a translator. Translate the given English horoscope text to natural, fluent Turkish. " +
                    "Do NOT add any interpretation, commentary, or extra content. " +
                    "Just translate the text as-is. Return only the translated text, nothing else.");
            payload.put("userPrompt", englishText);
            payload.put("expectJsonResponse", false);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);

            ResponseEntity<String> aiResponse = aiRestTemplate.postForEntity(
                    orchestratorUrl + "/api/ai/horoscope/fuse", entity, String.class);

            if (aiResponse.getStatusCode().is2xxSuccessful() && aiResponse.getBody() != null) {
                String body = aiResponse.getBody().trim();
                // Remove wrapping quotes if present
                if (body.startsWith("\"") && body.endsWith("\"")) {
                    body = body.substring(1, body.length() - 1);
                }
                if (!body.isBlank()) {
                    return body;
                }
            }
        } catch (Exception e) {
            log.warn("Translation failed, using English text: {}", e.getMessage());
        }
        return null;
    }

    private HoroscopeResponse tryStaleCache(String cacheKey, String sign, String period,
                                              String lang, String dateLabel) {
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String staleKey = buildCacheKey(sign, period, lang, yesterday);
        try {
            Object stale = redisTemplate.opsForValue().get(staleKey);
            if (stale != null) {
                log.info("Returning stale cache for {}", staleKey);
                if (stale instanceof HoroscopeResponse hr) return normalizeResponse(hr);
                return normalizeResponse(objectMapper.convertValue(stale, HoroscopeResponse.class));
            }
        } catch (Exception ignored) {}

        log.error("No upstream sources and no stale cache for {} {} {}", sign, period, lang);
        return null;
    }

    private String buildCacheKey(String sign, String period, String lang, String date) {
        return String.format("horoscope:%s:%s:%s:%s", period, sign, lang, date);
    }

    private HoroscopeResponse normalizeResponse(HoroscopeResponse response) {
        if (response == null) return null;

        HoroscopeSections sections = response.getSections();
        if (sections != null) {
            sections.setGeneral(normalizeText(sections.getGeneral()));
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
