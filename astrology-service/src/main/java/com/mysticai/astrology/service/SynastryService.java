package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.dto.PlanetaryAspect.AspectType;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.SavedPerson;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SavedPersonRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import com.mysticai.common.event.AiAnalysisEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SynastryService {

    private final SynastryRepository synastryRepository;
    private final NatalChartRepository natalChartRepository;
    private final SavedPersonRepository savedPersonRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";

    // ─── Planets considered key for each relationship type ─────────────────────
    private static final Set<String> LOVE_KEY_PLANETS     = Set.of("Venus", "Mars", "Moon", "Sun");
    private static final Set<String> BUSINESS_KEY_PLANETS = Set.of("Saturn", "Mercury", "Jupiter", "Sun");
    private static final Set<String> FRIEND_KEY_PLANETS   = Set.of("Jupiter", "Sun", "Moon", "Mercury", "Venus");
    private static final Set<String> RIVAL_KEY_PLANETS    = Set.of("Mars", "Saturn", "Pluto", "Sun");

    @Transactional
    public SynastryResponse analyze(SynastryRequest req) {
        log.info("Synastry analysis: userId={}, personId={}, type={}",
                req.userId(), req.savedPersonId(), req.relationshipType());

        // Fetch user's latest natal chart
        NatalChart userChart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDesc(req.userId().toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No natal chart found for userId=" + req.userId() + ". Calculate your chart first."));

        // Fetch saved person
        SavedPerson person = savedPersonRepository.findById(req.savedPersonId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Saved person not found: " + req.savedPersonId()));

        // Parse planet positions from JSON
        List<PlanetPosition> userPlanets   = parsePlanets(userChart.getPlanetPositionsJson());
        List<PlanetPosition> partnerPlanets = parsePlanets(person.getPlanetPositionsJson());

        // Calculate cross-chart aspects
        List<CrossAspect> crossAspects = calculateCrossAspects(userPlanets, partnerPlanets);

        // Persist initial Synastry with null harmonyScore — AI will calculate it
        String crossAspectsJson;
        try {
            crossAspectsJson = objectMapper.writeValueAsString(crossAspects);
        } catch (JsonProcessingException e) {
            crossAspectsJson = "[]";
        }

        UUID correlationId = UUID.randomUUID();
        Synastry synastry = Synastry.builder()
                .userId(req.userId())
                .savedPersonId(req.savedPersonId())
                .relationshipType(req.relationshipType())
                .harmonyScore(null) // AI will calculate the real score
                .crossAspectsJson(crossAspectsJson)
                .status("PENDING")
                .correlationId(correlationId)
                .build();
        synastry = synastryRepository.save(synastry);

        // Build AI payload and send asynchronously
        sendToAiOrchestrator(synastry, userChart, person, crossAspects, req);

        return mapToResponse(synastry, person.getName(), crossAspects);
    }

    public SynastryResponse getById(Long id) {
        Synastry s = synastryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Synastry not found: " + id));
        SavedPerson person = savedPersonRepository.findById(s.getSavedPersonId()).orElse(null);
        List<CrossAspect> aspects = parseCrossAspects(s.getCrossAspectsJson());
        return mapToResponse(s, person != null ? person.getName() : "Bilinmiyor", aspects);
    }

    public List<SynastryResponse> getByUser(Long userId) {
        return synastryRepository.findAllByUserIdOrderByCalculatedAtDesc(userId)
                .stream()
                .map(s -> {
                    SavedPerson p = savedPersonRepository.findById(s.getSavedPersonId()).orElse(null);
                    return mapToResponse(s, p != null ? p.getName() : "Bilinmiyor",
                            parseCrossAspects(s.getCrossAspectsJson()));
                })
                .toList();
    }

    // ─── Cross-aspect calculation ───────────────────────────────────────────────

    private List<CrossAspect> calculateCrossAspects(
            List<PlanetPosition> userPlanets,
            List<PlanetPosition> partnerPlanets) {

        List<CrossAspect> aspects = new ArrayList<>();

        for (PlanetPosition u : userPlanets) {
            for (PlanetPosition p : partnerPlanets) {
                double angle = Math.abs(u.absoluteLongitude() - p.absoluteLongitude());
                if (angle > 180) angle = 360 - angle;

                for (AspectType type : AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb <= type.getOrbAllowance()) {
                        boolean harmonious = isHarmonious(type, u.planet(), p.planet());
                        aspects.add(new CrossAspect(
                                u.planet(), p.planet(),
                                type.name(), type.getSymbol(), type.getTurkishName(),
                                Math.round(angle * 100.0) / 100.0,
                                Math.round(orb * 100.0) / 100.0,
                                harmonious
                        ));
                        break;
                    }
                }
            }
        }

        return aspects;
    }

    /**
     * Whether an aspect between two planets is harmonious.
     * Trine and Sextile are always harmonious.
     * Conjunction is harmonious unless both planets are traditionally malefic.
     * Square and Opposition are always challenging.
     */
    private boolean isHarmonious(AspectType type, String planet1, String planet2) {
        return switch (type) {
            case TRINE, SEXTILE -> true;
            case CONJUNCTION    -> !isMalefic(planet1) || !isMalefic(planet2);
            case SQUARE, OPPOSITION -> false;
        };
    }

    private boolean isMalefic(String planet) {
        return planet.equals("Mars") || planet.equals("Saturn") || planet.equals("Pluto");
    }

    // ─── Harmony score ──────────────────────────────────────────────────────────

    private int computeHarmonyScore(List<CrossAspect> aspects, String type) {
        Set<String> keyPlanets = switch (type.toUpperCase()) {
            case "LOVE"       -> LOVE_KEY_PLANETS;
            case "BUSINESS"   -> BUSINESS_KEY_PLANETS;
            case "FRIENDSHIP" -> FRIEND_KEY_PLANETS;
            case "RIVAL"      -> RIVAL_KEY_PLANETS;
            default           -> Set.of("Sun", "Moon", "Venus", "Mars");
        };

        double score = 50.0;

        for (CrossAspect ca : aspects) {
            boolean isKey = keyPlanets.contains(ca.userPlanet())
                         || keyPlanets.contains(ca.partnerPlanet());
            double weight = isKey ? 1.5 : 0.5;

            score += switch (ca.aspectType()) {
                case "TRINE"       ->  5.0 * weight;
                case "SEXTILE"     ->  3.0 * weight;
                case "CONJUNCTION" ->  ca.harmonious() ? 4.0 * weight : -2.0 * weight;
                case "SQUARE"      -> -3.0 * weight;
                case "OPPOSITION"  -> -2.5 * weight;
                default            ->  0.0;
            };
        }

        // For RIVAL type — invert: high conflict means high rival score
        if ("RIVAL".equalsIgnoreCase(type)) {
            score = 100 - score;
        }

        return (int) Math.max(0, Math.min(100, Math.round(score)));
    }

    // ─── AI Orchestrator ────────────────────────────────────────────────────────

    private void sendToAiOrchestrator(Synastry synastry, NatalChart userChart,
                                       SavedPerson partner, List<CrossAspect> aspects,
                                       SynastryRequest req) {
        try {
            // Full planet tables (house + degree level detail for AI)
            List<PlanetPosition> userPlanets   = parsePlanets(userChart.getPlanetPositionsJson());
            List<PlanetPosition> partnerPlanets = parsePlanets(partner.getPlanetPositionsJson());
            String userPlanetsText    = formatPlanetsText(userPlanets);
            String partnerPlanetsText = formatPlanetsText(partnerPlanets);

            // All cross-aspects as readable text
            String allAspectsText = aspects.stream()
                    .map(a -> String.format("%s(%s) %s %s(%s) — orb: %.1f°",
                            a.userPlanet(), "Sen", a.aspectTurkish(),
                            a.partnerPlanet(), partner.getName(), a.orb()))
                    .collect(Collectors.joining("\n"));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("synastryId",        synastry.getId());
            payload.put("relationshipType",  req.relationshipType());
            payload.put("userName",          userChart.getName() != null ? userChart.getName() : "Sen");
            payload.put("userSunSign",       userChart.getSunSign());
            payload.put("userMoonSign",      userChart.getMoonSign());
            payload.put("userRisingSign",    userChart.getRisingSign());
            payload.put("userPlanetsText",   userPlanetsText);
            payload.put("partnerName",       partner.getName());
            payload.put("partnerSunSign",    partner.getSunSign());
            payload.put("partnerMoonSign",   partner.getMoonSign());
            payload.put("partnerRisingSign", partner.getRisingSign());
            payload.put("partnerPlanetsText", partnerPlanetsText);
            payload.put("allAspectsText",    allAspectsText);
            payload.put("totalAspects",      aspects.size());
            if (req.locale() != null) {
                payload.put("locale", req.locale());
            }

            String payloadJson = objectMapper.writeValueAsString(payload);

            AiAnalysisEvent eventWithCorr = new AiAnalysisEvent(
                    synastry.getCorrelationId(),
                    req.userId(),
                    payloadJson,
                    AiAnalysisEvent.SourceService.ASTROLOGY,
                    AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS,
                    java.time.LocalDateTime.now()
            );

            rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, eventWithCorr);
            log.info("Sent synastry {} to AI Orchestrator", synastry.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to send synastry to AI Orchestrator", e);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Formats a list of planet positions as a human-readable table for the AI prompt.
     * e.g. "Sun          Aries    15.22° — 10. Ev"
     */
    private String formatPlanetsText(List<PlanetPosition> planets) {
        if (planets == null || planets.isEmpty()) return "Veri yok";
        return planets.stream()
                .map(p -> String.format("%-15s %-12s %5.2f° — %2d. Ev%s",
                        p.planet(), p.sign(), p.degree(), p.house(),
                        p.retrograde() ? " ℞" : ""))
                .collect(Collectors.joining("\n"));
    }

    private List<PlanetPosition> parsePlanets(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class));
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse planet positions JSON", e);
            return List.of();
        }
    }

    private List<CrossAspect> parseCrossAspects(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, CrossAspect.class));
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private SynastryResponse mapToResponse(Synastry s, String personName, List<CrossAspect> aspects) {
        List<String> strengths  = parseStringList(s.getStrengthsJson());
        List<String> challenges = parseStringList(s.getChallengesJson());
        return new SynastryResponse(
                s.getId(), s.getUserId(), s.getSavedPersonId(),
                personName, s.getRelationshipType(), s.getHarmonyScore(),
                aspects, s.getHarmonyInsight(), strengths, challenges,
                s.getKeyWarning(), s.getCosmicAdvice(), s.getStatus(),
                s.getCalculatedAt()
        );
    }

    private List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
