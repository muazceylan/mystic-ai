package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.DreamEntry;
import com.mysticai.astrology.entity.DreamSymbol;
import com.mysticai.astrology.repository.DreamEntryRepository;
import com.mysticai.astrology.repository.DreamSymbolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DreamAnalyticsService {

    private final DreamEntryRepository dreamEntryRepository;
    private final DreamSymbolRepository dreamSymbolRepository;
    private final TransitCalculator transitCalculator;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String COLLECTIVE_PULSE_KEY = "dream:collective:pulse:v1";
    private static final Duration COLLECTIVE_PULSE_TTL = Duration.ofHours(1);

    // Symbol → astrological house mapping (Turkish symbol names)
    private static final Map<String, String> SYMBOL_HOUSE_MAP = new HashMap<>() {{
        put("su", "4. / 12. Ev"); put("deniz", "4. / 12. Ev"); put("göl", "4. / 12. Ev");
        put("nehir", "4. / 12. Ev"); put("okyanus", "12. Ev"); put("yağmur", "4. Ev");
        put("para", "2. Ev"); put("altın", "2. Ev"); put("mücevher", "2. Ev");
        put("para kazanma", "2. Ev"); put("servet", "2. Ev");
        put("ev", "4. Ev"); put("bina", "4. Ev"); put("konut", "4. Ev"); put("köy", "4. Ev");
        put("uçmak", "9. Ev"); put("yüksek", "9. Ev"); put("uçuş", "9. Ev");
        put("düşmek", "12. Ev"); put("düşme", "12. Ev");
        put("yılan", "8. Ev"); put("ölüm", "8. Ev"); put("dönüşüm", "8. Ev");
        put("araba", "3. Ev"); put("yolculuk", "9. Ev"); put("seyahat", "9. Ev");
        put("bebek", "5. Ev"); put("çocuk", "5. Ev"); put("yaratıcılık", "5. Ev");
        put("orman", "12. Ev"); put("karanlık", "12. Ev"); put("mağara", "12. Ev");
        put("ateş", "1. / 8. Ev"); put("güneş", "5. Ev"); put("ay", "4. Ev");
        put("yıldız", "9. Ev"); put("gökyüzü", "9. Ev"); put("kuş", "3. / 9. Ev");
        put("kedi", "12. Ev"); put("köpek", "6. Ev"); put("aslan", "5. Ev");
        put("ayna", "1. Ev"); put("kapı", "1. Ev"); put("yol", "9. Ev");
        put("kılıç", "1. / 8. Ev"); put("dağ", "10. Ev"); put("zirve", "10. Ev");
        put("bataklık", "12. Ev"); put("buzul", "10. / 12. Ev");
        put("çiçek", "2. / 5. Ev"); put("ağaç", "4. Ev"); put("orman yolu", "9. Ev");
    }};

    private static final Map<String, String> SYMBOL_EMOJI_MAP = new HashMap<>() {{
        put("su", "💧"); put("deniz", "🌊"); put("göl", "🏞️"); put("nehir", "🌊"); put("okyanus", "🌊");
        put("para", "💰"); put("altın", "🏅"); put("mücevher", "💎");
        put("ev", "🏠"); put("bina", "🏢"); put("yılan", "🐍");
        put("uçmak", "🦅"); put("uçuş", "🦅"); put("düşmek", "⬇️");
        put("araba", "🚗"); put("yolculuk", "🚀"); put("kuş", "🕊️");
        put("ateş", "🔥"); put("güneş", "☀️"); put("ay", "🌙"); put("yıldız", "⭐");
        put("bebek", "👶"); put("çiçek", "🌸"); put("ağaç", "🌳");
        put("orman", "🌲"); put("dağ", "⛰️"); put("kedi", "🐱"); put("köpek", "🐕");
        put("aslan", "🦁"); put("ayna", "🪞"); put("kapı", "🚪"); put("yol", "🛤️");
        put("ölüm", "💀"); put("karanlık", "🌑"); put("ışık", "✨");
    }};

    // ─────────────────────────────────────────────────────────────────────────
    // Analytics
    // ─────────────────────────────────────────────────────────────────────────

    public DreamAnalyticsResponse getAnalytics(Long userId) {
        List<DreamEntry> dreams = dreamEntryRepository.findAllByUserIdOrderByDreamDateDesc(userId);
        List<DreamSymbol> symbols = dreamSymbolRepository.findAllByUserIdOrderByCountDesc(userId);

        int total = dreams.size();
        int completed = (int) dreams.stream().filter(d -> "COMPLETED".equals(d.getInterpretationStatus())).count();
        int pending = (int) dreams.stream().filter(d -> "PENDING".equals(d.getInterpretationStatus())).count();

        List<SymbolInsight> insights = symbols.stream()
                .limit(20)
                .map(s -> new SymbolInsight(
                        s.getSymbolName(),
                        s.getCount(),
                        resolveHouse(s.getSymbolName()),
                        null,
                        s.getLastSeenDate() != null ? s.getLastSeenDate().toString() : null,
                        s.getCount() > 1
                ))
                .collect(Collectors.toList());

        Map<String, Long> byMonth = dreams.stream()
                .filter(d -> d.getDreamDate() != null)
                .collect(Collectors.groupingBy(
                        d -> d.getDreamDate().format(DateTimeFormatter.ofPattern("yyyy-MM")),
                        Collectors.counting()
                ));

        Map<String, Long> houseFreq = buildHouseFrequency(symbols);

        int[] streaks = calculateStreaks(dreams);

        return new DreamAnalyticsResponse(userId, total, completed, pending,
                insights, byMonth, houseFreq, streaks[0], streaks[1]);
    }

    private String resolveHouse(String symbolName) {
        String normalized = symbolName.toLowerCase().trim();
        return SYMBOL_HOUSE_MAP.getOrDefault(normalized, "Bilinmiyor");
    }

    private Map<String, Long> buildHouseFrequency(List<DreamSymbol> symbols) {
        Map<String, Long> freq = new TreeMap<>();
        for (DreamSymbol s : symbols) {
            String house = resolveHouse(s.getSymbolName());
            if (!"Bilinmiyor".equals(house)) {
                for (String h : house.split(" / ")) {
                    freq.merge(h.trim(), (long) s.getCount(), Long::sum);
                }
            }
        }
        return freq;
    }

    private int[] calculateStreaks(List<DreamEntry> dreams) {
        if (dreams.isEmpty()) return new int[]{0, 0};

        Set<LocalDate> dreamDates = dreams.stream()
                .filter(d -> d.getDreamDate() != null)
                .map(DreamEntry::getDreamDate)
                .collect(Collectors.toSet());

        LocalDate today = LocalDate.now();
        int current = 0;
        while (dreamDates.contains(today)) {
            current++;
            today = today.minusDays(1);
        }

        List<LocalDate> sorted = new ArrayList<>(dreamDates);
        Collections.sort(sorted);

        int longest = 0, temp = 1;
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).equals(sorted.get(i - 1).plusDays(1))) {
                temp++;
                longest = Math.max(longest, temp);
            } else {
                temp = 1;
            }
        }
        if (!sorted.isEmpty()) longest = Math.max(longest, temp);

        return new int[]{current, longest};
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Collective Pulse (Redis-cached, 1-hour TTL)
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public CollectivePulseResponse getCollectivePulse() {
        // Try cache first
        try {
            Object cached = redisTemplate.opsForValue().get(COLLECTIVE_PULSE_KEY);
            if (cached != null) {
                return objectMapper.convertValue(cached, CollectivePulseResponse.class);
            }
        } catch (Exception e) {
            log.warn("Redis read failed for collective pulse, rebuilding: {}", e.getMessage());
        }

        CollectivePulseResponse fresh = buildCollectivePulse();

        try {
            redisTemplate.opsForValue().set(COLLECTIVE_PULSE_KEY, fresh, COLLECTIVE_PULSE_TTL);
        } catch (Exception e) {
            log.warn("Redis write failed for collective pulse: {}", e.getMessage());
        }

        return fresh;
    }

    private CollectivePulseResponse buildCollectivePulse() {
        LocalDate since = LocalDate.now().minusDays(1);
        List<Object[]> rows = dreamSymbolRepository.findGlobalTopSymbolsSince(since, 5);

        List<GlobalSymbolEntry> top = rows.stream()
                .map(row -> {
                    String name = (String) row[0];
                    long count = ((Number) row[1]).longValue();
                    String emoji = SYMBOL_EMOJI_MAP.getOrDefault(name.toLowerCase(), "✨");
                    return new GlobalSymbolEntry(name, count, emoji);
                })
                .collect(Collectors.toList());

        String reason = buildAstroReasoning(top);
        return new CollectivePulseResponse(top, reason,
                java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
    }

    private String buildAstroReasoning(List<GlobalSymbolEntry> top) {
        if (top.isEmpty()) return "Kolektif bilinçdışı bugün sessiz; yeni rüyalar ufukta beliriyor.";

        String topSymbol = top.get(0).symbolName();
        String house = resolveHouse(topSymbol);

        // Build transit context
        try {
            List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(LocalDate.now());
            Optional<PlanetPosition> moon = transits.stream()
                    .filter(p -> "Moon".equalsIgnoreCase(p.planet()) || "Ay".equalsIgnoreCase(p.planet()))
                    .findFirst();

            String moonInfo = moon.map(m -> "Ay " + m.sign() + " burcunda").orElse("Ay gezeyor");
            String symbols = top.stream().limit(3).map(GlobalSymbolEntry::symbolName).collect(Collectors.joining(", "));

            return String.format(
                    "%s — bugün kolektif bilinçdışı '%s' imgesiyle titreşiyor. " +
                    "%s ile güçlü biçimde rezonans oluşuyor. (%s etkisi)",
                    moonInfo, topSymbol, symbols, house
            );
        } catch (Exception e) {
            return String.format(
                    "Bugün dünyanın rüyaları '%s' sembolü etrafında yoğunlaşıyor. " +
                    "Bu %s enerjisinin kolektif bir yansıması.", topSymbol, house
            );
        }
    }

    /** Called by AI Orchestrator response handler to update astro reasoning from LLM. */
    public void updateCollectivePulseReasoning(String astroReasoning) {
        try {
            Object cached = redisTemplate.opsForValue().get(COLLECTIVE_PULSE_KEY);
            if (cached != null) {
                CollectivePulseResponse old = objectMapper.convertValue(cached, CollectivePulseResponse.class);
                CollectivePulseResponse updated = new CollectivePulseResponse(
                        old.topSymbols(), astroReasoning, old.generatedAt());
                redisTemplate.opsForValue().set(COLLECTIVE_PULSE_KEY, updated, COLLECTIVE_PULSE_TTL);
            }
        } catch (Exception e) {
            log.warn("Failed to update collective pulse reasoning in Redis: {}", e.getMessage());
        }
    }

    /** Force invalidate cache (called when new dream symbols come in). */
    public void invalidateCollectivePulseCache() {
        try {
            redisTemplate.delete(COLLECTIVE_PULSE_KEY);
        } catch (Exception ignored) {}
    }

    public String getEmojiForSymbol(String symbolName) {
        return SYMBOL_EMOJI_MAP.getOrDefault(symbolName.toLowerCase().trim(), "✨");
    }
}
