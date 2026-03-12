package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.NatalChartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Daily "Kozmik Yaşam Rehberi" scoring engine for concrete life activities.
 * Caches per user/day/locale in Redis to avoid recalculating on every page refresh.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyLifeGuideService {

    private final NatalChartRepository natalChartRepository;
    private final TransitCalculator transitCalculator;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_PREFIX = "lifeguide:daily:";
    private static final Set<String> BENEFICS = Set.of("Jupiter", "Venus");
    private static final Set<String> MALEFICS = Set.of("Mars", "Saturn", "Pluto");
    private static final Set<String> CAREER_MERCURY_SENSITIVE = Set.of(
            "SIGNATURE",
            "MEETING",
            "JOB_APPLICATION",
            "NEW_JOB",
            "CAREER_EDUCATION",
            "SENIORITY",
            "RESIGNATION",
            "ENTREPRENEURSHIP",
            "OFFICIAL_DOCUMENTS",
            "APPLICATIONS",
            "PUBLIC_AFFAIRS",
            "OFFICIAL_MEETING",
            "THESIS_RESEARCH"
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

    public DailyLifeGuideResponse getDailyGuide(DailyLifeGuideRequest request) {
        LocalDate date = request.date() != null ? request.date() : LocalDate.now();
        String locale = normalizeLocale(request.locale());
        String genderKey = normalize(request.userGender());
        String maritalKey = normalize(request.maritalStatus());
        String cacheKey = CACHE_PREFIX + request.userId() + ":" + date + ":" + locale + ":" + genderKey + ":" + maritalKey;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null && !cached.isBlank()) {
                try {
                    DailyLifeGuideResponse parsed = objectMapper.readValue(cached, DailyLifeGuideResponse.class);
                    return new DailyLifeGuideResponse(
                            parsed.userId(),
                            parsed.date(),
                            parsed.locale(),
                            parsed.userGender(),
                            parsed.maritalStatus(),
                            parsed.overallScore(),
                            "CACHE",
                            parsed.groups(),
                            parsed.activities(),
                            parsed.generatedAt()
                    );
                } catch (JsonProcessingException e) {
                    log.warn("Failed to parse daily life guide cache for key {}", cacheKey, e);
                }
            }
        } catch (Exception e) {
            log.warn("Redis read failed for daily life guide cache key {}", cacheKey, e);
        }

        DailyLifeGuideResponse computed = computeDailyGuide(
                request.userId(),
                date,
                locale,
                request.userGender(),
                request.maritalStatus()
        );
        try {
            String payload = objectMapper.writeValueAsString(computed);
            long ttlSeconds = secondsUntilEndOfDay();
            redisTemplate.opsForValue().set(cacheKey, payload, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Failed to cache daily life guide for user {}", request.userId(), e);
        }
        return computed;
    }

    private DailyLifeGuideResponse computeDailyGuide(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        NatalChart chart = natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc(userId.toString())
                .orElseThrow(() -> new IllegalArgumentException("Natal chart not found for user: " + userId));

        List<PlanetPosition> natalPlanets = parseJsonList(chart.getPlanetPositionsJson(), PlanetPosition.class);
        List<HousePlacement> natalHouses = parseJsonList(chart.getHousePlacementsJson(), HousePlacement.class);

        List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(date);
        List<PlanetaryAspect> aspects = transitCalculator.calculateTransitAspects(transits, natalPlanets);
        String moonPhase = transitCalculator.getMoonPhase(date);
        String moonSign = transits.stream()
                .filter(p -> "Moon".equalsIgnoreCase(p.planet()))
                .map(PlanetPosition::sign)
                .findFirst()
                .orElse("Cancer");

        List<DailyLifeGuideActivity> activities = new ArrayList<>();
        for (ActivityRule rule : defaultRules(locale, userGender, maritalStatus)) {
            activities.add(scoreActivity(rule, transits, natalPlanets, natalHouses, aspects, moonPhase, moonSign, locale));
        }
        activities = activities.stream()
                .sorted(Comparator.comparingInt(DailyLifeGuideActivity::score).reversed()
                        .thenComparing(DailyLifeGuideActivity::groupKey)
                        .thenComparing(DailyLifeGuideActivity::activityLabel))
                .toList();

        int overall = activities.isEmpty()
                ? 5
                : (int) Math.round(activities.stream().mapToInt(DailyLifeGuideActivity::score).average().orElse(0));

        Map<String, List<DailyLifeGuideActivity>> byGroup = activities.stream()
                .collect(Collectors.groupingBy(DailyLifeGuideActivity::groupKey, LinkedHashMap::new, Collectors.toList()));
        List<DailyLifeGuideGroupSummary> groups = byGroup.values().stream()
                .map(groupActivities -> new DailyLifeGuideGroupSummary(
                        groupActivities.get(0).groupKey(),
                        groupActivities.get(0).groupLabel(),
                        (int) Math.round(groupActivities.stream().mapToInt(DailyLifeGuideActivity::score).average().orElse(0)),
                        groupActivities.size()
                ))
                .sorted(Comparator.comparingInt(DailyLifeGuideGroupSummary::averageScore).reversed()
                        .thenComparing(DailyLifeGuideGroupSummary::groupLabel))
                .toList();

        return new DailyLifeGuideResponse(
                userId,
                date,
                locale,
                userGender,
                maritalStatus,
                overall,
                "LIVE",
                groups,
                activities,
                LocalDateTime.now()
        );
    }

    private DailyLifeGuideActivity scoreActivity(
            ActivityRule rule,
            List<PlanetPosition> transits,
            List<PlanetPosition> natalPlanets,
            List<HousePlacement> natalHouses,
            List<PlanetaryAspect> aspects,
            String moonPhase,
            String moonSign,
            String locale
    ) {
        boolean english = isEnglish(locale);
        int score = 50;
        List<String> triggerNotes = new ArrayList<>();

        List<PlanetaryAspect> relevantAspects = aspects.stream()
                .filter(a -> {
                    String transit = cleanPlanet(a.planet1());
                    String natal = cleanPlanet(a.planet2());
                    boolean transitMatch = rule.triggerTransitPlanets().contains(transit);
                    boolean natalMatch = rule.triggerNatalPlanets().isEmpty() || rule.triggerNatalPlanets().contains(natal);
                    return transitMatch && natalMatch;
                })
                .sorted(Comparator.comparingDouble(PlanetaryAspect::orb))
                .toList();

        for (PlanetaryAspect aspect : relevantAspects) {
            switch (aspect.type()) {
                case TRINE, SEXTILE -> {
                    score += 20;
                    triggerNotes.add(aspectNote(aspect, english, +20));
                }
                case SQUARE, OPPOSITION -> {
                    score -= 25;
                    triggerNotes.add(aspectNote(aspect, english, -25));
                }
                case CONJUNCTION -> {
                    String transit = cleanPlanet(aspect.planet1());
                    int conjDelta = BENEFICS.contains(transit) ? 15 : MALEFICS.contains(transit) ? -15 : 5;
                    score += conjDelta;
                    triggerNotes.add(aspectNote(aspect, english, conjDelta));
                }
            }
        }

        boolean relevantRetro = transits.stream().anyMatch(p ->
                p.retrograde() && rule.retroSensitivePlanets().contains(p.planet()));
        if (relevantRetro) {
            score -= 40;
            triggerNotes.add(t(english,
                    "Retro cezası: İlgili gezegen retroda (-40)",
                    "Retro penalty: relevant planet is retrograde (-40)"));
        }

        boolean beneficInRelevantHouse = transits.stream().anyMatch(p ->
                BENEFICS.contains(p.planet()) &&
                        rule.relevantHouses().contains(transitCalculator.getTransitHouse(p, natalHouses)));
        if (beneficInRelevantHouse) {
            score += 15;
            triggerNotes.add(t(english,
                    "Ev gücü: İlgili evde iyicil transit (+15)",
                    "House power: benefic transit in a relevant house (+15)"));
        }

        int moonDelta = applyMoonAndSignRules(rule, moonPhase, moonSign);
        if (moonDelta != 0) {
            score += moonDelta;
            triggerNotes.add(moonRuleNote(rule, moonPhase, moonSign, moonDelta, english));
        }

        score = Math.max(5, Math.min(100, score));
        String tone = score >= 75 ? "positive" : score <= 40 ? "negative" : "neutral";
        String statusLabel = score >= 75
                ? t(english, "Şimdi Tam Zamanı", "Now Is the Time")
                : score <= 40
                ? t(english, "Dikkat / Ertele", "Caution / Postpone")
                : t(english, "Planlı İlerle", "Proceed with Plan");

        String topAspectText = relevantAspects.stream()
                .limit(2)
                .map(a -> localizeAspectForTechnical(a, english))
                .collect(Collectors.joining(", "));
        String houseInfo = rule.relevantHouses().isEmpty()
                ? ""
                : t(english,
                "İlgili evler: " + rule.relevantHouses().stream().map(String::valueOf).collect(Collectors.joining(", ")) + ". ",
                "Relevant houses: " + rule.relevantHouses().stream().map(String::valueOf).collect(Collectors.joining(", ")) + ". ");
        String moonInfo = t(english,
                "Ay " + localizeSign(moonSign, false) + " burcunda, faz: " + moonPhase + ". ",
                "Moon is in " + localizeSign(moonSign, true) + ", phase: " + localizeMoonPhaseEn(moonPhase) + ". ");

        String technical = t(english,
                (topAspectText.isBlank()
                        ? "Bugün bu aktivite için baskın bir transit açı kümelenmesi zayıf. "
                        : "Öne çıkan açılar: " + topAspectText + ". ")
                        + houseInfo + moonInfo + retroTechnical(rule, transits, english),
                // english branch placeholder replaced below
                "");
        if (english) {
            technical = (topAspectText.isBlank()
                    ? "No strong transit aspect cluster dominates this activity today. "
                    : "Key aspects: " + topAspectText + ". ")
                    + houseInfo + moonInfo + retroTechnical(rule, transits, true);
        }

        String insight = buildInsight(rule, score, moonPhase, moonSign, relevantRetro, english);
        String shortAdvice = buildShortAdvice(rule, score, english);

        return new DailyLifeGuideActivity(
                rule.groupKey(),
                rule.groupLabel(),
                rule.activityKey(),
                rule.activityLabel(),
                rule.icon(),
                score,
                tone,
                statusLabel,
                shortAdvice,
                technical.trim(),
                insight,
                triggerNotes.stream().distinct().limit(5).toList()
        );
    }

    private int applyMoonAndSignRules(ActivityRule rule, String moonPhase, String moonSign) {
        int delta = 0;
        String phase = normalize(moonPhase);
        String sign = normalize(moonSign);

        switch (rule.activityKey()) {
            case "HAIR_CUT" -> {
                if (phase.contains("büyüyen") || phase.contains("waxing")) delta += 10;
                if (phase.contains("küçülen") || phase.contains("waning")) delta -= 4;
                if (sign.equals("taurus") || sign.equals("libra")) delta += 6;
            }
            case "HAIR_REDUCTION" -> {
                if (phase.contains("küçülen") || phase.contains("waning")) delta += 12;
                if (phase.contains("büyüyen") || phase.contains("waxing")) delta -= 6;
                if (sign.equals("capricorn") || sign.equals("aquarius") || sign.equals("oğlak") || sign.equals("kova")) delta += 7;
            }
            case "SKIN_CARE" -> {
                if (sign.equals("scorpio") || sign.equals("akrep")) delta -= 8;
                if (sign.equals("taurus") || sign.equals("libra") || sign.equals("boğa") || sign.equals("terazi")) delta += 6;
            }
            case "AESTHETIC_TOUCH" -> {
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 6;
                if (phase.contains("küçülen") || phase.contains("waning")) delta -= 4;
            }
            case "DIET_DETOX" -> {
                if (phase.contains("küçülen") || phase.contains("waning")) delta += 12;
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 8;
            }
            case "CHECKUP" -> {
                if (sign.equals("virgo") || sign.equals("capricorn") || sign.equals("başak") || sign.equals("oğlak")) delta += 6;
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 4;
            }
            case "TREATMENT" -> {
                if (sign.equals("leo") || sign.equals("aries") || sign.equals("aslan") || sign.equals("koç")) delta += 4;
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 5;
            }
            case "OPERATION" -> {
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 10;
                if (phase.contains("küçülen") || phase.contains("waning")) delta += 4;
            }
            case "CLEANING" -> {
                if (sign.equals("virgo") || sign.equals("capricorn") || sign.equals("başak") || sign.equals("oğlak")) delta += 10;
                if (phase.contains("küçülen") || phase.contains("waning")) delta += 6;
            }
            case "PLANT_CARE" -> {
                if (sign.equals("taurus") || sign.equals("cancer") || sign.equals("boğa") || sign.equals("yengeç")) delta += 8;
                if (phase.contains("büyüyen") || phase.contains("waxing")) delta += 4;
            }
            case "MEDITATION", "WORSHIP", "PRAYER", "INNER_JOURNEY", "RITUAL" -> {
                if (sign.equals("pisces") || sign.equals("scorpio") || sign.equals("cancer")
                        || sign.equals("balık") || sign.equals("akrep") || sign.equals("yengeç")) delta += 8;
                if (phase.contains("yeni ay") || phase.contains("new moon")) delta += 6;
            }
            case "SPORT" -> {
                if (sign.equals("aries") || sign.equals("leo") || sign.equals("sagittarius")
                        || sign.equals("koç") || sign.equals("aslan") || sign.equals("yay")) delta += 8;
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 6;
            }
            case "CULTURE_ART" -> {
                if (sign.equals("libra") || sign.equals("leo") || sign.equals("terazi") || sign.equals("aslan")) delta += 8;
            }
            case "VACATION" -> {
                if (sign.equals("sagittarius") || sign.equals("yay")) delta += 8;
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 4;
            }
            case "OFFICIAL_DOCUMENTS", "APPLICATIONS", "OFFICIAL_MEETING", "THESIS_RESEARCH" -> {
                if (sign.equals("virgo") || sign.equals("capricorn") || sign.equals("başak") || sign.equals("oğlak")) delta += 7;
                if (phase.contains("dolunay") || phase.contains("full")) delta -= 5;
            }
            case "LAW" -> {
                if (sign.equals("libra") || sign.equals("terazi")) delta += 8;
            }
            case "ENTREPRENEURSHIP", "VENTURE" -> {
                if (sign.equals("aries") || sign.equals("leo") || sign.equals("sagittarius")
                        || sign.equals("koç") || sign.equals("aslan") || sign.equals("yay")) delta += 7;
            }
            default -> {
            }
        }

        if (rule.groupKey().equals("beauty") && !Set.of("HAIR_REDUCTION", "HAIR_CUT", "SKIN_CARE", "AESTHETIC_TOUCH").contains(rule.activityKey())) {
            if (phase.contains("büyüyen") || phase.contains("waxing")) delta += 8;
            if (phase.contains("dolunay") || phase.contains("full")) delta -= 4;
        }
        if (rule.groupKey().equals("home")) {
            if (sign.equals("taurus") || sign.equals("cancer")) delta += 10;
            if (sign.equals("scorpio")) delta -= 6;
        }
        if (rule.groupKey().equals("spiritual")) {
            if (sign.equals("pisces") || sign.equals("scorpio")) delta += 10;
            if (phase.contains("new moon") || phase.contains("yeni ay")) delta += 6;
        }
        if (rule.groupKey().equals("health")) {
            if (sign.equals("virgo") || sign.equals("taurus")) delta += 8;
            if (phase.contains("dolunay") || phase.contains("full")) delta -= 6;
        }
        if (rule.groupKey().equals("activity")) {
            if (sign.equals("leo") || sign.equals("sagittarius")) delta += 8;
            if (phase.contains("dolunay") || phase.contains("full")) delta -= 4;
        }
        if (rule.groupKey().equals("official")) {
            if (sign.equals("capricorn") || sign.equals("virgo")) delta += 8;
            if (phase.contains("dolunay") || phase.contains("full")) delta -= 5;
        }
        if (rule.activityKey().equals("FLIRT")) {
            if (phase.contains("dolunay") || phase.contains("full")) delta -= 10;
        }
        return delta;
    }

    private String moonRuleNote(ActivityRule rule, String moonPhase, String moonSign, int delta, boolean english) {
        String sign = localizeSign(moonSign, english);
        String signed = delta > 0 ? "+" + delta : String.valueOf(delta);
        return t(english,
                "Ay etkisi (" + sign + " / " + moonPhase + "): " + signed,
                "Moon effect (" + sign + " / " + localizeMoonPhaseEn(moonPhase) + "): " + signed);
    }

    private String buildInsight(ActivityRule rule, int score, String moonPhase, String moonSign, boolean retro, boolean english) {
        String activity = rule.activityLabel();
        if (score >= 75) {
            return t(english,
                    activity + " için gökyüzü akışı destekleyici. Kritik hamleyi kontrollü planlayıp bugün değerlendirebilirsin.",
                    "The sky flow is supportive for " + activity.toLowerCase() + ". You can evaluate a key move today with planning and control.");
        }
        if (score <= 40) {
            return t(english,
                    activity + " tarafında dikkat modu daha sağlıklı. Zorunlu değilse ertele; zorunluysa adımları küçült ve ikinci kontrol uygula.",
                    "A caution mode is healthier for " + activity.toLowerCase() + ". Postpone if possible; if not, reduce scope and add a second check.");
        }
        String moonHint = t(english,
                "Ay fazı (" + moonPhase + ") ve " + localizeSign(moonSign, false) + " vurgusu tempoyu kademeli tutmanı öneriyor.",
                "The Moon phase (" + localizeMoonPhaseEn(moonPhase) + ") and " + localizeSign(moonSign, true) + " emphasis suggests a gradual pace.");
        if (retro) {
            moonHint += t(english,
                    " Retro etkisi nedeniyle iletişim ve detay doğrulaması şart.",
                    " With retro conditions active, communication and detail checks are essential.");
        }
        return moonHint;
    }

    private String buildShortAdvice(ActivityRule rule, int score, boolean english) {
        if (score >= 85) {
            return t(english,
                    "Bugün senin için güçlü bir gün: öncelikli işlerini tamamla.",
                    "Strong window today: prioritize the important step.");
        }
        if (score >= 75) {
            return t(english,
                    "Uygun zaman: planlı ilerlersen verim artar.",
                    "Good timing: structured action increases results.");
        }
        if (score <= 25) {
            return t(english,
                    "Erteleme daha güvenli; sadece zorunlu  adımlar at.",
                    "Postponing is safer; take only essential micro-steps.");
        }
        if (score <= 40) {
            return t(english,
                    "Dikkatli ol: ikinci kontrol ve düşük risk yaklaşımı kullan.",
                    "Be careful: use second checks and a low-risk approach.");
        }
        return t(english,
                "Dikkatli ol: hazırlık + kalite kontrol ile ilerle.",
                "Moderate flow: proceed with prep and quality checks.");
    }

    private String retroTechnical(ActivityRule rule, List<PlanetPosition> transits, boolean english) {
        List<String> retroPlanets = transits.stream()
                .filter(PlanetPosition::retrograde)
                .map(PlanetPosition::planet)
                .filter(rule.retroSensitivePlanets()::contains)
                .toList();
        if (retroPlanets.isEmpty()) return "";
        return t(english,
                "Retro kontrolü: " + String.join(", ", retroPlanets) + " retro.",
                "Retro check: " + String.join(", ", retroPlanets) + " retrograde.");
    }

    private String aspectNote(PlanetaryAspect aspect, boolean english, int delta) {
        String sign = delta > 0 ? "+" + delta : String.valueOf(delta);
        return localizeAspectForTechnical(aspect, english) + " (" + sign + ")";
    }

    private String localizeAspectForTechnical(PlanetaryAspect aspect, boolean english) {
        String p1 = cleanPlanet(aspect.planet1());
        String p2 = cleanPlanet(aspect.planet2());
        String aspectName = switch (aspect.type()) {
            case CONJUNCTION -> english ? "conjunction" : "kavuşum";
            case SEXTILE -> english ? "sextile" : "sekstil";
            case SQUARE -> english ? "square" : "kare";
            case TRINE -> english ? "trine" : "üçgen";
            case OPPOSITION -> english ? "opposition" : "karşıt";
        };
        return p1 + " " + aspectName + " " + p2;
    }

    private String cleanPlanet(String raw) {
        return raw == null ? "" : raw.replace("T-", "").replace("N-", "");
    }

    private List<ActivityRule> defaultRules(String locale, String userGender, String maritalStatus) {
        boolean english = isEnglish(locale);
        boolean male = isMale(userGender);
        boolean married = isMarried(maritalStatus);
        String flirtLabel = married
                ? t(english, "Flört / Eş Uyumu", "Flirt / Partner Harmony")
                : t(english, "Flört", "Flirt");

        List<ActivityRule> rules = new ArrayList<>(List.of(
                // Beauty & Care
                rule("beauty", label("beauty", english),
                        "HAIR_CUT", male
                                ? t(english, "Saç / Sakal Kesimi", "Hair / Beard Trim")
                                : t(english, "Saç Kesimi", "Haircut"),
                        "scissors", Set.of("Moon", "Venus"), Set.of("Venus", "Moon"), Set.of(2, 5), Set.of("Venus"),
                        english, userGender),
                rule("beauty", label("beauty", english),
                        "SKIN_CARE", t(english, "Cilt Bakımı", "Skin Care"),
                        "sparkles", Set.of("Moon", "Venus", "Neptune"), Set.of("Venus", "Moon"), Set.of(2, 5), Set.of("Venus"),
                        english, userGender),
                rule("beauty", label("beauty", english),
                        "NAIL_CARE", t(english, "Tırnak Bakımı", "Nail Care"),
                        "sparkles", Set.of("Venus", "Moon"), Set.of("Venus"), Set.of(2, 5), Set.of("Venus"),
                        english, userGender),
                rule("beauty", label("beauty", english),
                        "HAIR_REDUCTION", t(english, "Tüy Azaltma", "Hair Reduction"),
                        "sparkles", Set.of("Moon", "Venus"), Set.of("Moon", "Venus"), Set.of(2, 5), Set.of("Venus"),
                        english, userGender),
                rule("beauty", label("beauty", english),
                        "AESTHETIC_TOUCH", t(english, "Estetik Dokunuş", "Aesthetic Touch"),
                        "gem", Set.of("Venus", "Moon", "Jupiter"), Set.of("Venus"), Set.of(2, 5), Set.of("Venus"),
                        english, userGender),

                // Finance & Investment
                rule("finance", label("finance", english),
                        "INVESTMENT", t(english, "Yatırım", "Investment"),
                        "trending-up", Set.of("Jupiter", "Saturn", "Mercury"), Set.of("Jupiter", "Saturn", "Mercury"), Set.of(2, 8), Set.of("Mercury", "Jupiter", "Saturn"),
                        english, userGender),
                rule("finance", label("finance", english),
                        "BIG_PURCHASE", t(english, "Büyük Alım", "Big Purchase"),
                        "shopping-bag", Set.of("Jupiter", "Venus", "Saturn", "Mercury"), Set.of("Jupiter", "Venus", "Saturn"), Set.of(2, 4, 8), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("finance", label("finance", english),
                        "SHOPPING", t(english, "Alışveriş", "Shopping"),
                        "shopping-bag", Set.of("Venus", "Jupiter", "Mercury"), Set.of("Venus", "Jupiter"), Set.of(2, 8), Set.of("Mercury"),
                        english, userGender),
                rule("finance", label("finance", english),
                        "DEBT_CREDIT", t(english, "Borç / Alacak", "Debt / Credit"),
                        "wallet", Set.of("Saturn", "Jupiter", "Mercury"), Set.of("Saturn", "Mercury"), Set.of(2, 8), Set.of("Mercury", "Saturn"),
                        english, userGender),

                // Career & Work
                rule("career", label("career", english),
                        "NEW_JOB", t(english, "Yeni İş", "New Job"),
                        "briefcase", Set.of("Mercury", "Jupiter", "Sun"), Set.of("Mercury", "Jupiter", "Sun"), Set.of(6, 10), Set.of("Mercury"),
                        english, userGender),
                rule("career", label("career", english),
                        "CAREER_EDUCATION", t(english, "Eğitim", "Education"),
                        "book-open", Set.of("Mercury", "Jupiter", "Saturn"), Set.of("Mercury", "Jupiter"), Set.of(3, 9, 10), Set.of("Mercury"),
                        english, userGender),
                rule("career", label("career", english),
                        "SENIORITY", t(english, "Kıdem", "Seniority"),
                        "trending-up", Set.of("Saturn", "Sun", "Jupiter"), Set.of("Saturn", "Sun"), Set.of(10), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("career", label("career", english),
                        "RESIGNATION", t(english, "İstifa", "Resignation"),
                        "send", Set.of("Saturn", "Uranus", "Mercury"), Set.of("Saturn", "Sun"), Set.of(6, 10), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("career", label("career", english),
                        "ENTREPRENEURSHIP", t(english, "Girişimcilik", "Entrepreneurship"),
                        "trending-up", Set.of("Mars", "Jupiter", "Sun", "Mercury"), Set.of("Mars", "Jupiter", "Sun"), Set.of(1, 10, 11), Set.of("Mercury"),
                        english, userGender),

                // Social & Love
                rule("social", label("social", english),
                        "FIRST_DATE", t(english, "İlk Buluşma", "First Date"),
                        "heart", Set.of("Venus", "Mars", "Moon"), Set.of("Venus", "Moon", "Mars"), Set.of(7, 11), Set.of("Venus", "Mars", "Mercury"),
                        english, userGender),
                rule("social", label("social", english),
                        "FLIRT", flirtLabel,
                        "message-circle", Set.of("Mercury", "Venus", "Moon"), Set.of("Mercury", "Moon", "Venus"), Set.of(7, 11), Set.of("Mercury"),
                        english, userGender),
                rule("social", label("social", english),
                        "SOCIAL_INVITE", t(english, "Sosyal Davet", "Social Invitations"),
                        "users", Set.of("Venus", "Jupiter", "Mars"), Set.of("Venus", "Jupiter"), Set.of(7, 11), Set.of("Mercury"),
                        english, userGender),

                // Health
                rule("health", label("health", english),
                        "CHECKUP", t(english, "Sağlık Kontrolü", "Health Checkup"),
                        "heart", Set.of("Moon", "Mercury", "Saturn"), Set.of("Moon", "Mercury"), Set.of(6), Set.of("Mercury"),
                        english, userGender),
                rule("health", label("health", english),
                        "DIET_DETOX", t(english, "Diyet", "Diet"),
                        "leaf", Set.of("Moon", "Venus", "Jupiter"), Set.of("Moon", "Venus"), Set.of(6), Set.of(),
                        english, userGender),
                rule("health", label("health", english),
                        "TREATMENT", t(english, "Tedavi", "Treatment"),
                        "circle-check", Set.of("Moon", "Saturn", "Pluto"), Set.of("Moon", "Saturn"), Set.of(6, 8, 12), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("health", label("health", english),
                        "OPERATION", t(english, "Operasyon", "Operation"),
                        "circle-alert", Set.of("Mars", "Saturn", "Sun", "Pluto"), Set.of("Mars", "Saturn", "Sun"), Set.of(6, 8, 12), Set.of("Mercury", "Mars"),
                        english, userGender),
                rule("health", label("health", english),
                        "REST_RECOVERY", t(english, "Dinlenme / Toparlanma", "Rest / Recovery"),
                        "moon", Set.of("Moon", "Neptune", "Saturn"), Set.of("Moon"), Set.of(6, 12), Set.of(),
                        english, userGender),

                // Activity
                rule("activity", label("activity", english),
                        "CULTURE_ART", t(english, "Kültür & Sanat", "Culture & Arts"),
                        "sparkles", Set.of("Venus", "Mercury", "Jupiter"), Set.of("Venus", "Mercury"), Set.of(5, 11), Set.of("Mercury"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "ACTIVITY_SHOPPING", t(english, "Alışveriş", "Shopping"),
                        "shopping-bag", Set.of("Venus", "Jupiter", "Mercury"), Set.of("Venus"), Set.of(2, 5, 11), Set.of("Mercury"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "REPAIR", t(english, "Onarım", "Repair"),
                        "hammer", Set.of("Mars", "Saturn", "Mercury"), Set.of("Mars", "Saturn"), Set.of(4, 6), Set.of("Mercury", "Mars"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "HOUSEWORK", t(english, "Ev İşleri", "Housework"),
                        "home", Set.of("Moon", "Mercury"), Set.of("Moon"), Set.of(4, 6), Set.of("Mercury"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "SPORT", t(english, "Spor", "Sport"),
                        "circle-check", Set.of("Mars", "Sun", "Jupiter"), Set.of("Mars", "Sun"), Set.of(1, 6), Set.of("Mars"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "PARTY_FUN", t(english, "Parti / Eğlence", "Party / Fun"),
                        "users", Set.of("Venus", "Jupiter", "Mars"), Set.of("Venus", "Jupiter"), Set.of(5, 11), Set.of("Mercury"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "SOCIAL_EVENT", t(english, "Sosyal Etkinlik", "Social Event"),
                        "users", Set.of("Mercury", "Venus", "Jupiter"), Set.of("Mercury", "Venus"), Set.of(7, 11), Set.of("Mercury"),
                        english, userGender),
                rule("activity", label("activity", english),
                        "VACATION", t(english, "Tatil", "Vacation"),
                        "truck", Set.of("Jupiter", "Venus", "Moon"), Set.of("Jupiter", "Moon"), Set.of(9, 12), Set.of("Mercury"),
                        english, userGender),

                // Official
                rule("official", label("official", english),
                        "OFFICIAL_DOCUMENTS", t(english, "Resmi Evrak", "Official Documents"),
                        "file-signature", Set.of("Mercury", "Saturn", "Jupiter"), Set.of("Mercury", "Saturn"), Set.of(3, 9, 10), Set.of("Mercury"),
                        english, userGender),
                rule("official", label("official", english),
                        "LAW", t(english, "Hukuk", "Law"),
                        "file-signature", Set.of("Saturn", "Jupiter", "Mercury"), Set.of("Saturn", "Jupiter"), Set.of(9, 10), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("official", label("official", english),
                        "APPLICATIONS", t(english, "Başvurular", "Applications"),
                        "send", Set.of("Mercury", "Jupiter", "Sun"), Set.of("Mercury", "Jupiter"), Set.of(3, 9, 10), Set.of("Mercury"),
                        english, userGender),
                rule("official", label("official", english),
                        "PUBLIC_AFFAIRS", t(english, "Kamu İşleri", "Public Affairs"),
                        "briefcase", Set.of("Saturn", "Sun", "Mercury", "Jupiter"), Set.of("Saturn", "Sun"), Set.of(10, 11), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("official", label("official", english),
                        "VENTURE", t(english, "Girişim", "Venture"),
                        "trending-up", Set.of("Jupiter", "Mars", "Mercury"), Set.of("Jupiter", "Mars"), Set.of(10, 11), Set.of("Mercury"),
                        english, userGender),
                rule("official", label("official", english),
                        "OFFICIAL_MEETING", t(english, "Toplantı", "Meeting"),
                        "briefcase", Set.of("Mercury", "Saturn", "Sun"), Set.of("Mercury", "Sun"), Set.of(10, 11), Set.of("Mercury"),
                        english, userGender),
                rule("official", label("official", english),
                        "THESIS_RESEARCH", t(english, "Tez / Araştırma", "Thesis / Research"),
                        "book-open", Set.of("Mercury", "Saturn", "Jupiter"), Set.of("Mercury", "Saturn"), Set.of(9, 12), Set.of("Mercury"),
                        english, userGender),

                // Home & Life
                rule("home", label("home", english),
                        "CLEANING", t(english, "Temizlik", "Cleaning"),
                        "home", Set.of("Moon", "Mercury", "Saturn"), Set.of("Moon"), Set.of(4, 6), Set.of("Mercury"),
                        english, userGender),
                rule("home", label("home", english),
                        "MOVING", t(english, "Taşınma", "Moving"),
                        "truck", Set.of("Moon", "Saturn", "Mercury"), Set.of("Moon", "Saturn"), Set.of(4), Set.of("Mercury", "Saturn"),
                        english, userGender),
                rule("home", label("home", english),
                        "RENOVATION", t(english, "Tadilat", "Renovation"),
                        "hammer", Set.of("Mars", "Saturn", "Moon"), Set.of("Saturn", "Mars"), Set.of(4), Set.of("Mercury", "Mars"),
                        english, userGender),
                rule("home", label("home", english),
                        "DECORATION", t(english, "Dekorasyon", "Decoration"),
                        "home", Set.of("Venus", "Moon"), Set.of("Venus", "Moon"), Set.of(4), Set.of("Mercury"),
                        english, userGender),
                rule("home", label("home", english),
                        "PLANT_CARE", t(english, "Bitki Bakımı", "Plant Care"),
                        "leaf", Set.of("Moon", "Venus", "Jupiter"), Set.of("Moon", "Venus"), Set.of(4, 6), Set.of(),
                        english, userGender),

                // Spiritual & Mental
                rule("spiritual", label("spiritual", english),
                        "MEDITATION", t(english, "Meditasyon", "Meditation"),
                        "sparkles", Set.of("Neptune", "Moon", "Pluto"), Set.of("Neptune", "Moon"), Set.of(9, 12), Set.of(), english, userGender),
                rule("spiritual", label("spiritual", english),
                        "WORSHIP", t(english, "İbadet", "Worship"),
                        "moon", Set.of("Moon", "Neptune", "Jupiter"), Set.of("Moon", "Neptune"), Set.of(9, 12), Set.of(), english, userGender),
                rule("spiritual", label("spiritual", english),
                        "PRAYER", t(english, "Dua", "Prayer"),
                        "sparkles", Set.of("Moon", "Neptune"), Set.of("Moon"), Set.of(9, 12), Set.of(), english, userGender),
                rule("spiritual", label("spiritual", english),
                        "INNER_JOURNEY", t(english, "İçsel Yolculuk", "Inner Journey"),
                        "brain", Set.of("Pluto", "Neptune", "Moon"), Set.of("Pluto", "Moon", "Neptune"), Set.of(9, 12), Set.of("Mercury"),
                        english, userGender),
                rule("spiritual", label("spiritual", english),
                        "RITUAL", t(english, "Ritüel", "Ritual"),
                        "sparkles", Set.of("Neptune", "Moon", "Jupiter"), Set.of("Neptune", "Moon"), Set.of(9, 12), Set.of(),
                        english, userGender)
        ));

        if (married) {
            rules.removeIf(rule -> "FIRST_DATE".equals(rule.activityKey()));
        }

        return rules;
    }

    private ActivityRule rule(
            String groupKey,
            String groupLabel,
            String activityKey,
            String activityLabel,
            String icon,
            Set<String> triggerTransitPlanets,
            Set<String> triggerNatalPlanets,
            Set<Integer> relevantHouses,
            Set<String> retroSensitivePlanets,
            boolean english,
            String userGender
    ) {
        // For future personalization. Currently only small naming differences are applied via labels.
        return new ActivityRule(groupKey, groupLabel, activityKey, activityLabel, icon,
                triggerTransitPlanets, triggerNatalPlanets, relevantHouses, retroSensitivePlanets);
    }

    private String label(String groupKey, boolean english) {
        return switch (groupKey) {
            case "beauty" -> t(english, "Güzellik & Bakım", "Beauty & Care");
            case "finance" -> t(english, "Finans & Yatırım", "Finance & Investment");
            case "career" -> t(english, "Kariyer & İş", "Career & Work");
            case "social" -> t(english, "Sosyal & Aşk", "Social & Love");
            case "health" -> t(english, "Sağlık", "Health");
            case "activity" -> t(english, "Aktivite", "Activity");
            case "official" -> t(english, "Resmi", "Official");
            case "home" -> t(english, "Ev İşleri", "Home & Living");
            case "spiritual" -> t(english, "Maneviyat", "Spiritual");
            default -> groupKey;
        };
    }

    private boolean isMale(String userGender) {
        if (userGender == null) return false;
        String normalized = normalize(userGender);
        return normalized.equals("male") || normalized.equals("m") || normalized.equals("erkek") || normalized.equals("man");
    }

    private boolean isMarried(String maritalStatus) {
        if (maritalStatus == null) return false;
        String normalized = normalize(maritalStatus);
        return normalized.equals("married") || normalized.equals("evli");
    }

    private String normalizeLocale(String locale) {
        return isEnglish(locale) ? "en" : "tr";
    }

    private boolean isEnglish(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("en");
    }

    private String t(boolean english, String tr, String en) {
        return english ? en : tr;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String localizeSign(String sign, boolean english) {
        if (sign == null) return english ? "Moon sign" : "Ay burcu";
        return english ? sign : SIGN_TR.getOrDefault(sign, sign);
    }

    private String localizeMoonPhaseEn(String phase) {
        if (phase == null) return "Moon phase";
        return switch (phase) {
            case "Yeni Ay" -> "New Moon";
            case "Hilal (Büyüyen)" -> "Waxing Crescent";
            case "İlk Dördün" -> "First Quarter";
            case "Şişkin Ay (Büyüyen)" -> "Waxing Gibbous";
            case "Dolunay" -> "Full Moon";
            case "Şişkin Ay (Küçülen)" -> "Waning Gibbous";
            case "Son Dördün" -> "Last Quarter";
            case "Hilal (Küçülen)" -> "Waning Crescent";
            default -> phase;
        };
    }

    private long secondsUntilEndOfDay() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        long seconds = Duration.between(now, end).getSeconds();
        return Math.max(seconds, 60);
    }

    private <T> List<T> parseJsonList(String json, Class<T> clazz) {
        try {
            if (json == null || json.isBlank()) {
                return List.of();
            }
            JavaType type = objectMapper.getTypeFactory().constructCollectionType(List.class, clazz);
            List<T> parsed = objectMapper.readValue(json, type);
            return parsed == null ? List.of() : parsed;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse JSON list for " + clazz.getSimpleName(), e);
        }
    }

    private record ActivityRule(
            String groupKey,
            String groupLabel,
            String activityKey,
            String activityLabel,
            String icon,
            Set<String> triggerTransitPlanets,
            Set<String> triggerNatalPlanets,
            Set<Integer> relevantHouses,
            Set<String> retroSensitivePlanets
    ) {}
}
