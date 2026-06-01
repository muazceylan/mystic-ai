package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.WeeklySwotResponse;
import com.mysticai.astrology.dto.WeeklySwotResponse.FlashInsight;
import com.mysticai.astrology.dto.WeeklySwotResponse.SwotPoint;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.NatalChartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklySwotService {

    private final TransitCalculator transitCalculator;
    private final NatalChartRepository natalChartRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_PREFIX = "weekly-swot:";

    private static final String[] SIGNS = {
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    };

    private record WeeklyProfile(
            String sunSign,
            String moonSign,
            String risingSign,
            Map<String, Integer> natalHouseByPoint
    ) {}

    private record AspectEvidence(
            LocalDate date,
            PlanetaryAspect aspect,
            int basePoints,
            int weightedPoints,
            Integer transitHouse,
            Integer natalHouse
    ) {
        String signature() {
            return aspect.planet1() + "|" + aspect.type().name() + "|" + aspect.planet2();
        }

        String transitPlanet() {
            return aspect.planet1().replace("T-", "");
        }

        String natalPoint() {
            return aspect.planet2().replace("N-", "");
        }

        boolean strongerThan(AspectEvidence other) {
            if (other == null) return true;
            if (aspect.orb() != other.aspect.orb()) {
                return aspect.orb() < other.aspect.orb();
            }
            if (basePoints != other.basePoints) {
                return basePoints > other.basePoints;
            }
            return date.isBefore(other.date);
        }
    }

    private record HouseEvidence(
            LocalDate date,
            String transitPlanet,
            int house,
            int points
    ) {}

    /**
     * Tracks real weekly evidence instead of inflating scores with generic copy.
     * Repeating the same signature across multiple days still matters, but it should not
     * explode the score unrealistically.
     */
    private static class SwotAccumulator {
        int score = 0;
        final Map<String, AspectEvidence> strongestAspectBySignature = new LinkedHashMap<>();
        final Map<String, Integer> aspectOccurrences = new LinkedHashMap<>();
        final Map<String, HouseEvidence> houseSignals = new LinkedHashMap<>();
        final Set<String> simpleSignals = new LinkedHashSet<>();
        final Set<String> transitPlanets = new LinkedHashSet<>();
        final Set<String> natalTargets = new LinkedHashSet<>();

        void addAspect(int basePoints, PlanetaryAspect aspect, LocalDate date, Integer transitHouse, Integer natalHouse) {
            String key = aspect.planet1() + "|" + aspect.type().name() + "|" + aspect.planet2();
            int occurrence = aspectOccurrences.merge(key, 1, Integer::sum);
            int weighted = (occurrence == 1 ? basePoints : Math.max(2, Math.round(basePoints * 0.30f)))
                    + orbBonus(aspect.orb());
            score += weighted;
            transitPlanets.add(aspect.planet1().replace("T-", ""));
            natalTargets.add(aspect.planet2().replace("N-", ""));

            AspectEvidence candidate = new AspectEvidence(date, aspect, basePoints, weighted, transitHouse, natalHouse);
            AspectEvidence current = strongestAspectBySignature.get(key);
            if (candidate.strongerThan(current)) {
                strongestAspectBySignature.put(key, candidate);
            }
        }

        void addHouseTrigger(String transitPlanet, int house, int points, LocalDate date) {
            String key = transitPlanet + "|" + house;
            transitPlanets.add(transitPlanet);
            if (!houseSignals.containsKey(key)) {
                houseSignals.put(key, new HouseEvidence(date, transitPlanet, house, points));
                score += points;
            }
        }

        void addSimpleSignal(String key, String transitPlanet, int points) {
            if (simpleSignals.add(key)) {
                transitPlanets.add(transitPlanet);
                score += points;
            }
        }

        Collection<AspectEvidence> uniqueAspects() {
            return strongestAspectBySignature.values();
        }

        Collection<HouseEvidence> uniqueHouseSignals() {
            return houseSignals.values();
        }
    }

    public WeeklySwotResponse getWeeklySwot(Long userId, String locale) {
        String lang = (locale != null && locale.toLowerCase().startsWith("en")) ? "en" : "tr";
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        String cacheKey = CACHE_PREFIX + userId + ":" + weekStart + ":" + lang;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, WeeklySwotResponse.class);
            }
        } catch (Exception e) {
            log.debug("Cache miss for weekly-swot user {} week {}", userId, weekStart);
        }

        Optional<NatalChart> chartOpt = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId.toString());
        if (chartOpt.isEmpty()) {
            log.debug("No natal chart found for user {}, returning empty weekly swot", userId);
            return emptySwot();
        }

        NatalChart chart = chartOpt.get();
        List<PlanetPosition> natalPlanets = parseJsonList(chart.getPlanetPositionsJson(), PlanetPosition.class);
        List<HousePlacement> natalHouses = parseJsonList(chart.getHousePlacementsJson(), HousePlacement.class);
        List<PlanetPosition> natalWithVirtual = withVirtualAngles(chart, natalPlanets);
        WeeklyProfile profile = new WeeklyProfile(
                chart.getSunSign(),
                chart.getMoonSign(),
                chart.getRisingSign(),
                buildNatalHouseMap(natalWithVirtual)
        );

        LocalDate weekEnd = weekStart.plusDays(6);
        SwotAccumulator strength = new SwotAccumulator();
        SwotAccumulator weakness = new SwotAccumulator();
        SwotAccumulator opportunity = new SwotAccumulator();
        SwotAccumulator threat = new SwotAccumulator();
        Set<String> weekPhases = new LinkedHashSet<>();

        boolean mercuryRetro = false;
        Integer mercuryRetroHouse = null;
        LocalDate mercuryRetroDay = null;

        for (LocalDate day = weekStart; !day.isAfter(weekEnd); day = day.plusDays(1)) {
            weekPhases.add(transitCalculator.getMoonPhase(day));
            List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(day);
            List<PlanetaryAspect> aspects = transitCalculator.calculateTransitAspects(transits, natalWithVirtual);
            Map<String, Integer> transitHouseByPlanet = buildTransitHouseMap(transits, natalHouses);

            for (PlanetaryAspect aspect : aspects) {
                String transitPlanet = aspect.planet1().replace("T-", "");
                String natalPoint = aspect.planet2().replace("N-", "");
                Integer transitHouse = transitHouseByPlanet.get(transitPlanet);
                Integer natalHouse = profile.natalHouseByPoint().get(natalPoint);

                classifyAspect(strength, weakness, opportunity, threat, aspect, day, transitHouse, natalHouse);
            }

            if (!natalHouses.isEmpty()) {
                PlanetPosition transitVenus = transits.stream()
                        .filter(t -> "Venus".equals(t.planet()))
                        .findFirst()
                        .orElse(null);
                if (transitVenus != null) {
                    int venusHouse = transitCalculator.getTransitHouse(transitVenus, natalHouses);
                    if (venusHouse == 2 || venusHouse == 7 || venusHouse == 10 || venusHouse == 11) {
                        opportunity.addHouseTrigger("Venus", venusHouse, 12, day);
                    }
                }
            }

            PlanetPosition transitMercury = transits.stream()
                    .filter(t -> "Mercury".equals(t.planet()))
                    .findFirst()
                    .orElse(null);
            if (transitMercury != null && transitMercury.retrograde()) {
                threat.addSimpleSignal("mercury-retro", "Mercury", 8);
                mercuryRetro = true;
                if (mercuryRetroDay == null) {
                    mercuryRetroDay = day;
                }
                if (mercuryRetroHouse == null) {
                    mercuryRetroHouse = transitHouseByPlanet.get("Mercury");
                }
            }
        }

        int strengthScore = clampScore(strength.score);
        int weaknessScore = clampScore(weakness.score);
        int opportunityScore = clampScore(opportunity.score);
        int threatScore = clampScore(threat.score);

        SwotText text = new SwotText(lang);
        SwotPoint strengthPoint = buildStrengthPoint(strengthScore, strength, profile, weekStart, text);
        SwotPoint weaknessPoint = buildWeaknessPoint(weaknessScore, weakness, profile, weekStart, text);
        SwotPoint opportunityPoint = buildOpportunityPoint(opportunityScore, opportunity, profile, weekStart, text);
        SwotPoint threatPoint = buildThreatPoint(threatScore, threat, profile, weekStart, mercuryRetro, mercuryRetroHouse, mercuryRetroDay, text);
        FlashInsight flashInsight = buildFlashInsight(
                strength,
                weakness,
                opportunity,
                threat,
                profile,
                weekStart,
                weekPhases,
                mercuryRetro,
                mercuryRetroHouse,
                mercuryRetroDay,
                text
        );

        WeeklySwotResponse response = new WeeklySwotResponse(
                strengthPoint,
                weaknessPoint,
                opportunityPoint,
                threatPoint,
                flashInsight,
                weekStart,
                weekEnd
        );

        try {
            LocalDateTime endOfSunday = weekStart.plusDays(6).atTime(23, 59, 59);
            long ttlSeconds = Math.max(ChronoUnit.SECONDS.between(LocalDateTime.now(), endOfSunday), 3600L);
            redisTemplate.opsForValue().set(cacheKey,
                    objectMapper.writeValueAsString(response), ttlSeconds, TimeUnit.SECONDS);
            log.debug("Cached weekly-swot for user {} week {} (TTL {}s)", userId, weekStart, ttlSeconds);
        } catch (Exception e) {
            log.debug("Failed to cache weekly-swot for user {}", userId);
        }

        return response;
    }

    private void classifyAspect(
            SwotAccumulator strength,
            SwotAccumulator weakness,
            SwotAccumulator opportunity,
            SwotAccumulator threat,
            PlanetaryAspect aspect,
            LocalDate date,
            Integer transitHouse,
            Integer natalHouse
    ) {
        String tp = aspect.planet1().replace("T-", "");
        String np = aspect.planet2().replace("N-", "");
        PlanetaryAspect.AspectType type = aspect.type();

        boolean harmonious = type == PlanetaryAspect.AspectType.TRINE
                || type == PlanetaryAspect.AspectType.SEXTILE
                || type == PlanetaryAspect.AspectType.CONJUNCTION;
        boolean challenging = type == PlanetaryAspect.AspectType.SQUARE
                || type == PlanetaryAspect.AspectType.OPPOSITION;

        if ((tp.equals("Jupiter") || tp.equals("Sun"))
                && harmonious
                && Set.of("Sun", "Moon", "Ascendant", "MC", "Mercury", "Venus").contains(np)) {
            strength.addAspect(np.equals("Sun") || np.equals("Ascendant") || np.equals("MC") ? 15 : 10,
                    aspect, date, transitHouse, natalHouse);
        }

        if ((tp.equals("Venus") || tp.equals("Jupiter") || tp.equals("Uranus"))
                && harmonious
                && Set.of("Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant", "MC").contains(np)) {
            int points = tp.equals("Jupiter") ? 15 : (tp.equals("Venus") ? 12 : 10);
            opportunity.addAspect(points, aspect, date, transitHouse, natalHouse);
        }

        if ((tp.equals("Saturn") || tp.equals("Chiron") || tp.equals("Neptune"))
                && challenging
                && Set.of("Sun", "Moon", "Mercury", "Venus", "Ascendant", "MC").contains(np)) {
            int points = tp.equals("Saturn") ? 16 : (tp.equals("Neptune") ? 12 : 13);
            weakness.addAspect(points, aspect, date, transitHouse, natalHouse);
        }

        if ((tp.equals("Mars") || tp.equals("Mercury"))
                && challenging
                && Set.of("Mercury", "Mars", "Moon", "Venus", "Ascendant").contains(np)) {
            int points = tp.equals("Mars") ? 15 : 12;
            threat.addAspect(points, aspect, date, transitHouse, natalHouse);
        }
    }

    private SwotPoint buildStrengthPoint(int score, SwotAccumulator acc, WeeklyProfile profile, LocalDate weekStart, SwotText text) {
        AspectEvidence primary = findPrimarySupportAspect(acc.uniqueAspects());
        if (primary != null) {
            return new SwotPoint(
                    "STRENGTH",
                    text.supportiveHeadline(primary, weekStart),
                    text.supportiveSubtext(primary),
                    score,
                    text.supportiveTip(primary, profile)
            );
        }

        return new SwotPoint(
                "STRENGTH",
                text.strengthFallbackHeadline(profile),
                text.strengthFallbackSubtext(profile),
                score,
                text.strengthFallbackTip()
        );
    }

    private SwotPoint buildWeaknessPoint(int score, SwotAccumulator acc, WeeklyProfile profile, LocalDate weekStart, SwotText text) {
        AspectEvidence primary = findPrimaryChallengeAspect(acc.uniqueAspects());
        if (primary != null) {
            return new SwotPoint(
                    "WEAKNESS",
                    text.challengingHeadline(primary, weekStart),
                    text.challengingSubtext(primary),
                    score,
                    text.challengingTip(primary)
            );
        }

        return new SwotPoint(
                "WEAKNESS",
                text.weaknessFallbackHeadline(profile),
                text.weaknessFallbackSubtext(),
                score,
                text.weaknessFallbackTip()
        );
    }

    private SwotPoint buildOpportunityPoint(int score, SwotAccumulator acc, WeeklyProfile profile, LocalDate weekStart, SwotText text) {
        AspectEvidence primaryAspect = findPrimaryOpportunityAspect(acc.uniqueAspects());
        if (primaryAspect != null) {
            return new SwotPoint(
                    "OPPORTUNITY",
                    text.opportunityHeadline(primaryAspect, weekStart),
                    text.opportunitySubtext(primaryAspect),
                    score,
                    text.opportunityTip(primaryAspect)
            );
        }

        HouseEvidence houseEvidence = findPrimaryHouseOpportunity(acc.uniqueHouseSignals());
        if (houseEvidence != null) {
            return new SwotPoint(
                    "OPPORTUNITY",
                    text.houseOpportunityHeadline(houseEvidence, weekStart),
                    text.houseOpportunitySubtext(houseEvidence.house()),
                    score,
                    text.houseOpportunityTip(houseEvidence.house())
            );
        }

        return new SwotPoint(
                "OPPORTUNITY",
                text.opportunityFallbackHeadline(profile),
                text.opportunityFallbackSubtext(),
                score,
                text.opportunityFallbackTip()
        );
    }

    private SwotPoint buildThreatPoint(
            int score,
            SwotAccumulator acc,
            WeeklyProfile profile,
            LocalDate weekStart,
            boolean mercuryRetro,
            Integer mercuryRetroHouse,
            LocalDate mercuryRetroDay,
            SwotText text
    ) {
        AspectEvidence primary = findPrimaryThreatAspect(acc.uniqueAspects());
        if (mercuryRetro && primary != null) {
            return new SwotPoint(
                    "THREAT",
                    text.retroThreatHeadline(primary, weekStart),
                    text.retroThreatSubtext(primary, mercuryRetroHouse),
                    score,
                    text.retroThreatTip(primary)
            );
        }

        if (mercuryRetro) {
            return new SwotPoint(
                    "THREAT",
                    text.retroOnlyHeadline(profile, weekStart, mercuryRetroDay),
                    text.retroOnlySubtext(mercuryRetroHouse),
                    score,
                    text.retroOnlyTip()
            );
        }

        if (primary != null) {
            return new SwotPoint(
                    "THREAT",
                    text.challengingHeadline(primary, weekStart),
                    text.threatSubtext(primary),
                    score,
                    text.threatTip(primary)
            );
        }

        return new SwotPoint(
                "THREAT",
                text.threatFallbackHeadline(profile),
                text.threatFallbackSubtext(),
                score,
                text.threatFallbackTip()
        );
    }

    private FlashInsight buildFlashInsight(
            SwotAccumulator strength,
            SwotAccumulator weakness,
            SwotAccumulator opportunity,
            SwotAccumulator threat,
            WeeklyProfile profile,
            LocalDate weekStart,
            Set<String> weekPhases,
            boolean mercuryRetro,
            Integer mercuryRetroHouse,
            LocalDate mercuryRetroDay,
            SwotText text
    ) {
        AspectEvidence topThreat = findPrimaryThreatAspect(threat.uniqueAspects());
        AspectEvidence topOpportunity = findPrimaryOpportunityAspect(opportunity.uniqueAspects());
        AspectEvidence topStrength = findPrimarySupportAspect(strength.uniqueAspects());
        AspectEvidence topWeakness = findPrimaryChallengeAspect(weakness.uniqueAspects());

        if (mercuryRetro) {
            String timing = mercuryRetroDay != null ? text.weekTiming(mercuryRetroDay, weekStart) + " " : "";
            String detail = mercuryRetroHouse != null
                    ? text.flashMercuryRetroHouseDetail(mercuryRetroHouse)
                    : text.flashMercuryRetroDetail();
            return new FlashInsight(
                    "ALERT",
                    timing + text.flashMercuryRetroTitle(),
                    detail
            );
        }

        if (topThreat != null && threat.score >= Math.max(opportunity.score, strength.score)) {
            return new FlashInsight(
                    "ALERT",
                    text.shortAspectFlash(topThreat, weekStart, false),
                    text.threatSubtext(topThreat)
            );
        }

        if (topOpportunity != null && opportunity.score >= strength.score) {
            return new FlashInsight(
                    "FORTUNE",
                    text.shortAspectFlash(topOpportunity, weekStart, true),
                    text.opportunitySubtext(topOpportunity)
            );
        }

        if (topStrength != null) {
            return new FlashInsight(
                    "FORTUNE",
                    text.shortAspectFlash(topStrength, weekStart, true),
                    text.supportiveSubtext(topStrength)
            );
        }

        if (topWeakness != null) {
            return new FlashInsight(
                    "ALERT",
                    text.shortAspectFlash(topWeakness, weekStart, false),
                    text.challengingSubtext(topWeakness)
            );
        }

        if (weekPhases.contains("Dolunay")) {
            return new FlashInsight(
                    "FORTUNE",
                    text.flashFullMoonTitle(),
                    text.flashFullMoonDetail(profile)
            );
        }

        if (weekPhases.contains("Yeni Ay")) {
            return new FlashInsight(
                    "FORTUNE",
                    text.flashNewMoonTitle(),
                    text.flashNewMoonDetail(profile)
            );
        }

        return new FlashInsight(
                "FORTUNE",
                text.flashDefaultTitle(profile),
                text.flashDefaultDetail(profile)
        );
    }

    private List<PlanetPosition> withVirtualAngles(NatalChart chart, List<PlanetPosition> natalPlanets) {
        List<PlanetPosition> natalWithVirtual = new ArrayList<>(natalPlanets);
        if (chart.getAscendantDegree() != null && chart.getAscendantDegree() >= 0) {
            natalWithVirtual.add(createVirtualPoint("Ascendant", chart.getAscendantDegree()));
        }
        if (chart.getMcDegree() != null && chart.getMcDegree() >= 0) {
            natalWithVirtual.add(createVirtualPoint("MC", chart.getMcDegree()));
        }
        return natalWithVirtual;
    }

    private PlanetPosition createVirtualPoint(String name, double absoluteLongitude) {
        int signIndex = (int) (absoluteLongitude / 30.0);
        if (signIndex >= SIGNS.length) {
            signIndex = SIGNS.length - 1;
        }
        double degInSign = absoluteLongitude % 30.0;
        int deg = (int) degInSign;
        double fracDeg = degInSign - deg;
        int minutes = (int) (fracDeg * 60);
        int seconds = (int) ((fracDeg * 60 - minutes) * 60);

        return new PlanetPosition(
                name,
                SIGNS[signIndex],
                deg,
                minutes,
                seconds,
                false,
                "Ascendant".equals(name) ? 1 : 10,
                Math.round(absoluteLongitude * 10000.0) / 10000.0
        );
    }

    private Map<String, Integer> buildNatalHouseMap(List<PlanetPosition> natalPoints) {
        Map<String, Integer> map = new HashMap<>();
        for (PlanetPosition point : natalPoints) {
            if (point.house() > 0) {
                map.put(point.planet(), point.house());
            }
        }
        return map;
    }

    private Map<String, Integer> buildTransitHouseMap(List<PlanetPosition> transits, List<HousePlacement> natalHouses) {
        if (natalHouses == null || natalHouses.isEmpty()) {
            return Map.of();
        }
        Map<String, Integer> map = new HashMap<>();
        for (PlanetPosition transit : transits) {
            map.put(transit.planet(), transitCalculator.getTransitHouse(transit, natalHouses));
        }
        return map;
    }

    private AspectEvidence findPrimarySupportAspect(Collection<AspectEvidence> aspects) {
        return aspects.stream()
                .min(Comparator
                        .comparingInt(this::supportPriority)
                        .thenComparingDouble(a -> a.aspect().orb())
                        .thenComparingInt(a -> houseRank(a.natalHouse())))
                .orElse(null);
    }

    private AspectEvidence findPrimaryChallengeAspect(Collection<AspectEvidence> aspects) {
        return aspects.stream()
                .min(Comparator
                        .comparingInt(this::challengePriority)
                        .thenComparingDouble(a -> a.aspect().orb())
                        .thenComparingInt(a -> houseRank(a.natalHouse())))
                .orElse(null);
    }

    private AspectEvidence findPrimaryOpportunityAspect(Collection<AspectEvidence> aspects) {
        return aspects.stream()
                .min(Comparator
                        .comparingInt(this::opportunityPriority)
                        .thenComparingDouble(a -> a.aspect().orb())
                        .thenComparingInt(a -> houseRank(a.natalHouse())))
                .orElse(null);
    }

    private AspectEvidence findPrimaryThreatAspect(Collection<AspectEvidence> aspects) {
        return aspects.stream()
                .min(Comparator
                        .comparingInt(this::threatPriority)
                        .thenComparingDouble(a -> a.aspect().orb())
                        .thenComparingInt(a -> houseRank(a.natalHouse())))
                .orElse(null);
    }

    private HouseEvidence findPrimaryHouseOpportunity(Collection<HouseEvidence> houses) {
        return houses.stream()
                .min(Comparator
                        .comparingInt((HouseEvidence h) -> houseOpportunityPriority(h.house()))
                        .thenComparing(HouseEvidence::date))
                .orElse(null);
    }

    private int supportPriority(AspectEvidence evidence) {
        return transitPlanetSupportRank(evidence.transitPlanet()) * 100
                + natalPointSupportRank(evidence.natalPoint()) * 10
                + getAspectPriority(evidence.aspect().type(), true);
    }

    private int opportunityPriority(AspectEvidence evidence) {
        return transitPlanetOpportunityRank(evidence.transitPlanet()) * 100
                + natalPointSupportRank(evidence.natalPoint()) * 10
                + getAspectPriority(evidence.aspect().type(), true);
    }

    private int challengePriority(AspectEvidence evidence) {
        return transitPlanetChallengeRank(evidence.transitPlanet()) * 100
                + natalPointChallengeRank(evidence.natalPoint()) * 10
                + getAspectPriority(evidence.aspect().type(), false);
    }

    private int threatPriority(AspectEvidence evidence) {
        return transitPlanetThreatRank(evidence.transitPlanet()) * 100
                + natalPointThreatRank(evidence.natalPoint()) * 10
                + getAspectPriority(evidence.aspect().type(), false);
    }

    private int transitPlanetSupportRank(String planet) {
        return switch (planet) {
            case "Jupiter" -> 0;
            case "Sun" -> 1;
            default -> 3;
        };
    }

    private int transitPlanetOpportunityRank(String planet) {
        return switch (planet) {
            case "Jupiter" -> 0;
            case "Venus" -> 1;
            case "Uranus" -> 2;
            default -> 4;
        };
    }

    private int transitPlanetChallengeRank(String planet) {
        return switch (planet) {
            case "Saturn" -> 0;
            case "Chiron" -> 1;
            case "Neptune" -> 2;
            default -> 4;
        };
    }

    private int transitPlanetThreatRank(String planet) {
        return switch (planet) {
            case "Mars" -> 0;
            case "Mercury" -> 1;
            default -> 4;
        };
    }

    private int natalPointSupportRank(String point) {
        return switch (point) {
            case "Sun", "Ascendant", "MC" -> 0;
            case "Moon", "Mercury", "Venus" -> 1;
            case "Mars" -> 2;
            default -> 3;
        };
    }

    private int natalPointChallengeRank(String point) {
        return switch (point) {
            case "Moon", "Sun", "Ascendant" -> 0;
            case "Mercury", "Venus", "MC" -> 1;
            default -> 3;
        };
    }

    private int natalPointThreatRank(String point) {
        return switch (point) {
            case "Mercury", "Mars", "Moon", "Ascendant" -> 0;
            case "Venus" -> 1;
            default -> 3;
        };
    }

    private int houseOpportunityPriority(int house) {
        return switch (house) {
            case 7 -> 0;
            case 10 -> 1;
            case 2 -> 2;
            case 11 -> 3;
            default -> 4;
        };
    }

    private int houseRank(Integer house) {
        if (house == null) return 9;
        return switch (house) {
            case 1, 10 -> 0;
            case 4, 7 -> 1;
            case 2, 3, 5, 6 -> 2;
            default -> 3;
        };
    }

    private static final class SwotText {
        private final boolean en;

        SwotText(String lang) {
            this.en = "en".equalsIgnoreCase(lang);
        }

        // ── vocabulary ───────────────────────────────────────────────────────────

        private static final Map<String, String> PLANET_TR = Map.ofEntries(
                Map.entry("Sun", "Güneş"), Map.entry("Moon", "Ay"), Map.entry("Mercury", "Merkür"),
                Map.entry("Venus", "Venüs"), Map.entry("Mars", "Mars"), Map.entry("Jupiter", "Jüpiter"),
                Map.entry("Saturn", "Satürn"), Map.entry("Uranus", "Uranüs"), Map.entry("Neptune", "Neptün"),
                Map.entry("Pluto", "Plüton"), Map.entry("Chiron", "Kiron"),
                Map.entry("NorthNode", "Kuzey Düğümü"), Map.entry("Ascendant", "Yükselen"), Map.entry("MC", "MC"));
        private static final Map<String, String> SIGN_TR = Map.ofEntries(
                Map.entry("Aries", "Koç"), Map.entry("Taurus", "Boğa"), Map.entry("Gemini", "İkizler"),
                Map.entry("Cancer", "Yengeç"), Map.entry("Leo", "Aslan"), Map.entry("Virgo", "Başak"),
                Map.entry("Libra", "Terazi"), Map.entry("Scorpio", "Akrep"), Map.entry("Sagittarius", "Yay"),
                Map.entry("Capricorn", "Oğlak"), Map.entry("Aquarius", "Kova"), Map.entry("Pisces", "Balık"));
        private static final Map<String, String> ASPECT_TR = Map.of(
                "TRINE", "üçgen", "SEXTILE", "sekstil", "CONJUNCTION", "kavuşum",
                "SQUARE", "kare", "OPPOSITION", "karşıt", "QUINCUNX", "150'lik");
        private static final Map<String, String> ASPECT_EN = Map.of(
                "TRINE", "trine", "SEXTILE", "sextile", "CONJUNCTION", "conjunction",
                "SQUARE", "square", "OPPOSITION", "opposition", "QUINCUNX", "quincunx");

        private static String normalizeSign(String sign) {
            if (sign == null || sign.isBlank()) return "";
            String t = sign.trim().toLowerCase(Locale.ROOT);
            return t.substring(0, 1).toUpperCase(Locale.ROOT) + t.substring(1);
        }

        private String planetName(String planet) {
            return en ? planet : PLANET_TR.getOrDefault(planet, planet);
        }

        private String signName(String sign) {
            String n = normalizeSign(sign);
            if (n.isEmpty()) return en ? "your sign" : "burç";
            return en ? n : SIGN_TR.getOrDefault(n, n);
        }

        private String aspectName(String type) {
            return en ? ASPECT_EN.getOrDefault(type, type.toLowerCase(Locale.ROOT))
                      : ASPECT_TR.getOrDefault(type, type);
        }

        private String aspectHeadlineLabel(AspectEvidence evidence) {
            String label = planetName(evidence.transitPlanet()) + "-natal " + planetName(evidence.natalPoint());
            if (en) return label + " " + aspectName(evidence.aspect().type().name());
            return label + " " + switch (evidence.aspect().type()) {
                case TRINE -> "üçgeni";
                case SEXTILE -> "sekstili";
                case CONJUNCTION -> "kavuşumu";
                case SQUARE -> "karesi";
                case OPPOSITION -> "karşıtlığı";
                case QUINCUNX -> "150'liği";
            };
        }

        private String orbQualifier(AspectEvidence evidence) {
            double orb = evidence.aspect().orb();
            if (en) {
                if (orb <= 1.0) return "With a tight orb,";
                if (orb <= 3.0) return "With a noticeable orb,";
                return "With a wider orb,";
            }
            if (orb <= 1.0) return "Çok yakın orbla";
            if (orb <= 3.0) return "Yakın orbla";
            return "Daha geniş orbla";
        }

        private String areaTopic(String area) {
            if (en || area == null || area.isBlank()) return area;
            String normalized = area.replace("ilgili yaşam alanın", "ilgili yaşam alanı");
            if ("ilgili yaşam alanı".equals(normalized)) return normalized;
            return normalized
                    .replace(" alanın", "")
                    .replace(" alanı", "");
        }

        private String areaBridgeText(
                AspectEvidence evidence,
                String trCrossAction,
                String trSameAction,
                String enCrossAction,
                String enSameAction
        ) {
            String natalArea = areaTopic(pointAreaLabel(evidence.natalPoint(), evidence.natalHouse()));
            String qualifier = orbQualifier(evidence);
            if (evidence.transitHouse() != null && !evidence.transitHouse().equals(evidence.natalHouse())) {
                String transitArea = areaTopic(houseAreaLabel(evidence.transitHouse()));
                return en ? qualifier + " it can " + enCrossAction + " from " + transitArea + " into " + natalArea + "."
                          : qualifier + " " + transitArea + " ile " + natalArea + " arasında " + trCrossAction + ".";
            }
            return en ? qualifier + " " + natalArea + " can " + enSameAction + "."
                      : qualifier + " " + natalArea + " teması " + trSameAction + ".";
        }

        private String supportiveFrame(String transitPlanet) {
            if (en) return switch (transitPlanet) {
                case "Jupiter" -> "Jupiter adds perspective, faith, and growth without needing force.";
                case "Sun" -> "The Sun brings vitality and visibility to what is ready to be owned.";
                default -> "The supporting planet gives this part of the chart more coherence.";
            };
            return switch (transitPlanet) {
                case "Jupiter" -> "Jüpiter perspektif, inanç ve büyüme alanı açar.";
                case "Sun" -> "Güneş canlılık ve görünürlük verir; sahiplenilen şey daha net parlar.";
                default -> "Destekleyici gezegen bu bölgeye daha tutarlı bir akış verir.";
            };
        }

        private String opportunityFrame(String transitPlanet) {
            if (en) return switch (transitPlanet) {
                case "Venus" -> "Venus works through attraction, ease, and relational timing.";
                case "Jupiter" -> "Jupiter widens the field, but the useful opening still needs structure.";
                case "Uranus" -> "Uranus opens the door through a new method or an unexpected contact.";
                default -> "The opportunity is subtle, but it becomes useful when named clearly.";
            };
            return switch (transitPlanet) {
                case "Venus" -> "Venüs çekim, uyum ve ilişki zamanlaması üzerinden çalışır.";
                case "Jupiter" -> "Jüpiter alanı büyütür; faydalı fırsat yine de plan ister.";
                case "Uranus" -> "Uranüs yeni yöntem veya beklenmedik temasla kapı açar.";
                default -> "Fırsat ince çalışır; adını koyduğunda kullanışlı hale gelir.";
            };
        }

        private String challengeFrame(String transitPlanet) {
            if (en) return switch (transitPlanet) {
                case "Saturn" -> "Saturn exposes where time, duty, and boundaries need clearer structure.";
                case "Neptune" -> "Neptune can blur certainty, so clarity matters more than intuition alone.";
                case "Chiron" -> "Chiron touches a sensitive layer and asks for care rather than over-defense.";
                default -> "The challenging signal asks for pace control and cleaner boundaries.";
            };
            return switch (transitPlanet) {
                case "Saturn" -> "Satürn zaman, sorumluluk ve sınır ihtiyacını görünür kılar.";
                case "Neptune" -> "Neptün netliği dağıtabilir; yalnız sezgi değil açıklık da gerekir.";
                case "Chiron" -> "Kiron hassas bir katmanı temas eder; aşırı savunma yerine bakım ister.";
                default -> "Zorlayıcı sinyal tempo kontrolü ve daha temiz sınır ister.";
            };
        }

        private String threatFrame(String transitPlanet) {
            if (en) return switch (transitPlanet) {
                case "Mars" -> "Mars increases reaction speed; the risk rises when impulse leads the room.";
                case "Mercury" -> "Mercury pressure shows up through words, timing, and small misunderstandings.";
                default -> "The risk is less about fate and more about haste, noise, and low tolerance.";
            };
            return switch (transitPlanet) {
                case "Mars" -> "Mars tepki hızını artırır; dürtü öne geçtiğinde risk büyür.";
                case "Mercury" -> "Merkür baskısı söz, zamanlama ve küçük yanlış anlamalarla görünür.";
                default -> "Risk kaderden çok acele, gürültü ve düşük tolerans üzerinden büyür.";
            };
        }

        // ── timing ───────────────────────────────────────────────────────────────

        String weekTiming(LocalDate date, LocalDate weekStart) {
            if (date == null) return en ? "This week" : "Bu hafta";
            long diff = ChronoUnit.DAYS.between(weekStart, date);
            if (diff <= 1) return en ? "Early in the week" : "Hafta başında";
            if (diff <= 4) return en ? "Mid-week" : "Hafta ortasında";
            return en ? "Later this week" : "Hafta sonuna doğru";
        }

        // ── area labels ──────────────────────────────────────────────────────────

        String houseAreaLabel(Integer house) {
            if (house == null) return en ? "your relevant life area" : "ilgili yaşam alanı";
            if (en) return switch (house) {
                case 1 -> "identity and presence";
                case 2 -> "finances and resources";
                case 3 -> "communication and close connections";
                case 4 -> "home and family";
                case 5 -> "creativity and enjoyment";
                case 6 -> "daily routines and health";
                case 7 -> "relationships and partnerships";
                case 8 -> "shared resources and transformation";
                case 9 -> "beliefs and expanding horizons";
                case 10 -> "career and ambitions";
                case 11 -> "social circle and projects";
                case 12 -> "rest and withdrawal";
                default -> "your relevant life area";
            };
            return switch (house) {
                case 1 -> "kişisel duruş ve kimlik";
                case 2 -> "maddi alan ve kaynaklar";
                case 3 -> "iletişim ve yakın çevre";
                case 4 -> "ev ve aile";
                case 5 -> "yaratıcılık ve keyif";
                case 6 -> "günlük düzen ve sağlık";
                case 7 -> "ilişkiler ve ortaklıklar";
                case 8 -> "paylaşım ve dönüşüm";
                case 9 -> "inanç ve ufuk genişletme";
                case 10 -> "kariyer ve hedefler";
                case 11 -> "sosyal çevre ve projeler";
                case 12 -> "dinlenme ve içe çekilme";
                default -> "ilgili yaşam alanı";
            };
        }

        private String pointAreaLabel(String point, Integer house) {
            if (house != null && house > 0) return houseAreaLabel(house);
            if (en) return switch (point) {
                case "Sun", "Ascendant" -> "your identity and visibility";
                case "MC" -> "your career and public image";
                case "Moon" -> "your emotional security";
                case "Mercury" -> "your communication and mental flow";
                case "Venus" -> "your relationships and values";
                case "Mars" -> "your motivation and drive";
                default -> "your relevant life area";
            };
            return switch (point) {
                case "Sun", "Ascendant" -> "kimlik, yön ve görünürlük alanın";
                case "MC" -> "kariyer ve görünürlük alanın";
                case "Moon" -> "duygusal güvenlik alanın";
                case "Mercury" -> "iletişim ve zihinsel akış alanın";
                case "Venus" -> "ilişkiler ve değerler alanın";
                case "Mars" -> "motivasyon ve mücadele alanın";
                default -> "ilgili yaşam alanın";
            };
        }

        // ── cross-area templates ─────────────────────────────────────────────────

        private String crossAreaSupportText(AspectEvidence evidence,
                String trDualVerb, String trSingleVerb,
                String enDualVerb, String enSingleVerb) {
            String natalArea = pointAreaLabel(evidence.natalPoint(), evidence.natalHouse());
            if (evidence.transitHouse() != null && !evidence.transitHouse().equals(evidence.natalHouse())) {
                String transitArea = houseAreaLabel(evidence.transitHouse());
                return en ? transitArea + " " + enDualVerb + " " + natalArea + "."
                          : transitArea + " alanı, " + natalArea + " alanını " + trDualVerb + ".";
            }
            return en ? natalArea + " " + enSingleVerb + "."
                      : natalArea + " bu hafta " + trSingleVerb + ".";
        }

        private String crossAreaPressureText(AspectEvidence evidence,
                String trDualVerb, String trSingleVerb,
                String enDualVerb, String enSingleVerb) {
            String natalArea = pointAreaLabel(evidence.natalPoint(), evidence.natalHouse());
            if (evidence.transitHouse() != null && !evidence.transitHouse().equals(evidence.natalHouse())) {
                String transitArea = houseAreaLabel(evidence.transitHouse());
                return en ? "Pressure in " + transitArea + " " + enDualVerb + " " + natalArea + "."
                          : transitArea + " alanındaki baskı, " + natalArea + " alanında " + trDualVerb + ".";
            }
            return en ? natalArea + " " + enSingleVerb + " this week."
                      : natalArea + " bu hafta " + trSingleVerb + ".";
        }

        // ── subtexts ─────────────────────────────────────────────────────────────

        String supportiveSubtext(AspectEvidence evidence) {
            return supportiveFrame(evidence.transitPlanet()) + " " + areaBridgeText(evidence,
                    "daha rahat bağlantı kurulabilir",
                    "daha toparlayıcı ve kendini besleyen bir akış kazanabilir",
                    "carry confidence and coherence",
                    "gain a steadier and more self-supporting flow");
        }

        String opportunitySubtext(AspectEvidence evidence) {
            return opportunityFrame(evidence.transitPlanet()) + " " + areaBridgeText(evidence,
                    "somut fırsat zemini oluşabilir",
                    "davet, teklif veya karar fırsatı üretebilir",
                    "create a practical opening",
                    "produce an invitation, offer, or decision point");
        }

        String challengingSubtext(AspectEvidence evidence) {
            return challengeFrame(evidence.transitPlanet()) + " " + areaBridgeText(evidence,
                    "yük ve sınır ihtiyacı belirginleşebilir",
                    "daha fazla yapı, sabır ve sadeleşme isteyebilir",
                    "make load and boundary needs more visible",
                    "need more structure, patience, and simplification");
        }

        String threatSubtext(AspectEvidence evidence) {
            return threatFrame(evidence.transitPlanet()) + " " + areaBridgeText(evidence,
                    "acele karar ve hata payı artabilir",
                    "daha hızlı gerilim ve yanlış okuma üretebilir",
                    "increase haste and the margin for error",
                    "become more prone to friction and misreading");
        }

        String retroThreatSubtext(AspectEvidence evidence, Integer mercuryRetroHouse) {
            String base = threatSubtext(evidence);
            if (mercuryRetroHouse == null) return base;
            String lower = base.substring(0, 1).toLowerCase(Locale.ROOT) + base.substring(1);
            return en ? "With communication slowing in " + houseAreaLabel(mercuryRetroHouse) + ", " + lower
                      : houseAreaLabel(mercuryRetroHouse) + " alanında iletişim yavaşlarken " + lower;
        }

        String retroOnlySubtext(Integer mercuryRetroHouse) {
            if (mercuryRetroHouse == null) {
                return en ? "Communication, technology, and plan revisions may need extra attention this week."
                          : "İletişim, teknoloji ve plan revizyonları bu hafta normalden daha fazla dikkat isteyebilir.";
            }
            return en ? "In " + houseAreaLabel(mercuryRetroHouse) + ", the risk of revisions, delays, and misunderstandings increases."
                      : houseAreaLabel(mercuryRetroHouse) + " alanında revizyon, gecikme ve yanlış anlaşılma ihtimali artabilir.";
        }

        // ── headlines ────────────────────────────────────────────────────────────

        private String aspectSentenceTr(PlanetaryAspect aspect, String ending) {
            return planetName(aspect.planet1().replace("T-", ""))
                    + " natal " + planetName(aspect.planet2().replace("N-", ""))
                    + " ile " + aspectName(aspect.type().name()) + " açı " + ending;
        }

        private String aspectSentenceEn(PlanetaryAspect aspect, String ending) {
            return "transit " + aspect.planet1().replace("T-", "")
                    + " " + aspectName(aspect.type().name())
                    + " natal " + aspect.planet2().replace("N-", "")
                    + " — " + ending;
        }

        String supportiveHeadline(AspectEvidence evidence, LocalDate weekStart) {
            return en ? weekTiming(evidence.date(), weekStart) + ": " + aspectHeadlineLabel(evidence) + " strengthens inner resources"
                      : weekTiming(evidence.date(), weekStart) + " " + aspectHeadlineLabel(evidence) + " içsel kaynakları güçlendiriyor";
        }

        String opportunityHeadline(AspectEvidence evidence, LocalDate weekStart) {
            return en ? weekTiming(evidence.date(), weekStart) + ": " + aspectHeadlineLabel(evidence) + " opens a visible opportunity window"
                      : weekTiming(evidence.date(), weekStart) + " " + aspectHeadlineLabel(evidence) + " görünür bir fırsat penceresi açıyor";
        }

        String challengingHeadline(AspectEvidence evidence, LocalDate weekStart) {
            return en ? weekTiming(evidence.date(), weekStart) + ": " + aspectHeadlineLabel(evidence) + " tests the balance point"
                      : weekTiming(evidence.date(), weekStart) + " " + aspectHeadlineLabel(evidence) + " denge noktasını test ediyor";
        }

        String retroThreatHeadline(AspectEvidence evidence, LocalDate weekStart) {
            return en ? weekTiming(evidence.date(), weekStart) + ": Mercury Rx sharpens the risk around " + aspectHeadlineLabel(evidence)
                      : weekTiming(evidence.date(), weekStart) + " Merkür retrosu " + aspectHeadlineLabel(evidence) + " üzerinden hata payını büyütüyor";
        }

        String retroOnlyHeadline(WeeklyProfile profile, LocalDate weekStart, LocalDate mercuryRetroDay) {
            String timing = mercuryRetroDay != null ? weekTiming(mercuryRetroDay, weekStart) + " " : "";
            return en ? timing + "Mercury Retrograde slows plans for " + signName(profile.sunSign()) + " Sun"
                      : timing + "Merkür retrosu " + signName(profile.sunSign()) + " için planları yavaşlatıyor";
        }

        String shortAspectFlash(AspectEvidence evidence, LocalDate weekStart, boolean supportive) {
            String timing = weekTiming(evidence.date(), weekStart);
            String tp = planetName(evidence.transitPlanet());
            String np = planetName(evidence.natalPoint());
            return en ? timing + ": " + tp + " – " + np + " line " + (supportive ? "opens up" : "needs attention")
                      : timing + " " + tp + " - " + np + " hattı " + (supportive ? "açılıyor" : "dikkat istiyor");
        }

        String houseOpportunityHeadline(HouseEvidence houseEvidence, LocalDate weekStart) {
            return en ? weekTiming(houseEvidence.date(), weekStart) + ": Venus activates " + houseEvidence.house() + "th house opportunity themes"
                      : weekTiming(houseEvidence.date(), weekStart) + " Venüs " + houseEvidence.house() + ". ev temasında fırsat alanını canlandırıyor";
        }

        // ── tips ─────────────────────────────────────────────────────────────────

        String supportiveTip(AspectEvidence evidence, WeeklyProfile profile) {
            if (en) return switch (evidence.transitPlanet()) {
                case "Jupiter" -> "Don't shrink a horizon-expanding decision; move forward with the application, share, or visibility step.";
                case "Sun" -> "Use your " + signName(profile.risingSign()) + " Ascendant's visibility; state your intention openly instead of staying in the background.";
                default -> "While the energy flows, choose a small but concrete step forward; supportive energy is best for producing results.";
            };
            return switch (evidence.transitPlanet()) {
                case "Jupiter" -> "Ufku genişleten kararı küçültme; başvuru, paylaşım veya görünürlük isteyen adımı öne al.";
                case "Sun" -> signName(profile.risingSign()) + " yükseleninin görünürlüğünü kullan; geri planda kalmak yerine niyetini açık söyle.";
                default -> "Akış varken küçük ama somut bir ilerleme seç; destek enerjisi sonuç üretmek için daha uygun.";
            };
        }

        String opportunityTip(AspectEvidence evidence) {
            if (en) return switch (evidence.transitPlanet()) {
                case "Venus" -> "Take a soft but clear step in relationship, collaboration, or aesthetic decisions.";
                case "Jupiter" -> "Think big, but not without a plan; lock the opportunity into your calendar.";
                case "Uranus" -> "Don't resist the new method; a small innovation can bring unexpected openings.";
                default -> "Don't delay the opening door; a brief connection this week can create a chain effect.";
            };
            return switch (evidence.transitPlanet()) {
                case "Venus" -> "İlişki, iş birliği ve estetik kararlar için yumuşak ama net bir adım at.";
                case "Jupiter" -> "Büyük düşün ama plansız büyüme değil; alanı açan fırsatı takvime bağla.";
                case "Uranus" -> "Yeni yönteme direnme; küçük bir yenilik beklenmedik açılım getirebilir.";
                default -> "Açılan kapıyı erteleme; kısa bir temas bu hafta zincir etkisi yaratabilir.";
            };
        }

        String challengingTip(AspectEvidence evidence) {
            if (en) return switch (evidence.transitPlanet()) {
                case "Saturn" -> "Instead of self-blame, simplify the load; choose fewer but realistic goals.";
                case "Neptune" -> "Don't accept vague promises without clarifying them; asking for clarity is essential this week.";
                case "Chiron" -> "Rather than hardening where you're sensitive, set boundaries without lowering your defenses.";
                default -> "Reduce the pace without amplifying the pressure; flexibility is more functional than force this week.";
            };
            return switch (evidence.transitPlanet()) {
                case "Saturn" -> "Kendini suçlamak yerine yükü sadeleştir; az ama gerçekçi hedef seç.";
                case "Neptune" -> "Belirsiz vaatleri somutlaştırmadan kabul etme; netlik istemek bu hafta şart.";
                case "Chiron" -> "Hassas olduğun yerde sertleşmek yerine savunmanı düşürmeden sınır koy.";
                default -> "Baskıyı büyütmeden ritmi düşür; bu hafta esneklik güçten daha işlevsel.";
            };
        }

        String threatTip(AspectEvidence evidence) {
            if (en) return switch (evidence.transitPlanet()) {
                case "Mars" -> "Slow your reaction speed; buying time instead of acting in anger is the smart move this week.";
                case "Mercury" -> "Use short, simple, and double-checked communication to reduce the risk of misunderstanding.";
                default -> "Create a brief waiting space instead of a quick decision; risk often grows from haste.";
            };
            return switch (evidence.transitPlanet()) {
                case "Mars" -> "Tepki verme hızını düşür; öfke yerine zaman kazanmak bu haftanın akıllı hamlesi.";
                case "Mercury" -> "Yanlış anlama riskini azaltmak için kısa, sade ve tekrar kontrol edilmiş iletişim kullan.";
                default -> "Hızlı karar yerine kısa bekleme alanı yarat; risk çoğu zaman aceleden büyür.";
            };
        }

        String retroThreatTip(AspectEvidence evidence) {
            if (en) return switch (evidence.natalPoint()) {
                case "Mercury" -> "Double-check messages, emails, and appointment details; don't leave misunderstandings to chance.";
                case "Mars" -> "Instead of responding in anger, take a brief pause; the cost of reacting under retrograde grows.";
                default -> "Simplify plans under retrograde influence; don't try to solve too many things at once.";
            };
            return switch (evidence.natalPoint()) {
                case "Mercury" -> "Mesaj, mail ve randevu detaylarını iki kez kontrol et; yanlış anlaşılmayı şansa bırakma.";
                case "Mars" -> "Sinirle cevap vermek yerine kısa ara ver; retro altında tepki maliyeti büyür.";
                default -> "Retro etkisinde planları sadeleştir; aynı anda çok şeyi çözmeye çalışma.";
            };
        }

        String retroOnlyTip() {
            return en ? "Double-check messages, emails, and plan details; don't rush responses."
                      : "Mesaj, mail ve plan detaylarını iki kez kontrol et; acele cevap verme.";
        }

        // ── house opportunity ────────────────────────────────────────────────────

        String houseOpportunitySubtext(int house) {
            if (en) return switch (house) {
                case 2 -> "A smoother but more productive flow can be found in income, resources, and self-worth matters.";
                case 7 -> "Relationships, partnerships, and topics requiring mutual understanding may open up more easily.";
                case 10 -> "A noticeable window in career, visibility, and reputation may open.";
                case 11 -> "Useful connections can be made through social circle, teams, and future plans.";
                default -> "The themes of this house may become more visible during the week.";
            };
            return switch (house) {
                case 2 -> "Gelir, kaynaklar ve özdeğer başlıklarında daha yumuşak ama verimli bir akış yakalanabilir.";
                case 7 -> "İlişkiler, ortaklıklar ve karşılıklı uyum gerektiren konular daha kolay açılabilir.";
                case 10 -> "Kariyer, görünürlük ve itibar alanında dikkat çeken bir pencere aralanabilir.";
                case 11 -> "Sosyal çevre, ekipler ve gelecek planları üzerinden faydalı bağlantılar kurulabilir.";
                default -> "Bu evin temaları hafta içinde daha görünür hale gelebilir.";
            };
        }

        String houseOpportunityTip(int house) {
            if (en) return switch (house) {
                case 2 -> "Don't delay conversations about budget, salary, or value creation; it gets easier to make them concrete.";
                case 7 -> "Take the first step softly but openly in matters requiring collaboration.";
                case 10 -> "Make your effort visible; a result left in the background may now receive better recognition.";
                case 11 -> "Send a message, invitation, or share to become visible to the right circle.";
                default -> "Don't underestimate the incoming theme; a small opening can grow throughout the week.";
            };
            return switch (house) {
                case 2 -> "Bütçe, ücret veya değer üretimiyle ilgili konuşmaları erteleme; somutlaştırmak kolaylaşır.";
                case 7 -> "İş birliği gerektiren konuda ilk adımı yumuşak ama açık biçimde sen at.";
                case 10 -> "Emeğini görünür kıl; geri planda bırakılan sonuç şimdi daha iyi karşılık bulabilir.";
                case 11 -> "Doğru çevreye görünmek için bir mesaj, davet ya da paylaşım yap.";
                default -> "Gelen teması küçümseme; küçük bir açılım hafta boyunca büyüyebilir.";
            };
        }

        // ── strength/weakness/opportunity/threat fallbacks ───────────────────────

        String strengthFallbackHeadline(WeeklyProfile profile) {
            return en ? "A balanced week for your " + signName(profile.sunSign()) + " Sun"
                      : signName(profile.sunSign()) + " Güneşin için hafta daha dengeli akıyor";
        }

        String strengthFallbackSubtext(WeeklyProfile profile) {
            return en ? "Your " + signName(profile.risingSign()) + " Ascendant supports steady progress over big breakthroughs."
                      : signName(profile.risingSign()) + " yükseleninin kurduğu denge, büyük ataktan çok istikrarlı ilerlemeyi destekliyor.";
        }

        String strengthFallbackTip() {
            return en ? "Instead of spreading your energy across multiple tasks, move one goal clearly forward."
                      : "Gücünü birden çok işe yaymak yerine tek bir hedefi net biçimde ilerlet.";
        }

        String weaknessFallbackHeadline(WeeklyProfile profile) {
            return en ? "Manage your " + signName(profile.moonSign()) + " Moon's sensitivity with care"
                      : signName(profile.moonSign()) + " Ayının hassasiyetini iyi yönetmek gerekecek";
        }

        String weaknessFallbackSubtext() {
            return en ? "Even without a harsh transit, when you sense your emotional threshold rising, it's better to slow down."
                      : "Sert bir transit baskısı olmasa da duygusal eşiğin dolduğunu fark ettiğinde temponu düşürmek daha doğru olur.";
        }

        String weaknessFallbackTip() {
            return en ? "Before overloading, pause and check your energy level; the week is won with a calm rhythm."
                      : "Aşırı yüklenmeden önce durup enerji seviyeni kontrol et; haftayı sakin ritim kazanır.";
        }

        String opportunityFallbackHeadline(WeeklyProfile profile) {
            return en ? "Your " + signName(profile.risingSign()) + " Ascendant may open doors through connection"
                      : signName(profile.risingSign()) + " yükselenin sayesinde kapılar ilişkiyle açılabilir";
        }

        String opportunityFallbackSubtext() {
            return en ? "Even without a major opportunity aspect, connecting with the right person and clarifying your intent can expand the week."
                      : "Majör bir fırsat açısı görünmese de doğru kişiyle temas kurmak ve niyeti netleştirmek haftayı büyütebilir.";
        }

        String opportunityFallbackTip() {
            return en ? "Build connection rather than force results; opportunity this week may come from the flow."
                      : "Sonuç zorlamak yerine bağlantı kur; fırsat bu hafta akıştan gelebilir.";
        }

        String threatFallbackHeadline(WeeklyProfile profile) {
            return en ? "The main risk for your " + signName(profile.sunSign()) + " Sun is overloading"
                      : signName(profile.sunSign()) + " Güneşin için asıl risk aşırı yüklenmek";
        }

        String threatFallbackSubtext() {
            return en ? "No major challenging aspect is visible; the week's threat may be self-imposed pressure rather than external forces."
                      : "Büyük bir sert açı görünmüyor; bu yüzden haftanın tehdidi dış etkiden çok gereksiz baskı yaratmak olabilir.";
        }

        String threatFallbackTip() {
            return en ? "Leave room in your plan; don't let small delays derail the whole week."
                      : "Planına boşluk bırak; küçük gecikmelerin tüm haftayı bozmasına izin verme.";
        }

        // ── flash insight ────────────────────────────────────────────────────────

        String flashMercuryRetroTitle() {
            return en ? "Mercury Retrograde calls for control over speed"
                      : "Merkür retrosu hız yerine kontrol istiyor";
        }

        String flashMercuryRetroDetail() {
            return en ? "Communication, technology, and plan revisions may need more attention throughout the week."
                      : "İletişim, teknoloji ve plan revizyonları hafta boyunca daha fazla dikkat isteyebilir.";
        }

        String flashMercuryRetroHouseDetail(Integer house) {
            return en ? "In " + houseAreaLabel(house) + ", communication, timing, and misunderstandings may increase."
                      : houseAreaLabel(house) + " alanında iletişim, zamanlama ve yanlış anlama payı artabilir.";
        }

        String flashFullMoonTitle() {
            return en ? "This week's Full Moon boosts visibility" : "Bu hafta Dolunay görünürlüğü artırıyor";
        }

        String flashFullMoonDetail(WeeklyProfile profile) {
            return en ? "Completions and realizations may emerge through your " + signName(profile.moonSign()) + " Moon's emotional themes."
                      : signName(profile.moonSign()) + " Ayının duygusal temasında tamamlanma ve fark edişler öne çıkabilir.";
        }

        String flashNewMoonTitle() {
            return en ? "This week's New Moon opens space for fresh intentions" : "Bu hafta Yeni Ay taze niyetler için alan açıyor";
        }

        String flashNewMoonDetail(WeeklyProfile profile) {
            return en ? "For your " + signName(profile.sunSign()) + " Sun, setting the right intention matters more than new beginnings."
                      : signName(profile.sunSign()) + " Güneşin için yeni başlangıçlardan çok doğru niyeti kurmak kazandırır.";
        }

        String flashDefaultTitle(WeeklyProfile profile) {
            return en ? "A low but balanced week for your " + signName(profile.sunSign()) + " Sun"
                      : signName(profile.sunSign()) + " için hafta düşük ama dengeli yoğunlukta";
        }

        String flashDefaultDetail(WeeklyProfile profile) {
            return en ? "When you maintain the rhythm with your " + signName(profile.risingSign()) + " Ascendant, results come together more cleanly."
                      : signName(profile.risingSign()) + " yükseleninle ritmi koruduğunda sonuçlar daha temiz toplanır.";
        }
    }

    private int getAspectPriority(PlanetaryAspect.AspectType type, boolean harmonious) {
        if (harmonious) {
            return switch (type) {
                case CONJUNCTION -> 0;
                case TRINE -> 1;
                case SEXTILE -> 2;
                case QUINCUNX -> 9;
                case SQUARE -> 10;
                case OPPOSITION -> 11;
            };
        }
        return switch (type) {
            case OPPOSITION -> 0;
            case SQUARE -> 1;
            case QUINCUNX -> 2;
            case CONJUNCTION -> 10;
            case TRINE -> 11;
            case SEXTILE -> 12;
        };
    }

    private static int orbBonus(double orb) {
        if (orb <= 1.0) return 4;
        if (orb <= 2.0) return 3;
        if (orb <= 4.0) return 2;
        if (orb <= 6.0) return 1;
        return 0;
    }

    private int clampScore(int raw) {
        return Math.min(100, Math.max(5, raw));
    }

    private WeeklySwotResponse emptySwot() {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);
        return new WeeklySwotResponse(
                new SwotPoint("STRENGTH", "", "", 0, ""),
                new SwotPoint("WEAKNESS", "", "", 0, ""),
                new SwotPoint("OPPORTUNITY", "", "", 0, ""),
                new SwotPoint("THREAT", "", "", 0, ""),
                new FlashInsight("FORTUNE", "", ""),
                weekStart,
                weekEnd
        );
    }

    private <T> List<T> parseJsonList(String json, Class<T> clazz) {
        if (json == null || json.isEmpty()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
        } catch (Exception e) {
            return List.of();
        }
    }
}
