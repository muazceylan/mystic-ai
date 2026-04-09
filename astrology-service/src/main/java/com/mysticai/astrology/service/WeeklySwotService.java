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

    private static final Map<String, String> PLANET_TR = Map.ofEntries(
            Map.entry("Sun", "Güneş"),
            Map.entry("Moon", "Ay"),
            Map.entry("Mercury", "Merkür"),
            Map.entry("Venus", "Venüs"),
            Map.entry("Mars", "Mars"),
            Map.entry("Jupiter", "Jüpiter"),
            Map.entry("Saturn", "Satürn"),
            Map.entry("Uranus", "Uranüs"),
            Map.entry("Neptune", "Neptün"),
            Map.entry("Pluto", "Plüton"),
            Map.entry("Chiron", "Kiron"),
            Map.entry("NorthNode", "Kuzey Düğümü"),
            Map.entry("Ascendant", "Yükselen"),
            Map.entry("MC", "MC")
    );

    private static final Map<String, String> SIGN_TR = Map.ofEntries(
            Map.entry("Aries", "Koç"),
            Map.entry("Taurus", "Boğa"),
            Map.entry("Gemini", "İkizler"),
            Map.entry("Cancer", "Yengeç"),
            Map.entry("Leo", "Aslan"),
            Map.entry("Virgo", "Başak"),
            Map.entry("Libra", "Terazi"),
            Map.entry("Scorpio", "Akrep"),
            Map.entry("Sagittarius", "Yay"),
            Map.entry("Capricorn", "Oğlak"),
            Map.entry("Aquarius", "Kova"),
            Map.entry("Pisces", "Balık")
    );

    private static final Map<String, String> ASPECT_TR = Map.of(
            "TRINE", "üçgen",
            "SEXTILE", "altıgen",
            "CONJUNCTION", "kavuşum",
            "SQUARE", "kare",
            "OPPOSITION", "karşıt"
    );

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

    public WeeklySwotResponse getWeeklySwot(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        String cacheKey = CACHE_PREFIX + userId + ":" + weekStart;

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

        SwotPoint strengthPoint = buildStrengthPoint(strengthScore, strength, profile, weekStart);
        SwotPoint weaknessPoint = buildWeaknessPoint(weaknessScore, weakness, profile, weekStart);
        SwotPoint opportunityPoint = buildOpportunityPoint(opportunityScore, opportunity, profile, weekStart);
        SwotPoint threatPoint = buildThreatPoint(threatScore, threat, profile, weekStart, mercuryRetro, mercuryRetroHouse, mercuryRetroDay);
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
                mercuryRetroDay
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

    private SwotPoint buildStrengthPoint(int score, SwotAccumulator acc, WeeklyProfile profile, LocalDate weekStart) {
        AspectEvidence primary = findPrimarySupportAspect(acc.uniqueAspects());
        if (primary != null) {
            return new SwotPoint(
                    "STRENGTH",
                    supportiveHeadline(primary, weekStart),
                    supportiveSubtext(primary),
                    score,
                    supportiveTip(primary, profile)
            );
        }

        return new SwotPoint(
                "STRENGTH",
                signTr(profile.sunSign()) + " Güneşin için hafta daha dengeli akıyor",
                signTr(profile.risingSign()) + " yükseleninin kurduğu denge, büyük ataktan çok istikrarlı ilerlemeyi destekliyor.",
                score,
                "Gücünü birden çok işe yaymak yerine tek bir hedefi net biçimde ilerlet."
        );
    }

    private SwotPoint buildWeaknessPoint(int score, SwotAccumulator acc, WeeklyProfile profile, LocalDate weekStart) {
        AspectEvidence primary = findPrimaryChallengeAspect(acc.uniqueAspects());
        if (primary != null) {
            return new SwotPoint(
                    "WEAKNESS",
                    challengingHeadline(primary, weekStart),
                    challengingSubtext(primary),
                    score,
                    challengingTip(primary)
            );
        }

        return new SwotPoint(
                "WEAKNESS",
                signTr(profile.moonSign()) + " Ayının hassasiyetini iyi yönetmek gerekecek",
                "Sert bir transit baskısı olmasa da duygusal eşiğin dolduğunu fark ettiğinde temponu düşürmek daha doğru olur.",
                score,
                "Aşırı yüklenmeden önce durup enerji seviyeni kontrol et; haftayı sakin ritim kazanır."
        );
    }

    private SwotPoint buildOpportunityPoint(int score, SwotAccumulator acc, WeeklyProfile profile, LocalDate weekStart) {
        AspectEvidence primaryAspect = findPrimaryOpportunityAspect(acc.uniqueAspects());
        if (primaryAspect != null) {
            return new SwotPoint(
                    "OPPORTUNITY",
                    opportunityHeadline(primaryAspect, weekStart),
                    opportunitySubtext(primaryAspect),
                    score,
                    opportunityTip(primaryAspect)
            );
        }

        HouseEvidence houseEvidence = findPrimaryHouseOpportunity(acc.uniqueHouseSignals());
        if (houseEvidence != null) {
            return new SwotPoint(
                    "OPPORTUNITY",
                    weekTiming(houseEvidence.date(), weekStart) + " Venüs " + houseEvidence.house() + ". ev temalarını canlandırıyor",
                    houseOpportunitySubtext(houseEvidence.house()),
                    score,
                    houseOpportunityTip(houseEvidence.house())
            );
        }

        return new SwotPoint(
                "OPPORTUNITY",
                signTr(profile.risingSign()) + " yükselenin sayesinde kapılar ilişkiyle açılabilir",
                "Majör bir fırsat açısı görünmese de doğru kişiyle temas kurmak ve niyeti netleştirmek haftayı büyütebilir.",
                score,
                "Sonuç zorlamak yerine bağlantı kur; fırsat bu hafta akıştan gelebilir."
        );
    }

    private SwotPoint buildThreatPoint(
            int score,
            SwotAccumulator acc,
            WeeklyProfile profile,
            LocalDate weekStart,
            boolean mercuryRetro,
            Integer mercuryRetroHouse,
            LocalDate mercuryRetroDay
    ) {
        AspectEvidence primary = findPrimaryThreatAspect(acc.uniqueAspects());
        if (mercuryRetro && primary != null) {
            return new SwotPoint(
                    "THREAT",
                    retroThreatHeadline(primary, weekStart),
                    retroThreatSubtext(primary, mercuryRetroHouse),
                    score,
                    retroThreatTip(primary)
            );
        }

        if (mercuryRetro) {
            return new SwotPoint(
                    "THREAT",
                    retroOnlyHeadline(profile, weekStart, mercuryRetroDay),
                    retroOnlySubtext(mercuryRetroHouse),
                    score,
                    "Mesaj, mail ve plan detaylarını iki kez kontrol et; acele cevap verme."
            );
        }

        if (primary != null) {
            return new SwotPoint(
                    "THREAT",
                    challengingHeadline(primary, weekStart),
                    threatSubtext(primary),
                    score,
                    threatTip(primary)
            );
        }

        return new SwotPoint(
                "THREAT",
                signTr(profile.sunSign()) + " Güneşin için asıl risk aşırı yüklenmek",
                "Büyük bir sert açı görünmüyor; bu yüzden haftanın tehdidi dış etkiden çok gereksiz baskı yaratmak olabilir.",
                score,
                "Planına boşluk bırak; küçük gecikmelerin tüm haftayı bozmasına izin verme."
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
            LocalDate mercuryRetroDay
    ) {
        AspectEvidence topThreat = findPrimaryThreatAspect(threat.uniqueAspects());
        AspectEvidence topOpportunity = findPrimaryOpportunityAspect(opportunity.uniqueAspects());
        AspectEvidence topStrength = findPrimarySupportAspect(strength.uniqueAspects());
        AspectEvidence topWeakness = findPrimaryChallengeAspect(weakness.uniqueAspects());

        if (mercuryRetro) {
            String timing = mercuryRetroDay != null ? weekTiming(mercuryRetroDay, weekStart) + " " : "";
            String detail = mercuryRetroHouse != null
                    ? houseAreaLabel(mercuryRetroHouse) + " alanında iletişim, zamanlama ve yanlış anlama payı artabilir."
                    : "İletişim, teknoloji ve plan revizyonları hafta boyunca daha fazla dikkat isteyebilir.";
            return new FlashInsight(
                    "ALERT",
                    timing + "Merkür retrosu hız yerine kontrol istiyor",
                    detail
            );
        }

        if (topThreat != null && threat.score >= Math.max(opportunity.score, strength.score)) {
            return new FlashInsight(
                    "ALERT",
                    shortAspectFlash(topThreat, weekStart, false),
                    threatSubtext(topThreat)
            );
        }

        if (topOpportunity != null && opportunity.score >= strength.score) {
            return new FlashInsight(
                    "FORTUNE",
                    shortAspectFlash(topOpportunity, weekStart, true),
                    opportunitySubtext(topOpportunity)
            );
        }

        if (topStrength != null) {
            return new FlashInsight(
                    "FORTUNE",
                    shortAspectFlash(topStrength, weekStart, true),
                    supportiveSubtext(topStrength)
            );
        }

        if (topWeakness != null) {
            return new FlashInsight(
                    "ALERT",
                    shortAspectFlash(topWeakness, weekStart, false),
                    challengingSubtext(topWeakness)
            );
        }

        if (weekPhases.contains("Dolunay")) {
            return new FlashInsight(
                    "FORTUNE",
                    "Bu hafta Dolunay görünürlüğü artırıyor",
                    signTr(profile.moonSign()) + " Ayının duygusal temasında tamamlanma ve fark edişler öne çıkabilir."
            );
        }

        if (weekPhases.contains("Yeni Ay")) {
            return new FlashInsight(
                    "FORTUNE",
                    "Bu hafta Yeni Ay taze niyetler için alan açıyor",
                    signTr(profile.sunSign()) + " Güneşin için yeni başlangıçlardan çok doğru niyeti kurmak kazandırır."
            );
        }

        return new FlashInsight(
                "FORTUNE",
                signTr(profile.sunSign()) + " için hafta düşük ama dengeli yoğunlukta",
                signTr(profile.risingSign()) + " yükseleninle ritmi koruduğunda sonuçlar daha temiz toplanır."
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

    private String supportiveHeadline(AspectEvidence evidence, LocalDate weekStart) {
        return weekTiming(evidence.date(), weekStart) + " " + aspectSentence(evidence.aspect(), "kuruyor");
    }

    private String opportunityHeadline(AspectEvidence evidence, LocalDate weekStart) {
        return weekTiming(evidence.date(), weekStart) + " " + aspectSentence(evidence.aspect(), "açıyor");
    }

    private String challengingHeadline(AspectEvidence evidence, LocalDate weekStart) {
        return weekTiming(evidence.date(), weekStart) + " " + aspectSentence(evidence.aspect(), "baskı yaratıyor");
    }

    private String retroThreatHeadline(AspectEvidence evidence, LocalDate weekStart) {
        return weekTiming(evidence.date(), weekStart) + " Merkür retrosu ile " + aspectSentence(evidence.aspect(), "geriyor");
    }

    private String retroOnlyHeadline(WeeklyProfile profile, LocalDate weekStart, LocalDate mercuryRetroDay) {
        String timing = mercuryRetroDay != null ? weekTiming(mercuryRetroDay, weekStart) + " " : "";
        return timing + "Merkür retrosu " + signTr(profile.sunSign()) + " için planları yavaşlatıyor";
    }

    private String supportiveSubtext(AspectEvidence evidence) {
        return crossAreaSupportText(evidence, "destekleyebilir", "daha akışkan çalışabilir");
    }

    private String opportunitySubtext(AspectEvidence evidence) {
        return crossAreaSupportText(evidence, "için fırsat üretebilir", "daha görünür hale gelebilir");
    }

    private String challengingSubtext(AspectEvidence evidence) {
        return crossAreaPressureText(evidence, "baskı oluşturabilir", "hassaslaşabilir");
    }

    private String threatSubtext(AspectEvidence evidence) {
        return crossAreaPressureText(evidence, "hata payını artırabilir", "daha çabuk gerilebilir");
    }

    private String retroThreatSubtext(AspectEvidence evidence, Integer mercuryRetroHouse) {
        String base = threatSubtext(evidence);
        if (mercuryRetroHouse == null) return base;
        return houseAreaLabel(mercuryRetroHouse) + " alanında iletişim yavaşlarken " + base.substring(0, 1).toLowerCase(Locale.ROOT) + base.substring(1);
    }

    private String retroOnlySubtext(Integer mercuryRetroHouse) {
        if (mercuryRetroHouse == null) {
            return "İletişim, teknoloji ve plan revizyonları bu hafta normalden daha fazla dikkat isteyebilir.";
        }
        return houseAreaLabel(mercuryRetroHouse) + " alanında revizyon, gecikme ve yanlış anlaşılma ihtimali artabilir.";
    }

    private String supportiveTip(AspectEvidence evidence, WeeklyProfile profile) {
        return switch (evidence.transitPlanet()) {
            case "Jupiter" -> "Ufku genişleten kararı küçültme; başvuru, paylaşım veya görünürlük isteyen adımı öne al.";
            case "Sun" -> signTr(profile.risingSign()) + " yükseleninin görünürlüğünü kullan; geri planda kalmak yerine niyetini açık söyle.";
            default -> "Akış varken küçük ama somut bir ilerleme seç; destek enerjisi sonuç üretmek için daha uygun.";
        };
    }

    private String opportunityTip(AspectEvidence evidence) {
        return switch (evidence.transitPlanet()) {
            case "Venus" -> "İlişki, iş birliği ve estetik kararlar için yumuşak ama net bir adım at.";
            case "Jupiter" -> "Büyük düşün ama plansız büyüme değil; alanı açan fırsatı takvime bağla.";
            case "Uranus" -> "Yeni yönteme direnme; küçük bir yenilik beklenmedik açılım getirebilir.";
            default -> "Açılan kapıyı erteleme; kısa bir temas bu hafta zincir etkisi yaratabilir.";
        };
    }

    private String challengingTip(AspectEvidence evidence) {
        return switch (evidence.transitPlanet()) {
            case "Saturn" -> "Kendini suçlamak yerine yükü sadeleştir; az ama gerçekçi hedef seç.";
            case "Neptune" -> "Belirsiz vaatleri somutlaştırmadan kabul etme; netlik istemek bu hafta şart.";
            case "Chiron" -> "Hassas olduğun yerde sertleşmek yerine savunmanı düşürmeden sınır koy.";
            default -> "Baskıyı büyütmeden ritmi düşür; bu hafta esneklik güçten daha işlevsel.";
        };
    }

    private String threatTip(AspectEvidence evidence) {
        return switch (evidence.transitPlanet()) {
            case "Mars" -> "Tepki verme hızını düşür; öfke yerine zaman kazanmak bu haftanın akıllı hamlesi.";
            case "Mercury" -> "Yanlış anlama riskini azaltmak için kısa, sade ve tekrar kontrol edilmiş iletişim kullan.";
            default -> "Hızlı karar yerine kısa bekleme alanı yarat; risk çoğu zaman aceleden büyür.";
        };
    }

    private String retroThreatTip(AspectEvidence evidence) {
        return switch (evidence.natalPoint()) {
            case "Mercury" -> "Mesaj, mail ve randevu detaylarını iki kez kontrol et; yanlış anlaşılmayı şansa bırakma.";
            case "Mars" -> "Sinirle cevap vermek yerine kısa ara ver; retro altında tepki maliyeti büyür.";
            default -> "Retro etkisinde planları sadeleştir; aynı anda çok şeyi çözmeye çalışma.";
        };
    }

    private String houseOpportunitySubtext(int house) {
        return switch (house) {
            case 2 -> "Gelir, kaynaklar ve özdeğer başlıklarında daha yumuşak ama verimli bir akış yakalanabilir.";
            case 7 -> "İlişkiler, ortaklıklar ve karşılıklı uyum gerektiren konular daha kolay açılabilir.";
            case 10 -> "Kariyer, görünürlük ve itibar alanında dikkat çeken bir pencere aralanabilir.";
            case 11 -> "Sosyal çevre, ekipler ve gelecek planları üzerinden faydalı bağlantılar kurulabilir.";
            default -> "Bu evin temaları hafta içinde daha görünür hale gelebilir.";
        };
    }

    private String houseOpportunityTip(int house) {
        return switch (house) {
            case 2 -> "Bütçe, ücret veya değer üretimiyle ilgili konuşmaları erteleme; somutlaştırmak kolaylaşır.";
            case 7 -> "İş birliği gerektiren konuda ilk adımı yumuşak ama açık biçimde sen at.";
            case 10 -> "Emeğini görünür kıl; geri planda bırakılan sonuç şimdi daha iyi karşılık bulabilir.";
            case 11 -> "Doğru çevreye görünmek için bir mesaj, davet ya da paylaşım yap.";
            default -> "Gelen teması küçümseme; küçük bir açılım hafta boyunca büyüyebilir.";
        };
    }

    private String shortAspectFlash(AspectEvidence evidence, LocalDate weekStart, boolean supportive) {
        String timing = weekTiming(evidence.date(), weekStart);
        String transitPlanet = planetTr(evidence.transitPlanet());
        String natalPoint = planetTr(evidence.natalPoint());
        String action = supportive ? "açılıyor" : "dikkat istiyor";
        return timing + " " + transitPlanet + " - " + natalPoint + " hattı " + action;
    }

    private String aspectSentence(PlanetaryAspect aspect, String ending) {
        return planetTr(aspect.planet1().replace("T-", ""))
                + " natal "
                + planetTr(aspect.planet2().replace("N-", ""))
                + " ile "
                + aspectTr(aspect.type().name())
                + " açı "
                + ending;
    }

    private String crossAreaSupportText(AspectEvidence evidence, String dualAreaVerb, String singleAreaVerb) {
        String natalArea = pointAreaLabel(evidence.natalPoint(), evidence.natalHouse());
        if (evidence.transitHouse() != null && !evidence.transitHouse().equals(evidence.natalHouse())) {
            String transitArea = houseAreaLabel(evidence.transitHouse());
            return transitArea + " alanı, " + natalArea + " alanını " + dualAreaVerb + ".";
        }
        return natalArea + " bu hafta " + singleAreaVerb + ".";
    }

    private String crossAreaPressureText(AspectEvidence evidence, String dualAreaVerb, String singleAreaVerb) {
        String natalArea = pointAreaLabel(evidence.natalPoint(), evidence.natalHouse());
        if (evidence.transitHouse() != null && !evidence.transitHouse().equals(evidence.natalHouse())) {
            String transitArea = houseAreaLabel(evidence.transitHouse());
            return transitArea + " alanındaki baskı, " + natalArea + " alanında " + dualAreaVerb + ".";
        }
        return natalArea + " bu hafta " + singleAreaVerb + ".";
    }

    private String pointAreaLabel(String point, Integer house) {
        if (house != null && house > 0) {
            return houseAreaLabel(house);
        }
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

    private String weekTiming(LocalDate date, LocalDate weekStart) {
        if (date == null) return "Bu hafta";
        long diff = ChronoUnit.DAYS.between(weekStart, date);
        if (diff <= 1) return "Hafta başında";
        if (diff <= 4) return "Hafta ortasında";
        return "Hafta sonuna doğru";
    }

    private String houseAreaLabel(Integer house) {
        if (house == null) return "ilgili yaşam alanı";
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

    private String planetTr(String planet) {
        return PLANET_TR.getOrDefault(planet, planet);
    }

    private String signTr(String sign) {
        String normalized = normalizeSign(sign);
        return SIGN_TR.getOrDefault(normalized, normalized);
    }

    private String aspectTr(String aspectType) {
        return ASPECT_TR.getOrDefault(aspectType, aspectType);
    }

    private String normalizeSign(String sign) {
        if (sign == null || sign.isBlank()) return "burç";
        String trimmed = sign.trim().toLowerCase(Locale.ROOT);
        return trimmed.substring(0, 1).toUpperCase(Locale.ROOT) + trimmed.substring(1);
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
