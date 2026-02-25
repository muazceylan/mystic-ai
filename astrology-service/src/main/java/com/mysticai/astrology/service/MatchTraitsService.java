package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.CategoryGroup;
import com.mysticai.astrology.dto.CrossAspect;
import com.mysticai.astrology.dto.MatchTraitsResponse;
import com.mysticai.astrology.dto.TraitAxis;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.SynastryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchTraitsService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    private final SynastryRepository synastryRepository;
    private final ObjectMapper objectMapper;
    private final TraitScoringEngine traitScoringEngine;
    private final LlmNotesService llmNotesService;

    private final ConcurrentHashMap<Long, CachedEntry> cache = new ConcurrentHashMap<>();

    public MatchTraitsResponse getTraitsForMatch(Long matchId) {
        if (matchId == null) {
            throw new IllegalArgumentException("matchId is required");
        }

        Synastry synastry = synastryRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));

        int fingerprint = Objects.hash(
                synastry.getCrossAspectsJson(),
                synastry.getHarmonyScore(),
                synastry.getStatus(),
                synastry.getRelationshipType()
        );

        CachedEntry cached = cache.get(matchId);
        if (cached != null && !cached.isExpired() && cached.fingerprint() == fingerprint) {
            return cached.response();
        }

        List<CrossAspect> aspects = parseCrossAspects(synastry.getCrossAspectsJson());
        List<CategoryGroup> categories = traitScoringEngine.scoreCategories(aspects, synastry.getHarmonyScore());

        List<TraitAxis> allAxes = categories.stream().flatMap(g -> g.items().stream()).toList();
        LlmNotesService.NotesResult notesResult = llmNotesService.generateNotes(allAxes, synastry.getHarmonyScore());

        Map<String, String> notesByAxisId = notesResult.notesByAxisId();
        List<CategoryGroup> categoriesWithNotes = traitScoringEngine.applyNotes(categories, notesByAxisId);
        List<TraitAxis> cardAxes = traitScoringEngine.selectCardAxes(categoriesWithNotes, 8);
        List<TraitAxis> cardAxesWithNotes = traitScoringEngine.applyNotesToAxes(cardAxes, notesByAxisId);

        String cardSummary = notesResult.cardSummary();
        if (cardSummary == null || cardSummary.isBlank()) {
            cardSummary = buildFallbackSummary(synastry, cardAxesWithNotes);
        }

        MatchTraitsResponse response = new MatchTraitsResponse(
                matchId,
                synastry.getHarmonyScore(),
                categoriesWithNotes,
                cardAxesWithNotes,
                cardSummary
        );

        cache.put(matchId, new CachedEntry(response, fingerprint, System.currentTimeMillis() + CACHE_TTL.toMillis()));
        return response;
    }

    private String buildFallbackSummary(Synastry synastry, List<TraitAxis> cardAxes) {
        Integer score = synastry.getHarmonyScore();
        if (score == null) {
            return "Uyum eksenleri hazırlandı; detaylar skor tamamlandıkça netleşir.";
        }
        if (cardAxes == null || cardAxes.isEmpty()) {
            return score >= 70
                    ? "Genelde uyumlu bir akış görülüyor; farklılıklar dengeyle güçlenebilir."
                    : "Farklılıklar belirgin; iletişimle dengeli bir ritim kurulabilir.";
        }
        TraitAxis strongest = cardAxes.stream()
                .max(java.util.Comparator.comparingInt(a -> Math.abs((a.score0to100() == null ? 50 : a.score0to100()) - 50)))
                .orElse(cardAxes.get(0));
        int strongestScore = strongest.score0to100() == null ? 50 : strongest.score0to100();
        String emphasis = strongestScore < 50 ? strongest.leftLabel() : strongest.rightLabel();
        return (score >= 70
                ? "Uyum yüksek; "
                : score >= 50
                ? "Uyum dengeli; "
                : "Uyum dalgalı; ")
                + emphasis + " tarafı bu eşleşmede daha görünür olabilir.";
    }

    private List<CrossAspect> parseCrossAspects(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, CrossAspect.class)
            );
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse synastry cross aspects for trait scoring", e);
            return List.of();
        }
    }

    private record CachedEntry(MatchTraitsResponse response, int fingerprint, long expiresAtMs) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAtMs;
        }
    }
}
