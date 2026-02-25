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
    private final CosmicActionEngineService cosmicActionEngineService;
    private final DailyLifeGuideService dailyLifeGuideService;
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

    public PlannerFullDistributionResponse calculatePlannerFullDistribution(PlannerFullDistributionRequest request) {
        log.info("Calculating full planner distribution for user: {}, monthsAhead: {}, mode: {}, categories: {}",
                request.userId(), request.monthsAhead(), request.responseMode(),
                request.categories() == null ? "ALL" : request.categories().size());
        String locale = normalizeLocale(request.locale());
        PlannerDateRange range = resolvePlannerDateRange(request);
        boolean includeActionDetails = request.responseMode() != PlannerResponseMode.GRID_ONLY;
        List<PlannerCategory> plannerCategories = resolvePlannerCategories(request);

        NatalChart chart = natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc(
                        request.userId().toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Natal chart not found for user: " + request.userId()));

        List<PlanetPosition> natalPlanets = parseJsonList(chart.getPlanetPositionsJson(), PlanetPosition.class);
        List<HousePlacement> natalHouses = parseJsonList(chart.getHousePlacementsJson(), HousePlacement.class);

        LocalDate startDate = range.startDate();
        LocalDate endDate = range.endDate();
        List<PlannerDayInsight> dayInsights = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            List<PlanetPosition> transits = getTransitPositionsCached(date);
            List<PlanetaryAspect> aspects = includeActionDetails
                    ? transitCalculator.calculateTransitAspects(transits, natalPlanets)
                    : List.of();
            String moonPhase = transitCalculator.getMoonPhase(date);
            String localizedMoonPhase = localizeMoonPhase(moonPhase, locale);
            boolean mercuryRetro = transitCalculator.isRetrograde(2, date.toEpochDay());

            List<PlannerCategoryAction> categoryActions = new ArrayList<>();
            int totalScore = 0;
            Map<String, Integer> syncedGroupScores = loadDecisionCompassGroupScores(request, locale, date);
            List<String> supportingAspects = includeActionDetails
                    ? aspects.stream()
                    .sorted(Comparator.comparingDouble(PlanetaryAspect::orb))
                    .map(aspect -> localizeSupportingAspect(aspect, locale))
                    .limit(4)
                    .toList()
                    : List.of();

            for (PlannerCategory plannerCategory : plannerCategories) {
                GoalCategory baseGoal = plannerCategory.getBaseGoalCategory();
                Integer syncedScore = resolveSyncedPlannerCategoryScore(plannerCategory, syncedGroupScores);
                int normalizedScore = syncedScore != null
                        ? clampScore(syncedScore)
                        : normalizeScore(scoreDate(date, transits, natalPlanets, natalHouses, baseGoal));

                CosmicActionEngineService.ActionBundle bundle = includeActionDetails
                        ? cosmicActionEngineService.buildActions(
                        plannerCategory,
                        date,
                        normalizedScore,
                        aspects,
                        transits,
                        moonPhase,
                        mercuryRetro,
                        request.userGender(),
                        locale
                )
                        : new CosmicActionEngineService.ActionBundle(List.of(), List.of(), "", 0);

                int adjustedScore = syncedScore != null
                        ? clampScore(normalizedScore)
                        : clampScore(normalizedScore + bundle.scoreAdjustment());
                totalScore += adjustedScore;

                categoryActions.add(new PlannerCategoryAction(
                        plannerCategory,
                        plannerCategory.getLabel(locale),
                        adjustedScore,
                        bundle.dos(),
                        bundle.donts(),
                        bundle.reasoning(),
                        supportingAspects,
                        mercuryRetro,
                        localizedMoonPhase,
                        includeActionDetails
                                ? (syncedScore != null ? "LIFE_GUIDE_SYNC" : "RULE_ENGINE")
                                : "GRID_ONLY"
                ));
            }

            int overallScore = categoryActions.isEmpty() ? 0 : totalScore / categoryActions.size();
            dayInsights.add(new PlannerDayInsight(date, overallScore, categoryActions));
        }

        return new PlannerFullDistributionResponse(
                request.userId(),
                request.monthsAhead(),
                startDate,
                endDate,
                dayInsights,
                LocalDateTime.now()
        );
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
        int normalizedScore = normalizeScore(sd.score());

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

    private int normalizeScore(int rawScore) {
        return clampScore(50 + rawScore);
    }

    private int clampScore(int score) {
        return Math.max(5, Math.min(100, score));
    }

    private Map<String, Integer> loadDecisionCompassGroupScores(
            PlannerFullDistributionRequest request,
            String locale,
            LocalDate date
    ) {
        try {
            DailyLifeGuideResponse response = dailyLifeGuideService.getDailyGuide(
                    new DailyLifeGuideRequest(
                            request.userId(),
                            locale,
                            request.userGender(),
                            request.maritalStatus(),
                            date
                    )
            );
            if (response.groups() == null || response.groups().isEmpty()) {
                return Map.of();
            }
            return response.groups().stream().collect(Collectors.toMap(
                    DailyLifeGuideGroupSummary::groupKey,
                    DailyLifeGuideGroupSummary::averageScore,
                    (a, b) -> a,
                    HashMap::new
            ));
        } catch (Exception e) {
            log.warn("Decision Compass sync score load failed for user {} date {}", request.userId(), date, e);
            return Map.of();
        }
    }

    private Integer resolveSyncedPlannerCategoryScore(PlannerCategory plannerCategory, Map<String, Integer> groupScores) {
        String groupKey = switch (plannerCategory) {
            case BEAUTY -> "beauty";
            case FINANCE -> "finance";
            case ACTIVITY -> "activity";
            case OFFICIAL -> "official";
            case DATE, MARRIAGE, RELATIONSHIP_HARMONY -> "social";
            case HEALTH -> "health";
            case FAMILY -> "home";
            case SPIRITUAL -> "spiritual";
            default -> null;
        };
        return groupKey == null ? null : groupScores.get(groupKey);
    }

    private int getSignIndex(String sign) {
        String[] signs = {"Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"};
        for (int i = 0; i < signs.length; i++) {
            if (signs[i].equalsIgnoreCase(sign)) return i;
        }
        return 0;
    }

    private PlannerDateRange resolvePlannerDateRange(PlannerFullDistributionRequest request) {
        LocalDate startDate = request.startDate();
        LocalDate endDate = request.endDate();

        if (startDate != null || endDate != null) {
            if (startDate == null || endDate == null) {
                throw new IllegalArgumentException("startDate and endDate must be provided together");
            }
            if (endDate.isBefore(startDate)) {
                throw new IllegalArgumentException("endDate cannot be before startDate");
            }
            long dayCount = startDate.datesUntil(endDate.plusDays(1)).count();
            if (dayCount > 62) {
                throw new IllegalArgumentException("Requested planner date range is too large (max 62 days)");
            }
            return new PlannerDateRange(startDate, endDate);
        }

        LocalDate calculatedStart = LocalDate.now();
        LocalDate calculatedEnd = calculatedStart.plusMonths(request.monthsAhead());
        return new PlannerDateRange(calculatedStart, calculatedEnd);
    }

    private List<PlannerCategory> resolvePlannerCategories(PlannerFullDistributionRequest request) {
        if (request.categories() == null || request.categories().isEmpty()) {
            return Arrays.asList(PlannerCategory.values());
        }
        List<PlannerCategory> filtered = request.categories().stream().filter(Objects::nonNull).distinct().toList();
        return filtered.isEmpty() ? Arrays.asList(PlannerCategory.values()) : filtered;
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) return "tr";
        return locale.toLowerCase().startsWith("en") ? "en" : "tr";
    }

    private String localizeMoonPhase(String moonPhase, String locale) {
        if ("en".equals(locale)) {
            return switch (moonPhase) {
                case "Yeni Ay" -> "New Moon";
                case "Hilal (Büyüyen)" -> "Waxing Crescent";
                case "İlk Dördün" -> "First Quarter";
                case "Şişkin Ay (Büyüyen)" -> "Waxing Gibbous";
                case "Dolunay" -> "Full Moon";
                case "Şişkin Ay (Küçülen)" -> "Waning Gibbous";
                case "Son Dördün" -> "Last Quarter";
                case "Hilal (Küçülen)" -> "Waning Crescent";
                default -> moonPhase;
            };
        }
        return moonPhase;
    }

    private String localizeSupportingAspect(PlanetaryAspect aspect, String locale) {
        String planet1 = aspect.planet1().replace("T-", "");
        String planet2 = aspect.planet2().replace("N-", "");
        if ("tr".equals(locale)) {
            planet1 = localizePlanetNameTr(planet1);
            planet2 = localizePlanetNameTr(planet2);
        }
        return planet1 + " " + aspect.type().getSymbol() + " " + planet2;
    }

    private String localizePlanetNameTr(String name) {
        return switch (name) {
            case "Sun" -> "Güneş";
            case "Moon" -> "Ay";
            case "Mercury" -> "Merkür";
            case "Venus" -> "Venüs";
            case "Mars" -> "Mars";
            case "Jupiter" -> "Jüpiter";
            case "Saturn" -> "Satürn";
            case "Uranus" -> "Uranüs";
            case "Neptune" -> "Neptün";
            case "Pluto" -> "Plüton";
            case "Chiron" -> "Kiron";
            case "NorthNode" -> "Kuzey Ay Düğümü";
            case "SouthNode" -> "Güney Ay Düğümü";
            default -> name;
        };
    }

    private record PlannerDateRange(LocalDate startDate, LocalDate endDate) {}
    private record ScoredDate(LocalDate date, int score, List<PlanetPosition> transits, List<PlanetaryAspect> aspects) {}
}
