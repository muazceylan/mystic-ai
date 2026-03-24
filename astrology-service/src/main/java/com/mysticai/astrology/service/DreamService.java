package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.DreamEntry;
import com.mysticai.astrology.entity.DreamSymbol;
import com.mysticai.astrology.entity.MonthlyDreamStory;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.DreamEntryRepository;
import com.mysticai.astrology.repository.DreamSymbolRepository;
import com.mysticai.astrology.repository.MonthlyDreamStoryRepository;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.common.event.AiAnalysisEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DreamService {

    private final DreamEntryRepository dreamEntryRepository;
    private final DreamSymbolRepository dreamSymbolRepository;
    private final NatalChartRepository natalChartRepository;
    private final MonthlyDreamStoryRepository monthlyStoryRepository;
    private final DreamAnalyticsService analyticsService;
    private final TransitCalculator transitCalculator;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai-orchestrator.url:http://localhost:8084}")
    private String orchestratorUrl;

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";

    /**
     * Processes a dream text submission:
     * 1. Extracts symbols via AI
     * 2. Upserts symbol counts
     * 3. Saves DreamEntry with PENDING status
     * 4. Sends to AI Orchestrator for full astro-dream synthesis
     */
    @Transactional
    public DreamEntryResponse submitDream(DreamSubmitRequest request) {
        log.info("Processing dream for userId: {}", request.userId());

        // 1. Extract symbols via AI Orchestrator
        List<String> extractedSymbols = extractSymbolsFromOrchestrator(request.text());

        // 2. Upsert symbols and find recurring ones
        List<String> recurringSymbols = upsertSymbolsAndFindRecurring(request.userId(), extractedSymbols);

        // 3. Build payload for the full synthesis
        String payload = buildSynthesisPayload(request, extractedSymbols, recurringSymbols);

        // 4. Save DreamEntry
        UUID correlationId = UUID.randomUUID();
        DreamEntry entry = DreamEntry.builder()
                .userId(request.userId())
                .title(request.title())
                .text(request.text())
                .dreamDate(request.dreamDate() != null ? request.dreamDate() : LocalDate.now())
                .audioUrl(request.audioUrl())
                .interpretationStatus("PENDING")
                .correlationId(correlationId)
                .extractedSymbolsJson(toJson(extractedSymbols))
                .recurringSymbolsJson(toJson(recurringSymbols))
                .build();

        DreamEntry saved = dreamEntryRepository.save(entry);
        log.info("Saved DreamEntry id: {} for userId: {}", saved.getId(), request.userId());

        // 5. Send to AI Orchestrator via RabbitMQ
        AiAnalysisEvent event = new AiAnalysisEvent(
                correlationId,
                request.userId(),
                payload,
                AiAnalysisEvent.SourceService.DREAM,
                AiAnalysisEvent.AnalysisType.DREAM_SYNTHESIS,
                java.time.LocalDateTime.now()
        );
        rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, event);
        log.info("Sent DREAM_SYNTHESIS event to AI Orchestrator, correlationId: {}", correlationId);

        // Invalidate collective pulse cache so new symbols are reflected
        try { analyticsService.invalidateCollectivePulseCache(); } catch (Exception ignored) {}

        return mapToResponse(saved, extractedSymbols, recurringSymbols, List.of(), List.of());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Monthly Dream Story
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public MonthlyStoryResponse generateMonthlyStory(Long userId, int year, int month) {
        return generateMonthlyStory(userId, year, month, false);
    }

    @Transactional
    public MonthlyStoryResponse generateMonthlyStory(Long userId, int year, int month, boolean force) {
        String yearMonth = String.format("%04d-%02d", year, month);

        Optional<MonthlyDreamStory> existing = monthlyStoryRepository.findByUserIdAndYearMonth(userId, yearMonth);

        // Return existing if already COMPLETED and not forced to regenerate
        if (existing.isPresent() && "COMPLETED".equals(existing.get().getStatus()) && !force) {
            return mapStoryToResponse(existing.get());
        }

        // Force regeneration: delete the old record so a fresh one is created.
        // flush() ensures the DELETE is sent to the DB before the INSERT below,
        // preventing a duplicate-key violation on the unique (user_id, year_month) constraint.
        if (existing.isPresent() && force) {
            monthlyStoryRepository.delete(existing.get());
            monthlyStoryRepository.flush();
            log.info("Deleted existing monthly story for userId={} period={} to force regeneration", userId, yearMonth);
        }

        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        List<DreamEntry> monthDreams = dreamEntryRepository
                .findAllByUserIdAndDreamDateBetweenOrderByDreamDateAsc(userId, start, end);

        if (monthDreams.isEmpty()) {
            return new MonthlyStoryResponse(null, userId, yearMonth,
                    "Bu ay henüz hiç rüya kaydedilmemiş.", 0, List.of(), "EMPTY",
                    java.time.LocalDateTime.now().toString());
        }

        // Collect dominant symbols from this month's entries
        Map<String, Integer> symbolCounts = new HashMap<>();
        for (DreamEntry d : monthDreams) {
            fromJson(d.getExtractedSymbolsJson()).forEach(s ->
                    symbolCounts.merge(s.toLowerCase(), 1, Integer::sum));
        }
        List<String> dominantSymbols = symbolCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // Build AI payload
        String payload = buildMonthlyStoryPayload(userId, yearMonth, monthDreams, dominantSymbols);

        // Save with PENDING status
        UUID correlationId = UUID.randomUUID();
        MonthlyDreamStory story = MonthlyDreamStory.builder()
                .userId(userId)
                .yearMonth(yearMonth)
                .dreamCount(monthDreams.size())
                .dominantSymbolsJson(toJson(dominantSymbols))
                .status("PENDING")
                .correlationId(correlationId)
                .build();

        MonthlyDreamStory saved = monthlyStoryRepository.save(story);

        // Send to AI Orchestrator
        AiAnalysisEvent event = new AiAnalysisEvent(
                correlationId, userId, payload,
                AiAnalysisEvent.SourceService.DREAM,
                AiAnalysisEvent.AnalysisType.MONTHLY_DREAM_STORY,
                java.time.LocalDateTime.now()
        );
        rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, event);
        log.info("Sent MONTHLY_DREAM_STORY event for userId: {}, period: {}", userId, yearMonth);

        return mapStoryToResponse(saved);
    }

    public MonthlyStoryResponse getMonthlyStory(Long userId, int year, int month) {
        String yearMonth = String.format("%04d-%02d", year, month);
        return monthlyStoryRepository.findByUserIdAndYearMonth(userId, yearMonth)
                .map(this::mapStoryToResponse)
                .orElse(null);
    }

    private String buildMonthlyStoryPayload(Long userId, String yearMonth,
                                             List<DreamEntry> dreams, List<String> dominantSymbols) {
        try {
            // Build dreams summary: numbered entries with date + full truncated text
            StringBuilder dreamsSummary = new StringBuilder();
            int idx = 1;
            for (DreamEntry d : dreams) {
                String text = d.getText() != null ? d.getText().substring(0, Math.min(d.getText().length(), 250)) : "";
                dreamsSummary.append(idx++).append(". ")
                        .append(d.getDreamDate()).append(": ")
                        .append(text)
                        .append("\n");
            }

            // Get natal chart context
            NatalChart chart = natalChartRepository
                    .findFirstByUserIdOrderByCalculatedAtDesc(userId.toString()).orElse(null);
            String moonSign = chart != null ? chart.getMoonSign() : "Bilinmiyor";
            String sunSign  = chart != null ? chart.getSunSign()  : "Bilinmiyor";

            // Transits summary for that month's mid-point
            LocalDate midMonth = YearMonth.parse(yearMonth).atDay(15);
            List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(midMonth);
            String transitSummary = transits.stream()
                    .map(t -> t.planet() + " " + t.sign())
                    .limit(5)
                    .collect(Collectors.joining(", "));

            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("yearMonth", yearMonth);
            payload.put("dreamCount", String.valueOf(dreams.size()));
            payload.put("dreamsSummary", dreamsSummary.toString().replace("\"", "'"));
            payload.put("dominantSymbols", String.join(", ", dominantSymbols));
            payload.put("sunSign", sunSign);
            payload.put("moonSign", moonSign);
            payload.put("midMonthTransits", transitSummary);

            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("Failed to build monthly story payload", e);
            return "{\"yearMonth\":\"" + yearMonth + "\",\"dreamCount\":\"" + dreams.size() + "\"}";
        }
    }

    private MonthlyStoryResponse mapStoryToResponse(MonthlyDreamStory story) {
        List<String> symbols = fromJson(story.getDominantSymbolsJson());
        return new MonthlyStoryResponse(
                story.getId(), story.getUserId(), story.getYearMonth(),
                story.getStory(), story.getDreamCount() != null ? story.getDreamCount() : 0,
                symbols, story.getStatus(),
                story.getCreatedAt() != null ? story.getCreatedAt().toString() : null
        );
    }

    @Transactional
    public void deleteDream(Long id) {
        dreamEntryRepository.deleteById(id);
        log.info("Deleted DreamEntry id: {}", id);
    }

    public DreamEntryResponse getDreamById(Long id) {
        DreamEntry entry = dreamEntryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dream not found: " + id));
        return mapToResponse(entry);
    }

    public List<DreamEntryResponse> getDreamsByUser(Long userId) {
        return dreamEntryRepository.findAllByUserIdOrderByDreamDateDescCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<DreamSymbolDTO> getTopSymbolsByUser(Long userId) {
        return dreamSymbolRepository.findTop10ByUserIdOrderByCountDesc(userId)
                .stream()
                .map(s -> new DreamSymbolDTO(s.getId(), s.getSymbolName(), s.getCount(),
                        s.getLastSeenDate(), s.getCount() > 1))
                .collect(Collectors.toList());
    }

    /**
     * Calls ai-orchestrator synchronously to extract dream symbols.
     */
    private List<String> extractSymbolsFromOrchestrator(String dreamText) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(5_000);
            factory.setReadTimeout(12_000);
            RestClient restClient = RestClient.builder()
                    .baseUrl(orchestratorUrl)
                    .requestFactory(factory)
                    .build();
            String response = restClient.post()
                    .uri("/api/ai/dream/extract-symbols")
                    .header("Content-Type", "application/json")
                    .body(Map.of("dreamText", dreamText))
                    .retrieve()
                    .body(String.class);

            if (response != null) {
                List<String> symbols = objectMapper.readValue(response,
                        new TypeReference<List<String>>() {});
                log.info("Extracted {} symbols from dream text", symbols.size());
                return symbols;
            }
        } catch (Exception e) {
            log.warn("Symbol extraction failed, falling back to heuristic: {}", e.getMessage());
        }
        return extractSymbolsHeuristic(dreamText);
    }

    /**
     * Fallback heuristic symbol extraction using Turkish stop word filtering.
     */
    private List<String> extractSymbolsHeuristic(String text) {
        Set<String> stopWords = Set.of(
                "ve", "bir", "bu", "ben", "sen", "biz", "siz", "ile", "da", "de",
                "den", "dan", "için", "çok", "var", "olan", "kadar", "gibi", "ama",
                "fakat", "ancak", "sonra", "önce", "şimdi", "bugün", "dün", "bana",
                "sana", "onun", "benim", "senin", "bizim", "sizin", "onların", "the",
                "and", "was", "were", "then", "that", "this", "with", "from", "into"
        );

        return Arrays.stream(text.toLowerCase()
                        .replaceAll("[^a-zçğışöüa-z\\s]", " ")
                        .split("\\s+"))
                .filter(w -> w.length() > 3)
                .filter(w -> !stopWords.contains(w))
                .distinct()
                .limit(8)
                .map(this::capitalize)
                .collect(Collectors.toList());
    }

    /**
     * Upserts symbols into DreamSymbol table and returns list of recurring symbols (count > 1).
     */
    private List<String> upsertSymbolsAndFindRecurring(Long userId, List<String> symbols) {
        List<String> recurring = new ArrayList<>();
        for (String symbol : symbols) {
            String normalized = symbol.trim().toLowerCase();
            DreamSymbol existing = dreamSymbolRepository
                    .findByUserIdAndSymbolName(userId, normalized)
                    .orElse(null);

            if (existing == null) {
                DreamSymbol newSymbol = DreamSymbol.builder()
                        .userId(userId)
                        .symbolName(normalized)
                        .count(1)
                        .lastSeenDate(LocalDate.now())
                        .build();
                dreamSymbolRepository.save(newSymbol);
            } else {
                existing.setCount(existing.getCount() + 1);
                existing.setLastSeenDate(LocalDate.now());
                dreamSymbolRepository.save(existing);
                if (existing.getCount() > 1) {
                    recurring.add(symbol);
                }
            }
        }
        return recurring;
    }

    /**
     * Builds the JSON payload for the AI Orchestrator synthesis.
     * Includes dream text, recurring symbols, natal chart, and current transits.
     */
    private String buildSynthesisPayload(DreamSubmitRequest request,
                                          List<String> extractedSymbols,
                                          List<String> recurringSymbols) {
        try {
            // Get user's natal chart for astrological context
            NatalChart chart = natalChartRepository
                    .findFirstByUserIdOrderByCalculatedAtDesc(request.userId().toString())
                    .orElse(null);

            String moonSign = chart != null ? chart.getMoonSign() : "Bilinmiyor";
            String risingSign = chart != null ? chart.getRisingSign() : "Bilinmiyor";
            String housePlacementsJson = chart != null ? chart.getHousePlacementsJson() : "[]";

            // Current transits
            List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(LocalDate.now());
            List<String> transitSummary = transits.stream()
                    .map(t -> t.planet() + " " + t.sign() + " " + t.degree() + "°"
                            + (t.retrograde() ? " (R)" : ""))
                    .toList();

            // Find Neptune transit
            String neptuneInfo = transits.stream()
                    .filter(t -> "Neptune".equalsIgnoreCase(t.planet()) || "Neptün".equalsIgnoreCase(t.planet()))
                    .map(t -> t.planet() + " " + t.sign() + " " + t.degree() + "°")
                    .findFirst().orElse("Neptün konumu hesaplanamadı");

            // Extract 12th house planets as a readable string
            String twelfthHouseDesc = extractTwelfthHouseDesc(housePlacementsJson);

            // Recurring symbols description (flat string for payload extraction)
            String recurringDesc = recurringSymbols.isEmpty() ? "Tekrar eden sembol yok" :
                    recurringSymbols.stream()
                            .map(s -> {
                                DreamSymbol sym = dreamSymbolRepository
                                        .findByUserIdAndSymbolName(request.userId(), s.toLowerCase())
                                        .orElse(null);
                                int count = sym != null ? sym.getCount() : 2;
                                return "'" + s + "' (" + count + " kez görüldü)";
                            })
                            .collect(Collectors.joining("; "));

            // Use flat map so extractFromPayload can safely parse each value
            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("dreamText", request.text().replace("\"", "'"));
            payload.put("recurringSymbols", recurringDesc);
            payload.put("moonSign", moonSign);
            payload.put("risingSign", risingSign);
            payload.put("twelfthHousePlanets", twelfthHouseDesc);
            payload.put("neptuneTransit", neptuneInfo);
            payload.put("currentTransits", String.join(", ", transitSummary));
            payload.put("locale", request.locale() != null ? request.locale() : "tr");

            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to build synthesis payload", e);
            try {
                return objectMapper.writeValueAsString(Map.of("dreamText", request.text()));
            } catch (JsonProcessingException ex) {
                return "{\"dreamText\":\"" + request.text().replace("\"", "'") + "\"}";
            }
        }
    }

    private DreamEntryResponse mapToResponse(DreamEntry entry) {
        List<String> extracted = fromJson(entry.getExtractedSymbolsJson());
        List<String> recurring = fromJson(entry.getRecurringSymbolsJson());
        List<String> warnings = fromJson(entry.getWarningsJson());
        List<String> opportunities = fromJson(entry.getOpportunitiesJson());
        return mapToResponse(entry, extracted, recurring, warnings, opportunities);
    }

    private DreamEntryResponse mapToResponse(DreamEntry entry, List<String> extracted,
                                              List<String> recurring, List<String> warnings,
                                              List<String> opportunities) {
        return new DreamEntryResponse(
                entry.getId(),
                entry.getUserId(),
                entry.getText(),
                entry.getDreamDate(),
                entry.getAudioUrl(),
                entry.getTitle(),
                entry.getInterpretation(),
                warnings,
                opportunities,
                recurring,
                extracted,
                entry.getCorrelationId(),
                entry.getInterpretationStatus(),
                entry.getCreatedAt()
        );
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<String> fromJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Parses housePlacementsJson to extract the 12th house sign and ruler as a readable string.
     */
    @SuppressWarnings("unchecked")
    private String extractTwelfthHouseDesc(String housePlacementsJson) {
        if (housePlacementsJson == null || housePlacementsJson.isBlank() || housePlacementsJson.equals("[]")) {
            return "12. ev verisi yok";
        }
        try {
            List<Map<String, Object>> houses = objectMapper.readValue(housePlacementsJson,
                    new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
            return houses.stream()
                    .filter(h -> {
                        Object houseNum = h.get("houseNumber");
                        return houseNum != null && Integer.parseInt(houseNum.toString()) == 12;
                    })
                    .map(h -> "12. Ev: " + h.getOrDefault("sign", "Bilinmiyor")
                            + (h.containsKey("ruler") ? " (Hükümdar: " + h.get("ruler") + ")" : ""))
                    .findFirst()
                    .orElse("12. ev hesaplanamadı");
        } catch (Exception e) {
            return "12. ev verisi okunamadı";
        }
    }

    private String capitalize(String word) {
        if (word == null || word.isEmpty()) return word;
        return Character.toUpperCase(word.charAt(0)) + word.substring(1);
    }
}
