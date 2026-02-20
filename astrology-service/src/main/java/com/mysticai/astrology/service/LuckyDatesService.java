package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.LuckyDatesResult;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.LuckyDatesResultRepository;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.common.event.AiAnalysisEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LuckyDatesService {

    private final NatalChartRepository natalChartRepository;
    private final LuckyDatesResultRepository luckyDatesResultRepository;
    private final TransitCalculator transitCalculator;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";
    private static final String TRANSIT_CACHE_PREFIX = "transit:positions:";

    @Transactional
    public LuckyDatesResponse calculateLuckyDates(LuckyDatesRequest request) {
        log.info("Calculating lucky dates for user: {}, category: {}", request.userId(), request.goalCategory());

        // Fetch user's latest natal chart
        NatalChart chart = natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc(
                        request.userId().toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Natal chart not found for user: " + request.userId()));

        // Parse natal data from JSON
        List<PlanetPosition> natalPlanets = parseJsonList(chart.getPlanetPositionsJson(), PlanetPosition.class);
        List<HousePlacement> natalHouses = parseJsonList(chart.getHousePlacementsJson(), HousePlacement.class);

        // Calculate scores for each day
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusMonths(request.monthsAhead());
        List<ScoredDate> scoredDates = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            List<PlanetPosition> transits = getTransitPositionsCached(date);
            int score = scoreDate(date, transits, natalPlanets, natalHouses, request.goalCategory());
            if (score > 0) {
                List<PlanetaryAspect> aspects = transitCalculator.calculateTransitAspects(transits, natalPlanets);
                scoredDates.add(new ScoredDate(date, score, transits, aspects));
            }
        }

        // Select top 5-8 dates
        scoredDates.sort(Comparator.comparingInt(ScoredDate::score).reversed());
        List<ScoredDate> topDates = scoredDates.subList(0, Math.min(8, scoredDates.size()));

        // Build LuckyDateCards
        List<LuckyDateCard> luckyDateCards = topDates.stream()
                .map(sd -> buildLuckyDateCard(sd, natalPlanets, natalHouses, request.goalCategory()))
                .toList();

        // Generate hook text
        String hookText = generateHookText(chart, request.goalCategory());

        // Save result
        UUID correlationId = UUID.randomUUID();
        String luckyDatesJson;
        try {
            luckyDatesJson = objectMapper.writeValueAsString(luckyDateCards);
        } catch (JsonProcessingException e) {
            luckyDatesJson = "[]";
        }

        LuckyDatesResult result = LuckyDatesResult.builder()
                .userId(request.userId())
                .goalCategory(request.goalCategory())
                .luckyDatesJson(luckyDatesJson)
                .hookText(hookText)
                .interpretationStatus("PENDING")
                .correlationId(correlationId)
                .build();

        luckyDatesResultRepository.save(result);

        // Publish to AI Orchestrator for enrichment
        publishToAiOrchestrator(result, chart, luckyDateCards, correlationId);

        return new LuckyDatesResponse(
                request.userId(),
                request.goalCategory(),
                hookText,
                luckyDateCards,
                null,
                "PROCESSING",
                correlationId,
                LocalDateTime.now()
        );
    }

    public List<LuckyDatesResponse> getLuckyDatesByUser(Long userId) {
        return luckyDatesResultRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public LuckyDatesResponse getLuckyDatesByCorrelationId(UUID correlationId) {
        LuckyDatesResult result = luckyDatesResultRepository.findByCorrelationId(correlationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Lucky dates result not found for correlationId: " + correlationId));
        return mapToResponse(result);
    }

    private int scoreDate(LocalDate date, List<PlanetPosition> transits,
                          List<PlanetPosition> natalPlanets, List<HousePlacement> natalHouses,
                          GoalCategory category) {
        int score = 0;

        for (PlanetPosition transit : transits) {
            // Only score relevant transit planets for this category
            if (!category.getTransitPlanets().contains(transit.planet())) continue;

            // Check if transit planet is in a target house
            int transitHouse = transitCalculator.getTransitHouse(transit, natalHouses);
            if (category.getTargetHouses().contains(transitHouse)) {
                score += 15;
            }

            // Check aspects to target natal planets
            for (PlanetPosition natalPlanet : natalPlanets) {
                if (!category.getTargetNatalPlanets().contains(natalPlanet.planet())) continue;

                double transitLong = transit.absoluteLongitude() > 0
                        ? transit.absoluteLongitude() : getAbsoluteLongitude(transit);
                double natalLong = natalPlanet.absoluteLongitude() > 0
                        ? natalPlanet.absoluteLongitude() : getAbsoluteLongitude(natalPlanet);
                double angle = Math.abs(transitLong - natalLong);
                if (angle > 180) angle = 360 - angle;

                for (PlanetaryAspect.AspectType type : PlanetaryAspect.AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb <= type.getOrbAllowance()) {
                        score += switch (type) {
                            case TRINE -> 20;
                            case SEXTILE -> 15;
                            case CONJUNCTION -> 10;
                            case SQUARE -> -10;
                            case OPPOSITION -> -15;
                        };
                        break;
                    }
                }
            }
        }

        // Mercury retrograde penalty for CONTRACT
        if (category == GoalCategory.CONTRACT) {
            boolean mercuryRetro = transitCalculator.isRetrograde(2, date.toEpochDay()); // Mercury = index 2
            if (mercuryRetro) score -= 25;
        }

        // Moon phase bonus for NEW_BEGINNING
        if (category == GoalCategory.NEW_BEGINNING) {
            String moonPhase = transitCalculator.getMoonPhase(date);
            if ("Yeni Ay".equals(moonPhase)) score += 15;
            if ("Hilal (Büyüyen)".equals(moonPhase)) score += 10;
        }

        return score;
    }

    private LuckyDateCard buildLuckyDateCard(ScoredDate sd, List<PlanetPosition> natalPlanets,
                                              List<HousePlacement> natalHouses, GoalCategory category) {
        // Normalize score to 0-100
        int normalizedScore = Math.min(100, Math.max(0, 50 + sd.score()));

        // Build reason text
        String reason = buildReasonText(sd, natalHouses, category);

        // Get supporting aspects
        List<String> supportingAspects = sd.aspects().stream()
                .filter(a -> a.type() == PlanetaryAspect.AspectType.TRINE
                        || a.type() == PlanetaryAspect.AspectType.SEXTILE
                        || a.type() == PlanetaryAspect.AspectType.CONJUNCTION)
                .map(a -> a.planet1().replace("T-", "") + " " + a.type().getSymbol() + " " + a.planet2().replace("N-", ""))
                .limit(3)
                .toList();

        boolean mercuryRetro = transitCalculator.isRetrograde(2, sd.date().toEpochDay());
        String moonPhase = transitCalculator.getMoonPhase(sd.date());

        return new LuckyDateCard(sd.date(), normalizedScore, reason, supportingAspects, mercuryRetro, moonPhase);
    }

    private String buildReasonText(ScoredDate sd, List<HousePlacement> natalHouses, GoalCategory category) {
        StringBuilder sb = new StringBuilder();

        for (PlanetPosition transit : sd.transits()) {
            if (!category.getTransitPlanets().contains(transit.planet())) continue;
            int house = transitCalculator.getTransitHouse(transit, natalHouses);
            if (category.getTargetHouses().contains(house)) {
                sb.append(transit.planet()).append(" ").append(house).append(". evde");
                if (transit.retrograde()) sb.append(" (R)");
                sb.append(". ");
            }
        }

        if (!sd.aspects().isEmpty()) {
            PlanetaryAspect best = sd.aspects().stream()
                    .filter(a -> a.type() == PlanetaryAspect.AspectType.TRINE || a.type() == PlanetaryAspect.AspectType.SEXTILE)
                    .findFirst()
                    .orElse(sd.aspects().get(0));
            sb.append(best.planet1().replace("T-", "")).append(" ile ")
                    .append(best.planet2().replace("N-", "")).append(" arasında ")
                    .append(best.type().getTurkishName()).append(" açısı.");
        }

        return sb.toString().trim();
    }

    private String generateHookText(NatalChart chart, GoalCategory category) {
        String sunSign = chart.getSunSign();
        String moonSign = chart.getMoonSign();
        String rising = chart.getRisingSign();

        return switch (category) {
            case MARRIAGE -> String.format(
                    "%s Güneşi ve %s yükseleni ile ilişkilerde derin bir uyum arayışındasın. " +
                    "Venüs transitlerinin natal haritanla buluştuğu anlar, aşk ve bağlanma için kozmik pencereler açıyor.",
                    sunSign, rising);
            case CAREER -> String.format(
                    "%s enerjisi ile kariyer alanında güçlü bir liderlik potansiyelin var. " +
                    "Mars ve Satürn'ün 10. evinle etkileşime geçtiği günler, profesyonel atılımlar için ideal.",
                    sunSign);
            case CONTRACT -> String.format(
                    "%s Ay'ı ve %s yükseleni ile iletişim ve anlaşma konusunda doğal bir yeteneğin var. " +
                    "Merkür transitlerinin natal Merkür'ünle uyum yakalayacağı tarihler, kritik imzalar için en uygun zamanlar.",
                    moonSign, rising);
            case NEW_BEGINNING -> String.format(
                    "%s Güneşi ile yeni başlangıçlara açık bir ruhun var. " +
                    "Jüpiter ve Güneş transitlerinin 1. evinle buluştuğu anlar, hayata yeni bir sayfa açmak için mükemmel.",
                    sunSign);
        };
    }

    private void publishToAiOrchestrator(LuckyDatesResult result, NatalChart chart,
                                          List<LuckyDateCard> luckyDateCards, UUID correlationId) {
        try {
            Map<String, Object> payload = Map.of(
                    "resultId", result.getId(),
                    "goalCategory", result.getGoalCategory().getTurkishName(),
                    "sunSign", chart.getSunSign(),
                    "moonSign", chart.getMoonSign(),
                    "risingSign", chart.getRisingSign(),
                    "hookText", result.getHookText(),
                    "luckyDates", luckyDateCards
            );

            AiAnalysisEvent event = new AiAnalysisEvent(
                    correlationId,
                    result.getUserId(),
                    objectMapper.writeValueAsString(payload),
                    AiAnalysisEvent.SourceService.ASTROLOGY,
                    AiAnalysisEvent.AnalysisType.LUCKY_DATES,
                    LocalDateTime.now()
            );

            rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, event);
            log.info("Sent lucky dates {} to AI Orchestrator", result.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to send lucky dates to AI Orchestrator", e);
        }
    }

    private List<PlanetPosition> getTransitPositionsCached(LocalDate date) {
        String cacheKey = TRANSIT_CACHE_PREFIX + date;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class));
            }
        } catch (Exception e) {
            log.debug("Cache miss or error for transit positions: {}", date);
        }

        List<PlanetPosition> positions = transitCalculator.calculateTransitPositions(date);

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(positions), 24, TimeUnit.HOURS);
        } catch (Exception e) {
            log.debug("Failed to cache transit positions: {}", date);
        }

        return positions;
    }

    private LuckyDatesResponse mapToResponse(LuckyDatesResult result) {
        List<LuckyDateCard> cards = parseJsonList(result.getLuckyDatesJson(), LuckyDateCard.class);
        return new LuckyDatesResponse(
                result.getUserId(),
                result.getGoalCategory(),
                result.getHookText(),
                cards,
                result.getAiInterpretation(),
                result.getInterpretationStatus(),
                result.getCorrelationId(),
                result.getCreatedAt()
        );
    }

    private <T> List<T> parseJsonList(String json, Class<T> clazz) {
        if (json == null || json.isEmpty()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
        } catch (JsonProcessingException e) {
            log.error("Failed to parse JSON list", e);
            return List.of();
        }
    }

    private double getAbsoluteLongitude(PlanetPosition planet) {
        int signIndex = getSignIndex(planet.sign());
        return signIndex * 30.0 + planet.degree() + planet.minutes() / 60.0 + planet.seconds() / 3600.0;
    }

    private int getSignIndex(String sign) {
        String[] signs = {"Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"};
        for (int i = 0; i < signs.length; i++) {
            if (signs[i].equalsIgnoreCase(sign)) return i;
        }
        return 0;
    }

    private record ScoredDate(LocalDate date, int score, List<PlanetPosition> transits, List<PlanetaryAspect> aspects) {}
}
