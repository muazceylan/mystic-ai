package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.prompt.HoroscopeFusionPrompt;
import com.mysticai.astrology.service.upstream.AztroClient;
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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HoroscopeFusionService {

    private final FreeHoroscopeApiClient freeHoroscopeApiClient;
    private final OhmandaClient ohmandaClient;
    private final AztroClient aztroClient;
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
                if (cached instanceof HoroscopeResponse hr) return hr;
                return objectMapper.convertValue(cached, HoroscopeResponse.class);
            }
        } catch (Exception e) {
            log.warn("Redis read failed for {}: {}", cacheKey, e.getMessage());
        }

        // 2. Parallel fetch from upstream APIs
        List<UpstreamSource> sources = fetchUpstreamSources(sign, period);

        if (sources.isEmpty()) {
            // Try stale cache
            return tryStaleCache(cacheKey, sign, period, lang, dateLabel);
        }

        // 3. Fuse via AI orchestrator
        HoroscopeResponse response = fuseViaOrchestrator(sign, period, lang, dateLabel, sources);

        // 4. Cache result
        if (response != null) {
            Duration ttl = period.equals("weekly") ? WEEKLY_TTL : DAILY_TTL;
            try {
                redisTemplate.opsForValue().set(cacheKey, response, ttl);
            } catch (Exception e) {
                log.warn("Redis write failed for {}: {}", cacheKey, e.getMessage());
            }
        }

        return response;
    }

    private List<UpstreamSource> fetchUpstreamSources(String sign, String period) {
        CompletableFuture<UpstreamSource> f1 = CompletableFuture.supplyAsync(
                () -> freeHoroscopeApiClient.fetch(sign, period));
        CompletableFuture<UpstreamSource> f2 = CompletableFuture.supplyAsync(
                () -> ohmandaClient.fetch(sign));
        CompletableFuture<UpstreamSource> f3 = CompletableFuture.supplyAsync(
                () -> aztroClient.fetch(sign, period));

        try {
            CompletableFuture.allOf(f1, f2, f3).get(10, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Upstream fetch timeout/error: {}", e.getMessage());
        }

        List<UpstreamSource> sources = new ArrayList<>();
        addIfPresent(sources, f1);
        addIfPresent(sources, f2);
        addIfPresent(sources, f3);
        return sources;
    }

    private void addIfPresent(List<UpstreamSource> list, CompletableFuture<UpstreamSource> future) {
        try {
            UpstreamSource result = future.getNow(null);
            if (result != null && result.getText() != null && !result.getText().isBlank()) {
                list.add(result);
            }
        } catch (Exception ignored) {}
    }

    private HoroscopeResponse fuseViaOrchestrator(String sign, String period, String lang,
                                                     String dateLabel, List<UpstreamSource> sources) {
        try {
            // Build sources JSON
            String sourcesJson = objectMapper.writeValueAsString(sources);

            // Build request payload for AI orchestrator
            Map<String, Object> payload = new HashMap<>();
            payload.put("systemPrompt", HoroscopeFusionPrompt.SYSTEM_PROMPT);
            payload.put("userPrompt", HoroscopeFusionPrompt.buildUserPrompt(sign, period, dateLabel, lang, sourcesJson));
            payload.put("expectJsonResponse", true);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);

            ResponseEntity<String> aiResponse = aiRestTemplate.postForEntity(
                    orchestratorUrl + "/api/ai/horoscope/fuse", entity, String.class);

            if (aiResponse.getStatusCode().is2xxSuccessful() && aiResponse.getBody() != null) {
                return parseAiResponse(aiResponse.getBody(), sign, period, lang, dateLabel, sources);
            }
        } catch (Exception e) {
            log.error("AI fusion failed for {} {}: {}", sign, period, e.getMessage());
        }

        // Fallback: return raw upstream text without AI fusion
        return buildFallbackResponse(sign, period, lang, dateLabel, sources);
    }

    private HoroscopeResponse parseAiResponse(String body, String sign, String period,
                                                String lang, String dateLabel,
                                                List<UpstreamSource> sources) {
        try {
            JsonNode json = objectMapper.readTree(body);

            // Extract meta from aztro source if available
            HoroscopeMeta sourceMeta = sources.stream()
                    .filter(s -> s.getMeta() != null)
                    .findFirst()
                    .map(UpstreamSource::getMeta)
                    .orElse(null);

            HoroscopeSections sections = objectMapper.treeToValue(
                    json.get("sections"), HoroscopeSections.class);

            HoroscopeMeta meta = json.has("meta")
                    ? objectMapper.treeToValue(json.get("meta"), HoroscopeMeta.class)
                    : sourceMeta;

            List<String> highlights = new ArrayList<>();
            if (json.has("highlights") && json.get("highlights").isArray()) {
                json.get("highlights").forEach(h -> highlights.add(h.asText()));
            }

            return HoroscopeResponse.builder()
                    .date(dateLabel)
                    .period(period)
                    .sign(sign)
                    .language(lang)
                    .highlights(highlights)
                    .sections(sections)
                    .meta(meta)
                    .build();
        } catch (Exception e) {
            log.error("AI response parse failed: {}", e.getMessage());
            return buildFallbackResponse(sign, period, lang, dateLabel, sources);
        }
    }

    private HoroscopeResponse buildFallbackResponse(String sign, String period, String lang,
                                                      String dateLabel, List<UpstreamSource> sources) {
        String combined = sources.stream()
                .map(UpstreamSource::getText)
                .collect(Collectors.joining(" "));

        HoroscopeMeta meta = sources.stream()
                .filter(s -> s.getMeta() != null)
                .findFirst()
                .map(UpstreamSource::getMeta)
                .orElse(null);

        return HoroscopeResponse.builder()
                .date(dateLabel)
                .period(period)
                .sign(sign)
                .language(lang)
                .highlights(List.of())
                .sections(HoroscopeSections.builder().general(combined).build())
                .meta(meta)
                .build();
    }

    private HoroscopeResponse tryStaleCache(String cacheKey, String sign, String period,
                                              String lang, String dateLabel) {
        // Try yesterday's cache as stale
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String staleKey = buildCacheKey(sign, period, lang, yesterday);
        try {
            Object stale = redisTemplate.opsForValue().get(staleKey);
            if (stale != null) {
                log.info("Returning stale cache for {}", staleKey);
                if (stale instanceof HoroscopeResponse hr) return hr;
                return objectMapper.convertValue(stale, HoroscopeResponse.class);
            }
        } catch (Exception ignored) {}

        log.error("No upstream sources and no stale cache for {} {} {}", sign, period, lang);
        return null;
    }

    private String buildCacheKey(String sign, String period, String lang, String date) {
        return String.format("horoscope:%s:%s:%s:%s", period, sign, lang, date);
    }
}
