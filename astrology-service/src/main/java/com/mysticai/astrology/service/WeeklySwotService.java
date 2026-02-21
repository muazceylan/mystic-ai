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
import java.util.*;
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
            Map.entry("MC", "Gökyüzü Ortası")
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

    /**
     * Mutable accumulator for SWOT category scoring.
     */
    private static class SwotAccumulator {
        int score = 0;
        final List<PlanetaryAspect> aspects = new ArrayList<>();
        final Set<String> transitPlanets = new LinkedHashSet<>();
        final Set<String> natalTargets = new LinkedHashSet<>();

        void add(int pts, PlanetaryAspect aspect) {
            score += pts;
            aspects.add(aspect);
            transitPlanets.add(aspect.planet1().replace("T-", ""));
            natalTargets.add(aspect.planet2().replace("N-", ""));
        }

        void addScore(int pts) {
            score += pts;
        }
    }

    public WeeklySwotResponse getWeeklySwot(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        String cacheKey = CACHE_PREFIX + userId + ":" + weekStart;

        // Try cache
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, WeeklySwotResponse.class);
            }
        } catch (Exception e) {
            log.debug("Cache miss for weekly-swot user {} week {}", userId, weekStart);
        }

        // Fetch natal chart
        NatalChart chart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDesc(userId.toString())
                .orElseThrow(() -> new IllegalArgumentException("Natal chart not found for user: " + userId));

        List<PlanetPosition> natalPlanets = parseJsonList(chart.getPlanetPositionsJson(), PlanetPosition.class);
        List<HousePlacement> natalHouses = parseJsonList(chart.getHousePlacementsJson(), HousePlacement.class);

        // Add Ascendant and MC as virtual natal points for aspect calculations
        List<PlanetPosition> natalWithVirtual = new ArrayList<>(natalPlanets);
        if (chart.getAscendantDegree() != null && chart.getAscendantDegree() > 0) {
            natalWithVirtual.add(createVirtualPoint("Ascendant", chart.getAscendantDegree()));
        }
        if (chart.getMcDegree() != null && chart.getMcDegree() > 0) {
            natalWithVirtual.add(createVirtualPoint("MC", chart.getMcDegree()));
        }

        String sunSign = chart.getSunSign();
        String moonSign = chart.getMoonSign();
        String risingSign = chart.getRisingSign();

        LocalDate weekEnd = weekStart.plusDays(6);

        // Accumulators per SWOT category
        SwotAccumulator strength = new SwotAccumulator();
        SwotAccumulator weakness = new SwotAccumulator();
        SwotAccumulator opportunity = new SwotAccumulator();
        SwotAccumulator threat = new SwotAccumulator();

        boolean mercuryRetro = false;
        String moonPhase = transitCalculator.getMoonPhase(today);

        for (LocalDate day = weekStart; !day.isAfter(weekEnd); day = day.plusDays(1)) {
            List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(day);
            List<PlanetaryAspect> aspects = transitCalculator.calculateTransitAspects(transits, natalWithVirtual);

            for (PlanetaryAspect aspect : aspects) {
                String tp = aspect.planet1().replace("T-", "");
                String np = aspect.planet2().replace("N-", "");
                PlanetaryAspect.AspectType type = aspect.type();

                // ── STRENGTHS: Jupiter/Sun TRINE or SEXTILE to Sun, MC, or Ascendant ──
                if ((tp.equals("Jupiter") || tp.equals("Sun"))
                        && (type == PlanetaryAspect.AspectType.TRINE || type == PlanetaryAspect.AspectType.SEXTILE)
                        && (np.equals("Sun") || np.equals("MC") || np.equals("Ascendant"))) {
                    strength.add(15, aspect);
                }
                // Sun conjunction to natal Sun/Ascendant
                if (tp.equals("Sun") && type == PlanetaryAspect.AspectType.CONJUNCTION
                        && (np.equals("Sun") || np.equals("Ascendant"))) {
                    strength.add(10, aspect);
                }
                // Jupiter/Sun harmonious to other natal planets (lower score)
                if ((tp.equals("Jupiter") || tp.equals("Sun"))
                        && (type == PlanetaryAspect.AspectType.TRINE || type == PlanetaryAspect.AspectType.SEXTILE)
                        && !np.equals("Sun") && !np.equals("MC") && !np.equals("Ascendant")) {
                    strength.add(8, aspect);
                }

                // ── WEAKNESSES: Saturn/Chiron SQUARE or OPPOSITION to Moon or Sun ──
                if ((tp.equals("Saturn") || tp.equals("Chiron"))
                        && (type == PlanetaryAspect.AspectType.SQUARE || type == PlanetaryAspect.AspectType.OPPOSITION)
                        && (np.equals("Moon") || np.equals("Sun"))) {
                    weakness.add(15, aspect);
                }
                // Neptune square to any natal planet
                if (tp.equals("Neptune") && type == PlanetaryAspect.AspectType.SQUARE) {
                    weakness.add(10, aspect);
                }

                // ── OPPORTUNITIES: Venus entering 2nd, 7th, or 10th houses ──
                // (handled below in house-based check)
                // Venus/Uranus/Jupiter harmonious aspects
                if ((tp.equals("Venus") || tp.equals("Uranus"))
                        && (type == PlanetaryAspect.AspectType.TRINE || type == PlanetaryAspect.AspectType.SEXTILE
                            || type == PlanetaryAspect.AspectType.CONJUNCTION)) {
                    opportunity.add(12, aspect);
                }
                if (tp.equals("Jupiter") && type == PlanetaryAspect.AspectType.CONJUNCTION) {
                    opportunity.add(15, aspect);
                }

                // ── THREATS: Mars or Mercury(R) hard aspect to natal Mercury or Mars ──
                if (tp.equals("Mars")
                        && (type == PlanetaryAspect.AspectType.SQUARE || type == PlanetaryAspect.AspectType.OPPOSITION)
                        && (np.equals("Mercury") || np.equals("Mars"))) {
                    threat.add(14, aspect);
                }
                // Mars hard aspect to other natal planets (lower score)
                if (tp.equals("Mars")
                        && (type == PlanetaryAspect.AspectType.SQUARE || type == PlanetaryAspect.AspectType.OPPOSITION)
                        && !np.equals("Mercury") && !np.equals("Mars")) {
                    threat.add(8, aspect);
                }
            }

            // Venus house-based opportunity check
            if (!natalHouses.isEmpty()) {
                PlanetPosition transitVenus = transits.stream()
                        .filter(t -> t.planet().equals("Venus")).findFirst().orElse(null);
                if (transitVenus != null) {
                    int venusHouse = transitCalculator.getTransitHouse(transitVenus, natalHouses);
                    if (venusHouse == 2 || venusHouse == 7 || venusHouse == 10) {
                        opportunity.addScore(12);
                        opportunity.transitPlanets.add("Venus");
                    }
                }
            }

            // Mercury retrograde threat
            if (transits.get(2).retrograde()) {
                mercuryRetro = true;
                threat.addScore(8);
                threat.transitPlanets.add("Mercury");

                // Mercury retrograde hard aspects to natal Mercury/Mars
                for (PlanetaryAspect mrAspect : aspects) {
                    String mrTp = mrAspect.planet1().replace("T-", "");
                    String mrNp = mrAspect.planet2().replace("N-", "");
                    if (mrTp.equals("Mercury")
                            && (mrAspect.type() == PlanetaryAspect.AspectType.SQUARE
                                || mrAspect.type() == PlanetaryAspect.AspectType.OPPOSITION)
                            && (mrNp.equals("Mercury") || mrNp.equals("Mars"))) {
                        threat.add(14, mrAspect);
                    }
                }
            }
        }

        // Normalize
        int sScore = clampScore(strength.score);
        int wScore = clampScore(weakness.score);
        int oScore = clampScore(opportunity.score);
        int tScore = clampScore(threat.score);

        // Ensure minimum variance
        if (sScore < 20 && wScore < 20 && oScore < 20 && tScore < 20) {
            sScore = 35 + (int) (today.toEpochDay() % 25);
            oScore = 30 + (int) (today.toEpochDay() % 20);
        }

        // Build dynamic SWOT points
        SwotPoint strengthPoint = buildDynamicStrength(sScore, strength, sunSign, risingSign);
        SwotPoint weaknessPoint = buildDynamicWeakness(wScore, weakness, moonSign, sunSign);
        SwotPoint opportunityPoint = buildDynamicOpportunity(oScore, opportunity, sunSign, moonSign);
        SwotPoint threatPoint = buildDynamicThreat(tScore, threat, mercuryRetro, sunSign);

        // Build flash insight
        FlashInsight flash = buildDynamicFlash(strength, weakness, opportunity, threat,
                mercuryRetro, moonPhase, sunSign);

        WeeklySwotResponse response = new WeeklySwotResponse(
                strengthPoint, weaknessPoint, opportunityPoint, threatPoint, flash, weekStart, weekEnd);

        // Cache until end of Sunday (week boundary)
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

    /**
     * Create a virtual PlanetPosition for Ascendant or MC so they participate in aspect calculations.
     */
    private PlanetPosition createVirtualPoint(String name, double absoluteLongitude) {
        int signIndex = (int) (absoluteLongitude / 30.0);
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
                signIndex == 0 ? 1 : 10, // Ascendant → house 1, MC → house 10
                Math.round(absoluteLongitude * 10000.0) / 10000.0
        );
    }

    // ─── Dynamic Builders ────────────────────────────────────────────────────

    private SwotPoint buildDynamicStrength(int score, SwotAccumulator acc,
                                            String sunSign, String risingSign) {
        String sunTr = signTr(sunSign);
        String risingTr = signTr(risingSign);

        if (!acc.aspects.isEmpty()) {
            PlanetaryAspect best = findBestAspect(acc.aspects);
            String tp = planetTr(best.planet1().replace("T-", ""));
            String np = planetTr(best.planet2().replace("N-", ""));

            String headline = tp.equals("Güneş") || tp.equals("Jüpiter")
                    ? tp + " bu hafta " + sunTr + " haritanı güçlendiriyor"
                    : tp + " haritandaki " + np + "'e destek veriyor";
            return new SwotPoint("STRENGTH",
                    headline,
                    sunTr + " gücün bu hafta zirvede — fırsatı kaçırma.",
                    score,
                    risingTr + " yükselenli biri olarak liderlik enerjini öne çıkar, fikirlerini paylaş.");
        }

        return new SwotPoint("STRENGTH",
                sunTr + " için bu hafta yükseliş var",
                risingTr + " yükselenin sana doğal bir çekim gücü katıyor.",
                score,
                "Sabah rutinini güçlendir, enerjini bilinçli kullan.");
    }

    private SwotPoint buildDynamicWeakness(int score, SwotAccumulator acc,
                                            String moonSign, String sunSign) {
        String moonTr = signTr(moonSign);
        String sunTr = signTr(sunSign);

        if (!acc.aspects.isEmpty()) {
            PlanetaryAspect worst = findWorstAspect(acc.aspects);
            String tp = planetTr(worst.planet1().replace("T-", ""));
            String np = planetTr(worst.planet2().replace("N-", ""));

            String headline;
            String subtext;
            if (tp.equals("Satürn") || tp.equals("Kiron")) {
                headline = tp + " bu hafta " + sunTr + " haritasına baskı uyguluyor";
                subtext = moonTr + " Ayı ile duygusal zorlanma olası — sabırlı kal.";
            } else {
                headline = tp + " haritandaki " + np + " ile gerilim yaratıyor";
                subtext = "Odaklanmak normalden güç olabilir — kendine mola ver.";
            }

            return new SwotPoint("WEAKNESS", headline, subtext, score,
                    moonTr + " Ayın hassas — kendine şefkat göster, fazla yüklenme.");
        }

        return new SwotPoint("WEAKNESS",
                moonTr + " Ayı bu hafta duygusal hassasiyeti artırıyor",
                "Enerji dalgalanabilir, akışa karşı gitme.",
                score,
                "Stres anlarında dur ve nefes al; anlık tepkilerden kaçın.");
    }

    private SwotPoint buildDynamicOpportunity(int score, SwotAccumulator acc,
                                               String sunSign, String moonSign) {
        String sunTr = signTr(sunSign);

        if (!acc.aspects.isEmpty()) {
            PlanetaryAspect best = findBestAspect(acc.aspects);
            String tp = planetTr(best.planet1().replace("T-", ""));
            String np = planetTr(best.planet2().replace("N-", ""));

            String headline;
            String tip;
            if (tp.equals("Venüs")) {
                headline = "Venüs bu hafta " + sunTr + " haritanda ilişkileri canlandırıyor";
                tip = "Sosyal ol; yeni tanışıklıklar bu hafta beklenmedik kapılar açabilir.";
            } else if (tp.equals("Jüpiter")) {
                headline = "Jüpiter " + sunTr + " haritasında genişleme fırsatı yaratıyor";
                tip = "Büyük düşün — cesur adım atmak için gökyüzü tam hazır.";
            } else {
                headline = tp + " haritandaki " + np + " alanında fırsat penceresi açıyor";
                tip = "Ertelediğin projeye bu hafta başla; momentum sende.";
            }

            return new SwotPoint("OPPORTUNITY", headline,
                    sunTr + " için kozmik rüzgar arkanda esiyor.",
                    score, tip);
        }

        return new SwotPoint("OPPORTUNITY",
                sunTr + " için bu hafta yeni kapılar aralanıyor",
                "Fırsatlar görünür yerlerde değil, alışılmadık anlarda çıkabilir.",
                score,
                "Rutinden çık, farklı bir şey dene; ilk adım seni ileriye taşır.");
    }

    private SwotPoint buildDynamicThreat(int score, SwotAccumulator acc,
                                          boolean mercuryRetro, String sunSign) {
        String sunTr = signTr(sunSign);

        if (mercuryRetro && !acc.aspects.isEmpty()) {
            PlanetaryAspect aspect = acc.aspects.stream()
                    .filter(a -> a.planet1().contains("Mars"))
                    .findFirst()
                    .orElse(acc.aspects.get(0));
            String np = planetTr(aspect.planet2().replace("N-", ""));

            return new SwotPoint("THREAT",
                    "Merkür retrosu ve Mars haritanı gergi altına alıyor",
                    "İletişim ve sabır aynı anda sınandığında dikkat şart.",
                    score,
                    "Önemli yazışmaları ertele; siniri spor veya yürüyüşle boşalt.");
        }

        if (mercuryRetro) {
            return new SwotPoint("THREAT",
                    "Merkür retrosu " + sunTr + " için iletişimi riskli hâle getiriyor",
                    "Teknoloji ve yazılı iletişimde aksaklıklar olası.",
                    score,
                    "Sözleşme ve kritik mailleri iki kez kontrol et, acele etme.");
        }

        if (!acc.aspects.isEmpty()) {
            PlanetaryAspect worst = findWorstAspect(acc.aspects);
            String tp = planetTr(worst.planet1().replace("T-", ""));
            String np = planetTr(worst.planet2().replace("N-", ""));

            return new SwotPoint("THREAT",
                    tp + " bu hafta haritandaki " + np + " alanında baskı yaratıyor",
                    sunTr + " enerjisi bu hafta kolayca provoke edilebilir — dikkat.",
                    score,
                    "Tartışmadan uzak dur; tepki vermeden önce bir adım geri çekil.");
        }

        return new SwotPoint("THREAT",
                sunTr + " için bu hafta küçük aksaklıklara hazırlıklı ol",
                "Planlar beklenmedik şekilde değişebilir.",
                score,
                "B planını önceden hazırla; esneklik bu hafta en güçlü kozan.");
    }

    private FlashInsight buildDynamicFlash(SwotAccumulator strength, SwotAccumulator weakness,
                                            SwotAccumulator opportunity, SwotAccumulator threat,
                                            boolean mercuryRetro, String moonPhase, String sunSign) {
        String sunTr = signTr(sunSign);

        if (mercuryRetro) {
            int affectedCount = threat.natalTargets.size();
            String detail = affectedCount > 1
                    ? "Natal " + String.join(", ", threat.natalTargets.stream().map(this::planetTr).toList())
                      + " etkileniyor."
                    : "İletişim ve teknolojide dikkatli ol.";
            return new FlashInsight("ALERT",
                    "Merkür Retrosu: " + sunTr + " imzaları ertele!",
                    detail);
        }

        if (threat.score > 40 && !threat.aspects.isEmpty()) {
            PlanetaryAspect worst = findWorstAspect(threat.aspects);
            String tp = planetTr(worst.planet1().replace("T-", ""));
            return new FlashInsight("ALERT",
                    tp + " Gerginliği: Ani tepkilerden kaçın!",
                    sunTr + " olarak sabrını koru, provokasyona gelme.");
        }

        if (opportunity.score > 30 && !opportunity.aspects.isEmpty()) {
            PlanetaryAspect best = findBestAspect(opportunity.aspects);
            String tp = planetTr(best.planet1().replace("T-", ""));
            String np = planetTr(best.planet2().replace("N-", ""));
            return new FlashInsight("FORTUNE",
                    tp + " Desteği: " + np + " alanında sürpriz gelişme!",
                    "Bu fırsatı kaçırma, harekete geç.");
        }

        if (strength.score > 30 && !strength.aspects.isEmpty()) {
            PlanetaryAspect best = findBestAspect(strength.aspects);
            String tp = planetTr(best.planet1().replace("T-", ""));
            return new FlashInsight("FORTUNE",
                    tp + " ile şans seninle, cesur ol!",
                    sunTr + " enerjin bu hafta dorukta.");
        }

        if ("Dolunay".equals(moonPhase)) {
            return new FlashInsight("FORTUNE",
                    "Dolunay Enerjisi: Farkındalık dorukta!",
                    sunTr + " için duygusal netlik kazanma zamanı.");
        }

        if ("Yeni Ay".equals(moonPhase)) {
            return new FlashInsight("FORTUNE",
                    "Yeni Ay: Taze başlangıçlar için ideal hafta!",
                    "Niyet koy, evren " + sunTr + "'ü destekliyor.");
        }

        return new FlashInsight("FORTUNE",
                "Kozmik enerji dengede, akışta kal!",
                sunTr + " için sakin ama kararlı adımlar at.");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private PlanetaryAspect findBestAspect(List<PlanetaryAspect> aspects) {
        return aspects.stream()
                .min(Comparator.comparingInt(a -> getAspectPriority(a.type(), true)))
                .orElse(aspects.get(0));
    }

    private PlanetaryAspect findWorstAspect(List<PlanetaryAspect> aspects) {
        return aspects.stream()
                .min(Comparator.comparingInt(a -> getAspectPriority(a.type(), false)))
                .orElse(aspects.get(0));
    }

    private int getAspectPriority(PlanetaryAspect.AspectType type, boolean harmonious) {
        if (harmonious) {
            return switch (type) {
                case CONJUNCTION -> 0;
                case TRINE -> 1;
                case SEXTILE -> 2;
                case SQUARE -> 10;
                case OPPOSITION -> 11;
            };
        }
        return switch (type) {
            case OPPOSITION -> 0;
            case SQUARE -> 1;
            case CONJUNCTION -> 10;
            case TRINE -> 11;
            case SEXTILE -> 12;
        };
    }

    private String planetTr(String planet) {
        return PLANET_TR.getOrDefault(planet, planet);
    }

    private String signTr(String sign) {
        return SIGN_TR.getOrDefault(sign, sign);
    }

    private String aspectTr(String aspectType) {
        return ASPECT_TR.getOrDefault(aspectType, aspectType);
    }

    private int clampScore(int raw) {
        return Math.min(100, Math.max(5, raw));
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
