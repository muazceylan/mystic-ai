package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.daily.DailyActionToggleResponse;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import com.mysticai.astrology.dto.daily.DailyFeedbackRequest;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.entity.DailyActionState;
import com.mysticai.astrology.entity.DailyTransitsCache;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.UserFeedback;
import com.mysticai.astrology.repository.DailyActionStateRepository;
import com.mysticai.astrology.repository.DailyTransitsCacheRepository;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.UserFeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyTransitsService {

    private final TransitCalculator transitCalculator;
    private final NatalChartRepository natalChartRepository;
    private final DailyTransitsCacheRepository dailyTransitsCacheRepository;
    private final DailyActionStateRepository dailyActionStateRepository;
    private final UserFeedbackRepository userFeedbackRepository;
    private final ObjectMapper objectMapper;

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Istanbul");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_DATE;
    private static final int MIN_TRANSITS = 5;
    private static final int MAX_TRANSITS = 9;
    private static final String INSIGHT_ENGINE_VERSION = "daily-insight-v2";
    private static final Set<String> BENEFIC_PLANETS = Set.of("Sun", "Moon", "Mercury", "Venus", "Jupiter");
    private static final Set<String> ACTIONABLE_TRANSIT_PLANETS = Set.of(
            "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Moon", "Sun"
    );

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
            Map.entry("NorthNode", "Kuzey Düğümü"),
            Map.entry("Chiron", "Kiron")
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

    public DailyTransitsDTO getDailyTransits(Long userId, LocalDate requestedDate, String timezoneHint) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Geçerli kullanıcı bulunamadı.");
        }

        ZoneId zone = resolveZone(timezoneHint);
        LocalDate date = requestedDate != null ? requestedDate : LocalDate.now(zone);
        NatalChart chart = findLatestChart(userId);
        UserAstroProfile profile = buildUserAstroProfile(userId, chart);
        String locationVersion = buildCacheVersion(chart, profile.profileVersion());

        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        Optional<DailyTransitsCache> cached = dailyTransitsCacheRepository
                .findFirstByUserIdAndTransitDateAndTimezoneAndLocationVersionOrderByCreatedAtDesc(
                        userId, date, zone.getId(), locationVersion
                );
        if (cached.isPresent() && cached.get().getExpiresAt().isAfter(nowUtc)) {
            try {
                return objectMapper.readValue(cached.get().getPayloadJson(), DailyTransitsDTO.class);
            } catch (Exception e) {
                log.warn("daily transits cache parse failed, recomputing. cacheId={}", cached.get().getId(), e);
            }
        }

        DailyTransitsDTO fresh = buildDailyTransitsDto(userId, date, zone, chart, profile);
        persistCache(userId, date, zone.getId(), locationVersion, fresh);
        return fresh;
    }

    public DailyActionsDTO getDailyActions(Long userId, LocalDate requestedDate, String timezoneHint) {
        DailyTransitsDTO transitsDTO = getDailyTransits(userId, requestedDate, timezoneHint);
        LocalDate date = LocalDate.parse(transitsDTO.date(), DATE_FORMATTER);

        List<ActionTemplate> templates = buildActionTemplates(transitsDTO);
        Map<String, DailyActionState> stateMap = dailyActionStateRepository.findByUserIdAndActionDate(userId, date).stream()
                .collect(LinkedHashMap::new, (acc, item) -> acc.put(item.getActionId(), item), Map::putAll);

        List<DailyActionsDTO.ActionItem> actions = templates.stream()
                .map(template -> {
                    DailyActionState state = stateMap.get(template.id());
                    boolean done = state != null && state.isDone();
                    String doneAt = state != null && state.getDoneAt() != null
                            ? state.getDoneAt().atOffset(ZoneOffset.UTC).toString()
                            : null;
                    return new DailyActionsDTO.ActionItem(
                            template.id(),
                            template.title(),
                            template.detail(),
                            template.icon(),
                            template.tag(),
                            template.etaMin(),
                            done,
                            doneAt,
                            template.relatedTransitIds()
                    );
                })
                .toList();

        List<String> planSteps = actions.stream()
                .limit(3)
                .map(DailyActionsDTO.ActionItem::title)
                .map(title -> clamp(title.replace(".", ""), 64))
                .toList();

        String mood = transitsDTO.hero() != null ? transitsDTO.hero().moodTag() : "Sakin";
        DailyActionsDTO.Header header = new DailyActionsDTO.Header(
                "Bugün Ne Yapabilirsin?",
                clamp(mood + " akışı için 3 küçük adım planla.", 64)
        );

        return new DailyActionsDTO(
                transitsDTO.date(),
                header,
                actions,
                new DailyActionsDTO.MiniPlan("Mini Plan", planSteps)
        );
    }

    @Transactional
    public DailyActionToggleResponse toggleAction(Long userId, String actionId, LocalDate date, boolean isDone) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Geçerli kullanıcı bulunamadı.");
        }
        if (actionId == null || actionId.isBlank()) {
            throw new IllegalArgumentException("actionId boş olamaz.");
        }
        if (date == null) {
            throw new IllegalArgumentException("date boş olamaz.");
        }

        DailyActionState state = dailyActionStateRepository
                .findByUserIdAndActionDateAndActionId(userId, date, actionId)
                .orElseGet(() -> DailyActionState.builder()
                        .userId(userId)
                        .actionDate(date)
                        .actionId(actionId)
                        .isDone(false)
                        .build());

        // Idempotent: mevcut state ile aynı ise aynen döndür.
        if (state.isDone() == isDone) {
            return new DailyActionToggleResponse(
                    date.format(DATE_FORMATTER),
                    actionId,
                    state.isDone(),
                    state.getDoneAt() != null ? state.getDoneAt().atOffset(ZoneOffset.UTC).toString() : null
            );
        }

        state.setDone(isDone);
        state.setDoneAt(isDone ? LocalDateTime.now(ZoneOffset.UTC) : null);
        DailyActionState saved = dailyActionStateRepository.save(state);

        return new DailyActionToggleResponse(
                date.format(DATE_FORMATTER),
                actionId,
                saved.isDone(),
                saved.getDoneAt() != null ? saved.getDoneAt().atOffset(ZoneOffset.UTC).toString() : null
        );
    }

    @Transactional
    public void saveFeedback(Long userId, DailyFeedbackRequest request) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Geçerli kullanıcı bulunamadı.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Geri bildirim gövdesi boş.");
        }

        String itemType = normalizeToken(request.itemType());
        if (!itemType.equals("transit") && !itemType.equals("action")) {
            throw new IllegalArgumentException("itemType yalnızca transit veya action olabilir.");
        }

        String sentiment = normalizeToken(request.sentiment());
        if (!sentiment.equals("up") && !sentiment.equals("down")
                && !sentiment.equals("positive") && !sentiment.equals("negative")
                && !sentiment.equals("thumbsup") && !sentiment.equals("thumbsdown")) {
            throw new IllegalArgumentException("sentiment geçersiz.");
        }

        String normalizedSentiment = switch (sentiment) {
            case "up", "positive", "thumbsup" -> "up";
            default -> "down";
        };

        UserFeedback feedback = UserFeedback.builder()
                .userId(userId)
                .feedbackDate(request.date())
                .itemType(itemType)
                .itemId(clamp(request.itemId(), 120))
                .sentiment(normalizedSentiment)
                .note(request.note() == null ? null : clamp(request.note(), 500))
                .build();
        userFeedbackRepository.save(feedback);
    }

    private DailyTransitsDTO buildDailyTransitsDto(
            Long userId,
            LocalDate date,
            ZoneId zone,
            NatalChart chart,
            UserAstroProfile userProfile
    ) {
        List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(date);
        List<PlanetPosition> natalPlanets = parseJsonList(chart != null ? chart.getPlanetPositionsJson() : null, PlanetPosition.class);
        List<HousePlacement> natalHouses = parseJsonList(chart != null ? chart.getHousePlacementsJson() : null, HousePlacement.class);
        List<PlanetaryAspect> aspects = natalPlanets.isEmpty()
                ? Collections.emptyList()
                : transitCalculator.calculateTransitAspects(transits, natalPlanets);

        PlanetPosition moon = transits.stream()
                .filter(p -> "Moon".equalsIgnoreCase(p.planet()))
                .findFirst()
                .orElse(null);
        String moonSign = moon != null ? translateSign(moon.sign()) : "Başak";
        String moonPhase = transitCalculator.getMoonPhase(date);

        List<PlanetPosition> retrograde = transits.stream()
                .filter(p -> p.retrograde() && !"Sun".equalsIgnoreCase(p.planet()) && !"Moon".equalsIgnoreCase(p.planet()))
                .toList();

        List<DailyTransitsDTO.RetrogradeItem> retroItems = retrograde.stream()
                .map(this::toRetroItem)
                .toList();

        List<DailyTransitsDTO.TransitItem> transitItems =
                buildTransitItems(aspects, transits, natalHouses, date, zone, userId, userProfile);
        List<DailyTransitsDTO.FocusPoint> focusPoints = buildFocusPoints(transitItems, retroItems);
        DailyTransitsDTO.Hero hero = buildHero(transitItems, retroItems, chart, date, userId);
        String contextKey = buildDailyContextKey(userId, date, chart, transitItems, retroItems, moonPhase, moonSign);

        String retroCountValue = buildRetroCountText(retroItems, contextKey);
        List<DailyTransitsDTO.QuickFact> quickFacts = List.of(
                new DailyTransitsDTO.QuickFact("moon-phase", "Ay Fazı", moonPhase, "moonPhase"),
                new DailyTransitsDTO.QuickFact("moon-sign", "Ay Burcu", moonSign, "zodiacSign"),
                new DailyTransitsDTO.QuickFact("retro", "Retro", retroCountValue, "retro")
        );

        String topTheme = transitItems.isEmpty() ? "Ruh Hali" : transitItems.get(0).theme();
        String todayBody = focusPoints.stream()
                .limit(2)
                .map(DailyTransitsDTO.FocusPoint::text)
                .reduce((a, b) -> clamp(a, 64) + " " + clamp(b, 64))
                .orElseGet(() -> fallbackTodayBody(topTheme, hero.moodTag(), contextKey));

        DailyTransitsDTO.TodayCanDo todayCanDo = new DailyTransitsDTO.TodayCanDo(
                buildTodayCanDoHeadline(topTheme, hero.moodTag(), contextKey),
                clamp(todayBody, 108),
                buildTodayCtaText(topTheme, contextKey),
                "TodayActions"
        );

        return new DailyTransitsDTO(
                date.format(DATE_FORMATTER),
                buildDailyTitle(chart, topTheme, contextKey),
                hero,
                quickFacts,
                todayCanDo,
                focusPoints,
                retroItems,
                transitItems
        );
    }

    private String buildDailyContextKey(
            Long userId,
            LocalDate date,
            NatalChart chart,
            List<DailyTransitsDTO.TransitItem> transitItems,
            List<DailyTransitsDTO.RetrogradeItem> retroItems,
            String moonPhase,
            String moonSign) {
        String top = transitItems.isEmpty()
                ? "none"
                : firstNonBlank(transitItems.get(0).id(), transitItems.get(0).theme(), transitItems.get(0).label());
        String signs = chart == null
                ? ""
                : firstNonBlank(chart.getSunSign(), chart.getRisingSign(), chart.getMoonSign());
        return String.join("|",
                String.valueOf(userId == null ? 0 : userId),
                String.valueOf(date),
                normalizeToken(signs),
                normalizeToken(moonPhase),
                normalizeToken(moonSign),
                normalizeToken(top),
                String.valueOf(retroItems == null ? 0 : retroItems.size()));
    }

    private String buildDailyTitle(NatalChart chart, String topTheme, String contextKey) {
        String sign = chart == null ? "" : translateSign(chart.getSunSign());
        List<String> options = new ArrayList<>();
        options.add("Bugün Seni Neler Etkiliyor");
        options.add("Bugün İçin Rehberin");
        options.add(topTheme + " odaklı günlük akış");
        if (!sign.isBlank()) {
            options.add(sign + " için bugünlük rehber");
        }
        return clamp(pickVariant(options, contextKey + "|title"), 42);
    }

    private String buildRetroCountText(List<DailyTransitsDTO.RetrogradeItem> retroItems, String contextKey) {
        if (retroItems == null || retroItems.isEmpty()) {
            return pickVariant(List.of("Yok", "Düşük baskı", "Sakin akış"), contextKey + "|retro-none");
        }

        int count = retroItems.size();
        if (count == 1) {
            return pickVariant(
                    List.of("1 gezegen", "1 aktif retro", "1 retro etkisi"),
                    contextKey + "|retro-one");
        }
        return pickVariant(
                List.of(count + " gezegen", count + " aktif retro", count + " retro etkisi"),
                contextKey + "|retro-many");
    }

    private String buildTodayCanDoHeadline(String topTheme, String moodTag, String contextKey) {
        List<String> options = new ArrayList<>();
        options.add("Bugün Yapabileceklerin");
        options.add("Bugün için net adımlar");
        options.add(topTheme + " odaklı mini plan");
        if ("Odak".equalsIgnoreCase(moodTag)) {
            options.add("Bugün odak planı");
        } else if ("Sosyal".equalsIgnoreCase(moodTag)) {
            options.add("Bugün sosyal denge planı");
        } else if ("Cesur".equalsIgnoreCase(moodTag)) {
            options.add("Bugün cesur ama kontrollü adımlar");
        }
        return clamp(pickVariant(options, contextKey + "|today-headline"), 46);
    }

    private String buildTodayCtaText(String topTheme, String contextKey) {
        List<String> options = switch (topTheme) {
            case "İletişim" -> List.of("İletişim adımlarını aç", "Bugün nasıl ilerlersin?", "Mesaj planını gör");
            case "Aşk" -> List.of("İlişki adımlarını aç", "Bugün nasıl ilerlersin?", "Denge adımlarını gör");
            case "İş" -> List.of("İş planını aç", "Bugün nasıl ilerlersin?", "Öncelik adımlarını gör");
            case "Enerji" -> List.of("Enerji planını aç", "Bugün nasıl ilerlersin?", "Tempo adımlarını gör");
            default -> List.of("Bugün Ne Yapabilirsin?", "Bugün nasıl ilerlersin?", "Günün adımlarını gör");
        };
        return clamp(pickVariant(options, contextKey + "|today-cta"), 34);
    }

    private String fallbackTodayBody(String topTheme, String moodTag, String contextKey) {
        List<String> options = switch (topTheme) {
            case "İletişim" -> List.of(
                    "Bir konuşmayı net bir cümleyle başlat; kısa ve açık kalman gününü kolaylaştırır.",
                    "Önemli mesajları tek ekranda toparlayıp sırayla cevaplaman zihnini rahatlatır.");
            case "Aşk" -> List.of(
                    "İlişkilerde beklentini sakin bir dille söylemek bugün gereksiz gerilimi azaltır.",
                    "Küçük ama samimi bir jest, gün içindeki duygusal dengeyi güçlendirir.");
            case "İş" -> List.of(
                    "Tek bir işi bitirmeye odaklanıp sonra diğerine geçmen verimini belirgin artırır.",
                    "Günü iki kısa blokta planlayıp dikkat dağıtan işleri ertelemek tempoyu korur.");
            case "Enerji" -> List.of(
                    "Kısa molalarla ilerleyip su tüketimini artırman gün sonu yorgunluğunu düşürür.",
                    "Tempoyu sabit tutup ani hızlanmalardan kaçınman zihinsel berraklığı korur.");
            default -> List.of(
                    "Bugün tek bir öncelik seçip onu tamamlaman günün geri kalanını netleştirir.",
                    "Küçük ama kararlı adımlar atman gün içinde kontrol hissini güçlendirir.");
        };

        if ("Duygusal".equalsIgnoreCase(moodTag)) {
            options = new ArrayList<>(options);
            options.add("Duygusal yoğunluk artarsa kararlarını kısa bir mola sonrası vermek daha sağlıklı olur.");
        }
        return clamp(pickVariant(options, contextKey + "|today-body"), 108);
    }

    private void persistCache(Long userId, LocalDate date, String timezone, String locationVersion, DailyTransitsDTO dto) {
        try {
            ZonedDateTime expiryAtZone = date.plusDays(1).atStartOfDay(resolveZone(timezone));
            LocalDateTime expiresUtc = expiryAtZone.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();

            DailyTransitsCache cache = DailyTransitsCache.builder()
                    .userId(userId)
                    .transitDate(date)
                    .timezone(timezone)
                    .locationVersion(locationVersion)
                    .payloadJson(objectMapper.writeValueAsString(dto))
                    .expiresAt(expiresUtc)
                    .build();
            dailyTransitsCacheRepository.save(cache);
        } catch (Exception e) {
            log.warn("daily transits cache save failed userId={} date={}", userId, date, e);
        }
    }

    private List<DailyTransitsDTO.TransitItem> buildTransitItems(
            List<PlanetaryAspect> aspects,
            List<PlanetPosition> transitPositions,
            List<HousePlacement> natalHouses,
            LocalDate date,
            ZoneId zone,
            Long userId,
            UserAstroProfile userProfile
    ) {
        Map<String, Integer> themeCount = new HashMap<>();
        Map<String, Boolean> retrogradeByPlanet = new HashMap<>();
        for (PlanetPosition position : transitPositions) {
            retrogradeByPlanet.put(cleanPlanet(position.planet()), position.retrograde());
        }
        List<DailyTransitsDTO.TransitItem> items = new ArrayList<>();
        AtomicInteger index = new AtomicInteger(0);

        aspects.stream()
                .sorted(Comparator.comparingDouble(PlanetaryAspect::orb))
                .forEach(aspect -> {
                    if (items.size() >= MAX_TRANSITS) {
                        return;
                    }
                    String transitPlanet = cleanPlanet(aspect.planet1());
                    if (!ACTIONABLE_TRANSIT_PLANETS.contains(transitPlanet)) {
                        return;
                    }

                    String theme = themeForPlanet(transitPlanet);
                    int count = themeCount.getOrDefault(theme, 0);
                    if (count >= 2) {
                        return;
                    }

                    boolean supportive = isSupportive(aspect, transitPlanet);
                    String label = supportive ? "Destekleyici" : "Hassas";
                    String transitPlanetTr = translatePlanet(transitPlanet);
                    String natalPointTr = translatePlanet(cleanPlanet(aspect.planet2()));
                    String house = resolveHouseForTransit(transitPlanet, transitPositions, natalHouses);
                    String variationKey = buildVariationKey(date, userId, transitPlanet, natalPointTr, aspect.type().name(), house);
                    String titleBase = supportive ? supportiveTitle(theme, variationKey) : cautionTitle(theme, variationKey);
                    String title = titleBase + " • " + transitPlanetTr + " odakta";
                    String impactBase = supportive
                            ? supportiveImpact(theme, transitPlanet, house, variationKey)
                            : cautionImpact(theme, transitPlanet, house, variationKey);
                    int importance = computeImportance(
                            aspect,
                            supportive,
                            house,
                            retrogradeByPlanet.getOrDefault(transitPlanet, false),
                            theme,
                            transitPlanet,
                            userProfile
                    );
                    String status = statusFrom(supportive, importance, retrogradeByPlanet.getOrDefault(transitPlanet, false));

                    String exactAt = date.atTime(9 + (index.get() % 8), (index.get() * 7) % 60)
                            .atZone(zone)
                            .withZoneSameInstant(ZoneOffset.UTC)
                            .toOffsetDateTime()
                            .toString();

                    DailyTransitsDTO.Technical technical = new DailyTransitsDTO.Technical(
                            translatePlanet(transitPlanet),
                            translatePlanet(cleanPlanet(aspect.planet2())),
                            aspect.type().name(),
                            round(aspect.orb(), 2),
                            exactAt,
                            house
                    );

                    String action = clamp(actionHint(theme, status), 96);
                    String avoid = clamp(avoidHint(theme, status), 96);
                    String summary = clamp(impactBase + " " + avoidSoftener(status), 120);
                    String technicalReason = buildTechnicalReason(
                            translatePlanet(transitPlanet),
                            translatePlanet(cleanPlanet(aspect.planet2())),
                            aspect.type().name(),
                            round(aspect.orb(), 2),
                            house
                    );

                    DailyTransitsDTO.TransitItem item = new DailyTransitsDTO.TransitItem(
                            "insight-" + normalizeToken(theme) + "-" + index.incrementAndGet(),
                            clamp(title, 48),
                            summary,
                            status,
                            theme,
                            timeWindowForIndex(index.get()),
                            importance,
                            technical,
                            action,
                            avoid,
                            importance,
                            relevanceFromImportance(importance),
                            clamp(reasonFrom(theme, house, supportive, transitPlanet, userProfile), 120),
                            technicalReason
                    );
                    items.add(item);
                    themeCount.put(theme, count + 1);
                });

        List<DailyTransitsDTO.TransitItem> deduped = dedupeTransitItems(items);
        items.clear();
        items.addAll(deduped);
        themeCount.clear();
        themeCount.putAll(rebuildThemeCounts(items));

        int refillAttempts = 0;
        while (items.size() < MIN_TRANSITS && refillAttempts < 2) {
            addSyntheticTransitItems(items, themeCount, transitPositions, index, date, userId, userProfile);
            List<DailyTransitsDTO.TransitItem> dedupedRefill = dedupeTransitItems(items);
            items.clear();
            items.addAll(dedupedRefill);
            themeCount.clear();
            themeCount.putAll(rebuildThemeCounts(items));
            refillAttempts += 1;
        }
        return items;
    }

    private void addSyntheticTransitItems(
            List<DailyTransitsDTO.TransitItem> items,
            Map<String, Integer> themeCount,
            List<PlanetPosition> transitPositions,
            AtomicInteger index,
            LocalDate date,
            Long userId,
            UserAstroProfile userProfile
    ) {
        for (PlanetPosition planet : transitPositions) {
            if (items.size() >= MIN_TRANSITS || items.size() >= MAX_TRANSITS) {
                break;
            }
            String planetName = planet.planet();
            if (!ACTIONABLE_TRANSIT_PLANETS.contains(planetName)) {
                continue;
            }
            String theme = themeForPlanet(planetName);
            int count = themeCount.getOrDefault(theme, 0);
            if (count >= 2) {
                continue;
            }

            boolean supportive = !planet.retrograde() && BENEFIC_PLANETS.contains(planetName);
            String status = supportive ? "Kolay" : "Hassas";
            String planetTr = translatePlanet(planetName);
            String variationKey = buildVariationKey(date, userId, planetName, "Genel Akış", status, null);
            String titleBase = supportive ? supportiveTitle(theme, variationKey) : cautionTitle(theme, variationKey);
            String impactBase = supportive
                    ? supportiveImpact(theme, planetName, null, variationKey)
                    : cautionImpact(theme, planetName, null, variationKey);
            int confidenceBase = supportive ? 64 : 56;
            int confidenceDrift = Math.abs((variationKey + "|confidence").hashCode()) % 12;
            int importance = clampInt(confidenceBase + confidenceDrift + themePreferenceBonus(userProfile, theme), 45, 86);
            String action = clamp(actionHint(theme, status), 96);
            String avoid = clamp(avoidHint(theme, status), 96);
            String summary = clamp(impactBase + " " + avoidSoftener(status), 120);

            DailyTransitsDTO.TransitItem item = new DailyTransitsDTO.TransitItem(
                    "insight-" + normalizeToken(theme) + "-" + (index.incrementAndGet()),
                    clamp(titleBase + " • " + planetTr + " odakta", 48),
                    summary,
                    status,
                    theme,
                    timeWindowForIndex(index.get()),
                    importance,
                    new DailyTransitsDTO.Technical(
                            translatePlanet(planetName),
                            "Genel Akış",
                            supportive ? "FLOW" : "PRESSURE",
                            supportive ? 1.8 : 2.4,
                            null,
                            null
                    ),
                    action,
                    avoid,
                    importance,
                    relevanceFromImportance(importance),
                    clamp(reasonFrom(theme, null, supportive, planetName, userProfile), 120),
                    buildTechnicalReason(
                            translatePlanet(planetName),
                            "Genel Akış",
                            supportive ? "FLOW" : "PRESSURE",
                            supportive ? 1.8 : 2.4,
                            null
                    )
            );
            items.add(item);
            themeCount.put(theme, count + 1);
        }
    }

    private Map<String, Integer> rebuildThemeCounts(List<DailyTransitsDTO.TransitItem> items) {
        Map<String, Integer> counts = new HashMap<>();
        for (DailyTransitsDTO.TransitItem item : items) {
            counts.merge(item.theme(), 1, Integer::sum);
        }
        return counts;
    }

    private List<DailyTransitsDTO.TransitItem> dedupeTransitItems(List<DailyTransitsDTO.TransitItem> items) {
        Map<String, DailyTransitsDTO.TransitItem> unique = new LinkedHashMap<>();

        for (DailyTransitsDTO.TransitItem item : items) {
            String key = buildTransitIdentity(item);
            DailyTransitsDTO.TransitItem existing = unique.get(key);
            if (existing == null || item.confidence() > existing.confidence()) {
                unique.put(key, item);
            }
        }

        return new ArrayList<>(unique.values());
    }

    private String buildTransitIdentity(DailyTransitsDTO.TransitItem item) {
        DailyTransitsDTO.Technical technical = item.technical();
        if (technical != null) {
            return String.join("|",
                    normalizeToken(item.theme()),
                    normalizeToken(item.label()),
                    normalizeToken(technical.transitPlanet()),
                    normalizeToken(technical.natalPoint()),
                    normalizeToken(technical.aspect()),
                    normalizeToken(technical.house()),
                    normalizeToken(item.titlePlain()),
                    normalizeToken(item.impactPlain())
            );
        }

        return String.join("|",
                normalizeToken(item.theme()),
                normalizeToken(item.label()),
                normalizeToken(item.titlePlain()),
                normalizeToken(item.impactPlain())
        );
    }

    private DailyTransitsDTO.Hero buildHero(
            List<DailyTransitsDTO.TransitItem> transits,
            List<DailyTransitsDTO.RetrogradeItem> retrogrades,
            NatalChart chart,
            LocalDate date,
            Long userId
    ) {
        DailyTransitsDTO.TransitItem top = transits.isEmpty() ? null : transits.get(0);
        String theme = top != null ? top.theme() : "Ruh Hali";
        String moodTag = moodTagFromTheme(theme, retrogrades.size());
        int baseIntensity = transits.isEmpty()
                ? 52
                : clampInt((int) Math.round(transits.stream().mapToInt(DailyTransitsDTO.TransitItem::confidence).average().orElse(60)), 40, 92);
        int retroPenalty = Math.min(retrogrades.size() * 3, 8);
        int cautionPenalty = top != null && "Dikkat".equalsIgnoreCase(top.label()) ? 5 : 0;
        int intensity = clampInt(baseIntensity - retroPenalty - cautionPenalty, 38, 92);

        String heroSeed = buildHeroSeed(top, chart, date, userId, retrogrades.size());
        String signSignature = buildSignSignature(chart);
        String topPlanet = top != null && top.technical() != null
                ? firstNonBlank(top.technical().transitPlanet(), top.technical().natalPoint())
                : null;
        String topPlanetTr = topPlanet == null ? "" : translatePlanet(cleanPlanet(topPlanet));
        String focusArea = themeFocusArea(theme);

        String retroHint = switch (retrogrades.size()) {
            case 0 -> "";
            case 1 -> " Retro nedeniyle hızdan çok netlik kazandırır.";
            default -> " Retrolar yüzünden kararlarını iki kez kontrol etmek iyi olur.";
        };

        List<String> headlineOptions = new ArrayList<>();
        headlineOptions.add("Bugün " + focusArea + " tarafında akış hızlanıyor.");
        headlineOptions.add(focusArea + " alanında planlı kaldığında daha rahat ilerlersin.");
        if (!topPlanetTr.isBlank()) {
            headlineOptions.add(topPlanetTr + " etkisi bugün " + focusArea + " başlığını öne taşıyor.");
        }
        if (!signSignature.isBlank()) {
            headlineOptions.add(signSignature + " bu temada ekstra hassasiyet veriyor.");
        }
        String headline = pickVariant(headlineOptions, heroSeed + "|headline");
        if (!retroHint.isBlank()) {
            headline = clamp(headline + retroHint, 50);
        }

        String topAction = top != null ? actionHint(theme, top.label()) : actionHint(theme, "Nötr");
        List<String> supportOptions = new ArrayList<>();
        supportOptions.add(topAction + " " + themeSupportDetail(theme));
        supportOptions.add(themeSupportDetail(theme) + " " + topAction);
        if (!signSignature.isBlank()) {
            supportOptions.add(signSignature + " etkisini dengelemek için " + topAction.toLowerCase(Locale.ROOT));
        }
        if (!topPlanetTr.isBlank()) {
            supportOptions.add(topPlanetTr + " vurgusu varken " + topAction.toLowerCase(Locale.ROOT));
        }
        String supporting = pickVariant(supportOptions, heroSeed + "|support");

        String icon = resolveHeroIcon(theme, moodTag, topPlanet);
        String gradientKey = resolveHeroGradient(moodTag, retrogrades.size(), top != null ? top.label() : null);

        return new DailyTransitsDTO.Hero(
                clamp(headline, 50),
                clamp(supporting, 110),
                moodTag,
                intensity,
                icon,
                gradientKey
        );
    }

    private String buildHeroSeed(
            DailyTransitsDTO.TransitItem top,
            NatalChart chart,
            LocalDate date,
            Long userId,
            int retroCount) {
        String topId = top != null ? firstNonBlank(top.id(), top.titlePlain(), top.impactPlain()) : "fallback";
        String signKey = chart == null
                ? ""
                : firstNonBlank(chart.getSunSign(), chart.getRisingSign(), chart.getMoonSign());
        return String.join("|",
                String.valueOf(userId == null ? 0 : userId),
                String.valueOf(date),
                String.valueOf(retroCount),
                normalizeToken(topId),
                normalizeToken(signKey));
    }

    private String buildSignSignature(NatalChart chart) {
        if (chart == null) return "";
        String sun = translateSign(chart.getSunSign());
        String rising = translateSign(chart.getRisingSign());
        if (!sun.isBlank() && !rising.isBlank()) {
            return sun + " - " + rising + " imzan";
        }
        if (!sun.isBlank()) {
            return sun + " etkisi";
        }
        if (!rising.isBlank()) {
            return rising + " yükseleni";
        }
        return "";
    }

    private String themeFocusArea(String theme) {
        return switch (theme) {
            case "İletişim" -> "iletişim ve yakın çevre";
            case "Aşk" -> "ilişkiler";
            case "İş" -> "iş ve sorumluluklar";
            case "Enerji" -> "kişisel tempo";
            default -> "günlük düzen";
        };
    }

    private String themeSupportDetail(String theme) {
        return switch (theme) {
            case "İletişim" -> "Kısa cümleler yanlış anlaşılmayı azaltır.";
            case "Aşk" -> "Beklentini açık söylemen gerilimi düşürür.";
            case "İş" -> "Tek işe odaklanmak bugün daha hızlı sonuç verir.";
            case "Enerji" -> "Kısa molalar gün sonu yorgunluğunu azaltır.";
            default -> "Önceliğini tek bir başlıkta tutmak günü rahatlatır.";
        };
    }

    private String resolveHeroIcon(String theme, String moodTag, String topPlanet) {
        String planet = cleanPlanet(topPlanet);
        if (!planet.isBlank()) {
            return switch (planet) {
                case "Mercury" -> "mercury";
                case "Venus" -> "venus";
                case "Mars" -> "mars";
                case "Saturn" -> "saturn";
                case "Jupiter" -> "jupiter";
                default -> "moon";
            };
        }
        if ("Cesur".equalsIgnoreCase(moodTag)) return "mars";
        return switch (theme) {
            case "İletişim" -> "mercury";
            case "Aşk" -> "venus";
            case "İş" -> "saturn";
            case "Enerji" -> "mars";
            default -> "moon";
        };
    }

    private String resolveHeroGradient(String moodTag, int retroCount, String label) {
        if (retroCount >= 2 || "Dikkat".equalsIgnoreCase(label)) {
            return "nightSky";
        }
        if ("Cesur".equalsIgnoreCase(moodTag)) {
            return "sunrise";
        }
        if ("Sosyal".equalsIgnoreCase(moodTag)) {
            return "purpleMist";
        }
        return "purpleMist";
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private List<DailyTransitsDTO.FocusPoint> buildFocusPoints(
            List<DailyTransitsDTO.TransitItem> transits,
            List<DailyTransitsDTO.RetrogradeItem> retrogrades
    ) {
        List<String> suggestions = new ArrayList<>();
        for (DailyTransitsDTO.TransitItem item : transits) {
            if (suggestions.size() >= 3) break;
            String action = firstNonBlank(item.action(), actionHint(item.theme(), item.label()));
            suggestions.add(action);
            if (suggestions.size() >= 3) break;
            if ("Dikkat".equalsIgnoreCase(item.label()) || "Hassas".equalsIgnoreCase(item.label())) {
                suggestions.add(firstNonBlank(item.avoid(), avoidHint(item.theme(), item.label())));
            }
        }

        if (suggestions.size() < 3 && !retrogrades.isEmpty()) {
            suggestions.add("Önemli kararları aceleye getirmeden önce kısa bir kontrol yapmak iyi olur.");
        }
        if (suggestions.size() < 3) {
            suggestions.add("Gün içinde 10 dakikalık bir plan molası vermen odağını toparlar.");
        }
        if (suggestions.size() < 3) {
            suggestions.add("Akşam için tek bir dinlendirici aktivite seçmek enerjini dengeler.");
        }

        List<DailyTransitsDTO.FocusPoint> points = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            points.add(new DailyTransitsDTO.FocusPoint(
                    "focus-" + (i + 1),
                    clamp(suggestions.get(i), 88),
                    i + 1
            ));
        }
        return points;
    }

    private DailyTransitsDTO.RetrogradeItem toRetroItem(PlanetPosition position) {
        String planet = translatePlanet(position.planet());
        String meaning = switch (position.planet()) {
            case "Mercury" -> "İletişimde gecikmeler olabilir; mesajlarını net ve kısa tut.";
            case "Venus" -> "İlişkilerde eski konular gündeme gelebilir; kırıcı dilden kaçın.";
            case "Mars" -> "Enerjini aceleye değil plana ver; tartışmaları büyütmemeye çalış.";
            case "Jupiter" -> "Büyük kararları hemen netleştirme; seçenekleri tekrar tart.";
            case "Saturn" -> "Süreçler yavaş ilerleyebilir; sabır ve disiplin daha çok işe yarar.";
            default -> "Bu gezegenin retrosu ilgili konuda daha dikkatli ilerlemeni önerir.";
        };
        String risk = switch (position.planet()) {
            case "Mars", "Saturn" -> "High";
            case "Mercury", "Venus", "Jupiter" -> "Med";
            default -> "Low";
        };
        return new DailyTransitsDTO.RetrogradeItem(planet, clamp(meaning, 96), risk);
    }

    private List<ActionTemplate> buildActionTemplates(DailyTransitsDTO dto) {
        List<ActionTemplate> templates = new ArrayList<>();
        List<DailyTransitsDTO.TransitItem> related = dto.transits() == null ? List.of() : dto.transits();
        for (int i = 0; i < Math.min(4, related.size()); i++) {
            DailyTransitsDTO.TransitItem item = related.get(i);
            List<String> relatedIds = List.of(item.id());
            String task = firstNonBlank(item.action(), actionHint(item.theme(), item.label()));
            String caution = firstNonBlank(item.avoid(), avoidHint(item.theme(), item.label()));
            String detail = clamp(item.theme() + " • " + task + " " + caution, 120);
            templates.add(new ActionTemplate(
                    "action-insight-" + (i + 1),
                    toActionTitle(task),
                    detail,
                    iconForTheme(item.theme()),
                    actionTagFromStatus(item.label()),
                    etaFromImportance(item.importance()),
                    relatedIds
            ));
        }

        if (templates.size() < 4) {
            List<String> relatedIds = related.stream().limit(2).map(DailyTransitsDTO.TransitItem::id).toList();
            templates.add(new ActionTemplate(
                    "action-social-lunch",
                    "Öğle arasında kısa bir yürüyüş yap.",
                    "10-15 dakikalık yürüyüş hem enerjiyi hem odağı toparlamaya yardımcı olur.",
                    "walk",
                    "Kolay",
                    10,
                    relatedIds
            ));
        }
        if (templates.size() < 5) {
            List<String> relatedIds = related.stream().limit(2).map(DailyTransitsDTO.TransitItem::id).toList();
            templates.add(new ActionTemplate(
                    "action-evening-check",
                    "Akşam için 1 mini plan yaz.",
                    "Yarın için tek bir öncelik belirleyip not alman yeterli.",
                    "checkmark-done",
                    "Kolay",
                    4,
                    relatedIds
            ));
        }

        return templates.stream().limit(5).toList();
    }

    private String toActionTitle(String focusText) {
        String normalized = focusText.endsWith(".")
                ? focusText.substring(0, focusText.length() - 1)
                : focusText;
        return clamp(normalized, 80) + ".";
    }

    private NatalChart findLatestChart(Long userId) {
        return natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc(String.valueOf(userId)).orElse(null);
    }

    private String buildCacheVersion(NatalChart chart, String profileVersion) {
        String locationVersion;
        if (chart == null || chart.getLatitude() == null || chart.getLongitude() == null) {
            locationVersion = "na";
        } else {
            locationVersion = round(chart.getLatitude(), 3) + ":" + round(chart.getLongitude(), 3);
        }
        // Cache'i teknik hesap + kişiselleştirme sürümü birlikte belirlesin.
        return locationVersion + "|pv:" + firstNonBlank(profileVersion, "na") + "|iv:" + INSIGHT_ENGINE_VERSION;
    }

    private UserAstroProfile buildUserAstroProfile(Long userId, NatalChart chart) {
        List<UserFeedback> feedbacks = userFeedbackRepository.findTop120ByUserIdOrderByCreatedAtDesc(userId);
        Map<String, Integer> themePreference = new HashMap<>();
        themePreference.put("İletişim", 0);
        themePreference.put("Aşk", 0);
        themePreference.put("İş", 0);
        themePreference.put("Enerji", 0);
        themePreference.put("Ruh Hali", 0);

        for (UserFeedback feedback : feedbacks) {
            String theme = detectThemeFromFeedback(feedback);
            if (theme == null) continue;
            int weight = "up".equalsIgnoreCase(feedback.getSentiment()) ? 2 : -2;
            themePreference.merge(theme, weight, Integer::sum);
        }
        themePreference.replaceAll((k, v) -> clampInt(v, -8, 8));

        List<PlanetPosition> natalPlanets = parseJsonList(chart != null ? chart.getPlanetPositionsJson() : null, PlanetPosition.class);
        Set<String> sensitiveHouses = new java.util.HashSet<>();
        for (PlanetPosition planet : natalPlanets) {
            if (planet == null || planet.house() <= 0) continue;
            if ("Sun".equalsIgnoreCase(planet.planet()) || "Moon".equalsIgnoreCase(planet.planet()) || "Mars".equalsIgnoreCase(planet.planet())) {
                sensitiveHouses.add(String.valueOf(planet.house()));
            }
        }
        if (sensitiveHouses.isEmpty()) {
            sensitiveHouses.addAll(Set.of("1", "4", "7", "10"));
        }

        // Dominant gezegen + geri bildirim tercihleri aynı transit için kullanıcı farkı üretir.
        String dominantPlanet = dominantPlanetFromChart(chart, natalPlanets);
        String signHint = buildSignSignature(chart);

        UserFeedback latestFeedback = userFeedbackRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        String profileVersion = String.join("|",
                firstNonBlank(chart != null ? chart.getSunSign() : null, "na"),
                firstNonBlank(chart != null ? chart.getMoonSign() : null, "na"),
                firstNonBlank(chart != null ? chart.getRisingSign() : null, "na"),
                latestFeedback != null && latestFeedback.getCreatedAt() != null ? latestFeedback.getCreatedAt().toString() : "nofb",
                String.valueOf(feedbacks.size()),
                firstNonBlank(dominantPlanet, "na"));

        return new UserAstroProfile(
                chart != null ? chart.getSunSign() : null,
                chart != null ? chart.getMoonSign() : null,
                chart != null ? chart.getRisingSign() : null,
                dominantPlanet,
                Collections.unmodifiableSet(sensitiveHouses),
                Collections.unmodifiableMap(themePreference),
                signHint,
                profileVersion
        );
    }

    private String detectThemeFromFeedback(UserFeedback feedback) {
        if (feedback == null) return null;
        String source = (firstNonBlank(feedback.getItemId(), feedback.getNote())).toLowerCase(Locale.ROOT);
        if (source.isBlank()) return null;
        if (source.contains("iletisim") || source.contains("mesaj") || source.contains("konus")) return "İletişim";
        if (source.contains("ask") || source.contains("iliski") || source.contains("romantik")) return "Aşk";
        if (source.contains("is") || source.contains("kariyer") || source.contains("toplanti")) return "İş";
        if (source.contains("enerji") || source.contains("yorgun") || source.contains("tempo")) return "Enerji";
        if (source.contains("ruh") || source.contains("duygu") || source.contains("mood")) return "Ruh Hali";
        return null;
    }

    private String dominantPlanetFromChart(NatalChart chart, List<PlanetPosition> natalPlanets) {
        if (chart != null && chart.getRisingSign() != null && !chart.getRisingSign().isBlank()) {
            return rulerBySign(chart.getRisingSign());
        }
        if (chart != null && chart.getSunSign() != null && !chart.getSunSign().isBlank()) {
            return rulerBySign(chart.getSunSign());
        }
        for (PlanetPosition planet : natalPlanets) {
            if (planet != null && planet.planet() != null && !planet.planet().isBlank()) {
                return cleanPlanet(planet.planet());
            }
        }
        return "Moon";
    }

    private String rulerBySign(String sign) {
        String token = normalizeToken(sign);
        return switch (token) {
            case "aries", "scorpio", "koc", "akrep" -> "Mars";
            case "taurus", "libra", "boga", "terazi" -> "Venus";
            case "gemini", "virgo", "ikizler", "basak" -> "Mercury";
            case "cancer", "yengec" -> "Moon";
            case "leo", "aslan" -> "Sun";
            case "sagittarius", "pisces", "yay", "balik" -> "Jupiter";
            case "capricorn", "aquarius", "oglak", "kova" -> "Saturn";
            default -> "Moon";
        };
    }

    private ZoneId resolveZone(String timezoneHint) {
        if (timezoneHint == null || timezoneHint.isBlank()) {
            return DEFAULT_ZONE;
        }
        try {
            return ZoneId.of(timezoneHint.trim());
        } catch (Exception ignored) {
            return DEFAULT_ZONE;
        }
    }

    private String cleanPlanet(String value) {
        if (value == null) return "";
        return value.replace("T-", "").replace("N-", "").trim();
    }

    private String translatePlanet(String english) {
        return PLANET_TR.getOrDefault(english, english);
    }

    private String translateSign(String english) {
        return SIGN_TR.getOrDefault(english, english);
    }

    private String themeForPlanet(String transitPlanet) {
        return switch (transitPlanet) {
            case "Mercury" -> "İletişim";
            case "Venus" -> "Aşk";
            case "Jupiter", "Saturn", "Sun" -> "İş";
            case "Mars" -> "Enerji";
            default -> "Ruh Hali";
        };
    }

    private boolean isSupportive(PlanetaryAspect aspect, String transitPlanet) {
        return switch (aspect.type()) {
            case TRINE, SEXTILE -> true;
            case SQUARE, OPPOSITION -> false;
            case CONJUNCTION -> BENEFIC_PLANETS.contains(transitPlanet);
        };
    }

    private String supportiveTitle(String theme, String variationKey) {
        List<String> options = switch (theme) {
            case "İletişim" -> List.of("İletişimde hızlanma", "Sözlerde akış", "Bağlantılarda canlılık");
            case "Aşk" -> List.of("İlişkilerde sıcak akış", "Yakınlıkta yumuşama", "Duygularda uyum");
            case "İş" -> List.of("İşlerde toparlanma", "Planlarda netleşme", "Kariyerde akıcı tempo");
            case "Enerji" -> List.of("Enerjide yükseliş", "Motivasyonda artış", "Ritmini kolay kurma");
            default -> List.of("Ruh halinde denge", "İç dengede toparlanma", "Zihinde sakin akış");
        };
        return pickVariant(options, variationKey + "|title");
    }

    private String cautionTitle(String theme, String variationKey) {
        List<String> options = switch (theme) {
            case "İletişim" -> List.of("Sözlerde netlik ihtiyacı", "İletişimde dikkat eşiği", "Mesajlarda bulanıklık riski");
            case "Aşk" -> List.of("İlişkilerde hassas eşik", "Yakınlıkta yanlış anlama riski", "Duygusal tepkilerde denge ihtiyacı");
            case "İş" -> List.of("Planlarda gecikme riski", "Takvimde sıkışma ihtimali", "İş akışında yavaşlama");
            case "Enerji" -> List.of("Enerjiyi dengede tut", "Tempoyu bölerek ilerle", "Yorgunluk eşiğine dikkat");
            default -> List.of("Duygularda dalgalanma", "İç ritimde dengesizlik", "Sezgilerde kararsızlık");
        };
        return pickVariant(options, variationKey + "|title");
    }

    private String supportiveImpact(String theme, String planet, String house, String variationKey) {
        List<String> options = switch (theme) {
            case "İletişim" -> List.of(
                    "Konuşmalar akıcı olur; doğru kişiye yazacağın kısa mesaj hızlı dönüş getirebilir.",
                    "Net cümleler hızlı sonuç verir; kısa bir görüşme işini kolaylaştırabilir.",
                    "Yeni temaslar için uygun bir akış var; açık ve sade iletişim avantaj sağlar."
            );
            case "Aşk" -> List.of(
                    "Küçük jestler ilişkine iyi gelir; kırıcı olmadan net kalman yeterli olur.",
                    "Empati kurduğunda bağ güçlenir; sakin bir konuşma uzaklığı azaltabilir.",
                    "İlişkilerde sıcak bir zemin var; abartmadan samimi kalmak olumlu ilerletir."
            );
            case "İş" -> List.of(
                    "Önceliklerini doğru sıralarsan işlerini beklediğinden daha hızlı toparlayabilirsin.",
                    "Net bir planla başladığında dağınıklık azalır; verim gün içinde yükselir.",
                    "Zaman bloklarıyla ilerlemek bugün daha çok sonuç getirir."
            );
            case "Enerji" -> List.of(
                    "Hareket etmek motivasyonunu artırır; kısa bir yürüyüş zihnini açar.",
                    "Bedensel ritim yükseliyor; küçük molalarla bu akışı daha iyi korursun.",
                    "Günün enerjisi artıyor; kısa bir aktivite odaklanmanı güçlendirir."
            );
            default -> List.of(
                    translatePlanet(planet) + " etkisi sezgini güçlendirir; gün içinde iç sesini duyman kolaylaşır.",
                    "Duygusal zeminde yumuşama var; sakin kaldığında kararların netleşir.",
                    "Zihinsel akış daha düzenli; küçük adımlarla güvenli biçimde ilerleyebilirsin."
            );
        };
        String base = pickVariant(options, variationKey + "|impact");
        return base + " " + houseFocusHint(house, true, variationKey);
    }

    private String cautionImpact(String theme, String planet, String house, String variationKey) {
        List<String> options = switch (theme) {
            case "İletişim" -> List.of(
                    "Yanlış anlaşılmalar olabilir; mesajları göndermeden önce bir kez daha kontrol et.",
                    "Acele cevaplar gerilim yaratabilir; kısa bir duraklama iletişimi korur.",
                    "İletişimde ton kolay sertleşebilir; net ama yumuşak bir dil daha iyi sonuç verir."
            );
            case "Aşk" -> List.of(
                    "Duygusal tepkiler büyüyebilir; önce dinleyip sonra yanıt vermek daha iyi sonuç verir.",
                    "İlişkilerde hassasiyet artabilir; kırıcı cümlelerden kaçınmak dengeyi korur.",
                    "Beklentiler çabuk yükseliyor; konuşmayı açık ve sakin tutmak daha güvenli olur."
            );
            case "İş" -> List.of(
                    "Takvimde sıkışma olabilir; tek işe odaklanıp kalanını sıralamak stresi azaltır.",
                    "Aynı anda çok başlık açmak yorabilir; tek görev yaklaşımı bugünü kurtarır.",
                    "İş akışı gecikebilir; öncelik listesiyle ilerlemek kontrol duygusunu artırır."
            );
            case "Enerji" -> List.of(
                    "Yorgunluk birikebilir; küçük molalar vermek performansını korur.",
                    "Enerji dalgalanması yaşayabilirsin; tempoyu gün içine yaymak daha doğru olur.",
                    "Hızlı başlamak kolay, sürdürmek zor olabilir; ritmini aşama aşama kur."
            );
            default -> List.of(
                    translatePlanet(planet) + " etkisi duygusal dalgalanma yaratabilir; kararlarını aceleye getirme.",
                    "Duygusal tepkiler artabilir; kısa bir değerlendirme arası daha sağlıklı olur.",
                    "İç sesin karışabilir; netlik için kararlarını zamana yayman faydalı olur."
            );
        };
        String base = pickVariant(options, variationKey + "|impact");
        return base + " " + houseFocusHint(house, false, variationKey);
    }

    private int computeImportance(
            PlanetaryAspect aspect,
            boolean supportive,
            String house,
            boolean isRetrograde,
            String theme,
            String transitPlanet,
            UserAstroProfile userProfile
    ) {
        // Teknik güç + kullanıcı profili birleşerek kullanıcıya görünen önem skorunu üretir.
        double orb = Math.max(aspect.orb(), 0);
        int orbScore = clampInt((int) Math.round(90 - (orb * 9)), 42, 92);
        int aspectWeight = switch (aspect.type()) {
            case TRINE -> 7;
            case SEXTILE -> 5;
            case CONJUNCTION -> supportive ? 4 : 1;
            case SQUARE -> -4;
            case OPPOSITION -> -6;
        };
        int houseWeight = switch (house == null ? "" : house) {
            case "1", "4", "7", "10" -> 6;
            case "2", "5", "8", "11" -> 4;
            case "3", "6", "9", "12" -> 2;
            default -> 0;
        };
        int supportiveWeight = supportive ? 3 : 0;
        int retroPenalty = isRetrograde ? 6 : 0;
        int themeBonus = themePreferenceBonus(userProfile, theme);
        int planetBonus = dominantPlanetBonus(userProfile, transitPlanet);
        int sensitiveHouseBonus = sensitiveHouseBonus(userProfile, house);
        int score = orbScore + aspectWeight + houseWeight + supportiveWeight - retroPenalty
                + themeBonus + planetBonus + sensitiveHouseBonus;
        return clampInt(score, 38, 97);
    }

    private int themePreferenceBonus(UserAstroProfile userProfile, String theme) {
        if (userProfile == null || userProfile.themePreference() == null) return 0;
        return clampInt(userProfile.themePreference().getOrDefault(theme, 0), -8, 8);
    }

    private int dominantPlanetBonus(UserAstroProfile userProfile, String transitPlanet) {
        if (userProfile == null || userProfile.dominantPlanet() == null || transitPlanet == null) {
            return 0;
        }
        return normalizeToken(userProfile.dominantPlanet()).equals(normalizeToken(transitPlanet)) ? 4 : 0;
    }

    private int sensitiveHouseBonus(UserAstroProfile userProfile, String house) {
        if (userProfile == null || house == null || house.isBlank()) return 0;
        return userProfile.sensitiveHouses().contains(house) ? 4 : 0;
    }

    private String statusFrom(boolean supportive, int importance, boolean retrograde) {
        if (!supportive) {
            return importance >= 74 ? "Dikkat" : "Hassas";
        }
        if (retrograde) {
            return importance >= 70 ? "Hassas" : "Kolay";
        }
        return importance >= 74 ? "Destekleyici" : "Kolay";
    }

    private String relevanceFromImportance(int importance) {
        if (importance >= 82) return "Yüksek";
        if (importance >= 64) return "Orta";
        return "Düşük";
    }

    private String avoidSoftener(String status) {
        return switch (status) {
            case "Dikkat" -> "Gün içinde acele karar vermekten kaçınmak faydalı olur.";
            case "Hassas" -> "Temponu dengede tutman ve detayları bir kez daha kontrol etmen iyi olabilir.";
            case "Destekleyici" -> "Bu akışı korumak için adımlarını sade ve planlı tutman yeterli olur.";
            default -> "Küçük ama net adımlar seçmen akışı kolaylaştırır.";
        };
    }

    private String reasonFrom(
            String theme,
            String house,
            boolean supportive,
            String transitPlanet,
            UserAstroProfile userProfile) {
        String houseHint = houseFocusHint(house, supportive, firstNonBlank(theme, transitPlanet));
        String signHint = userProfile == null ? "" : userProfile.signatureHint();
        String base = supportive
                ? "Bu temada destekleyici bir akış var."
                : "Bu temada gün içinde hassas bir eşik oluşabilir.";
        if (!signHint.isBlank()) {
            return base + " " + signHint + " " + houseHint;
        }
        return base + " " + houseHint;
    }

    private String buildTechnicalReason(
            String transitPlanet,
            String natalPoint,
            String aspect,
            double orb,
            String house
    ) {
        String houseText = (house == null || house.isBlank()) ? "ev-bilgisi yok" : ("ev " + house);
        return transitPlanet + " / " + natalPoint + " • " + aspect + " • orb " + orb + " • " + houseText;
    }

    private String buildVariationKey(
            LocalDate date,
            Long userId,
            String transitPlanet,
            String natalPoint,
            String aspectType,
            String house
    ) {
        return String.join("|",
                String.valueOf(date),
                String.valueOf(userId),
                normalizeToken(transitPlanet),
                normalizeToken(natalPoint),
                normalizeToken(aspectType),
                normalizeToken(house));
    }

    private String houseFocusHint(String house, boolean supportive, String variationKey) {
        if (house == null || house.isBlank()) {
            List<String> defaultHints = supportive
                    ? List.of("Küçük ve net adımlar akışı korur.", "Önceliğini sade tutman verimi artırır.")
                    : List.of("Acele karar yerine kısa bir kontrol yapman faydalı olur.", "Ritmi bölmeden ama sakin ilerlemek daha güvenli olur.");
            return pickVariant(defaultHints, variationKey + "|house");
        }

        String area = switch (house) {
            case "1" -> "kişisel ihtiyaçların";
            case "2" -> "maddi planların";
            case "3" -> "yakın çevre iletişimin";
            case "4" -> "ev ve aile düzenin";
            case "5" -> "yaratıcılık ve keyif alanın";
            case "6" -> "günlük rutinlerin";
            case "7" -> "ilişkiler ve ortaklıklar";
            case "8" -> "paylaşımlar ve derin duygular";
            case "9" -> "öğrenme ve ufuk genişletme";
            case "10" -> "kariyer hedeflerin";
            case "11" -> "sosyal çevre ve projelerin";
            case "12" -> "dinlenme ve içe dönüş alanın";
            default -> "günlük akışın";
        };

        if (supportive) {
            List<String> options = List.of(
                    "Bu etki özellikle " + area + " tarafında destekleyici çalışır.",
                    area + " alanında doğru zamanlamayla ilerlemek kolaylaşır.",
                    area + " konusunda sade adımlar daha hızlı karşılık bulur."
            );
            return pickVariant(options, variationKey + "|house");
        }

        List<String> options = List.of(
                area + " tarafında acele etmeden ilerlemek daha güvenli olur.",
                area + " alanında küçük bir kontrol hataları azaltır.",
                area + " başlığında netleşmeden büyük adım atmamaya çalış."
        );
        return pickVariant(options, variationKey + "|house");
    }

    private String pickVariant(List<String> options, String key) {
        if (options == null || options.isEmpty()) {
            return "";
        }
        int index = Math.abs(key.hashCode()) % options.size();
        return options.get(index);
    }

    private String moodTagFromTheme(String theme, int retroCount) {
        if (retroCount >= 2) return "Odak";
        return switch (theme) {
            case "İletişim", "Aşk" -> "Sosyal";
            case "İş" -> "Odak";
            case "Enerji" -> "Cesur";
            default -> "Duygusal";
        };
    }

    private String actionHint(String theme, String label) {
        boolean caution = "Dikkat".equalsIgnoreCase(label) || "Hassas".equalsIgnoreCase(label);
        return switch (theme) {
            case "İletişim" -> caution
                    ? "Mesajlarını göndermeden önce iki kez kontrol et."
                    : "Uzun süredir yazmadığın bir kişiye kısa bir mesaj at.";
            case "Aşk" -> caution
                    ? "Duygusal konuşmalarda savunmaya geçmeden önce dinle."
                    : "İlişkinde küçük ama samimi bir jest yap.";
            case "İş" -> caution
                    ? "Tek işe odaklanıp bitirmeden yeni iş açma."
                    : "Ertelediğin bir işi 15 dakikalık blokla başlat.";
            case "Enerji" -> caution
                    ? "Günün temposunu molalarla dengele."
                    : "Kısa bir yürüyüşle enerjini tazele.";
            default -> caution
                    ? "Karar almadan önce bir adım geri çekilip planını netleştir."
                    : "Sezgini dinleyip küçük bir adım at.";
        };
    }

    private String avoidHint(String theme, String label) {
        boolean caution = "Dikkat".equalsIgnoreCase(label) || "Hassas".equalsIgnoreCase(label);
        if (!caution) {
            return "Aynı anda çok fazla işi paralel yürütmekten kaçınman iyi olur.";
        }
        return switch (theme) {
            case "İletişim" -> "Ani tepkiyle mesaj göndermekten kaçınmak faydalı olur.";
            case "Aşk" -> "Kırıcı veya kesin yargılı cümlelerden kaçınmak ilişkiyi korur.";
            case "İş" -> "Netleşmeden yeni görev açmaktan kaçınmak stresi düşürür.";
            case "Enerji" -> "Günü tek tempoda zorlamaktan kaçınmak daha sürdürülebilir olur.";
            default -> "Kesin kararları anlık duygu ile vermekten kaçınmak daha güvenli olur.";
        };
    }

    private String iconForTheme(String theme) {
        return switch (theme) {
            case "İletişim" -> "chatbubble-ellipses";
            case "Aşk" -> "heart";
            case "İş" -> "briefcase";
            case "Enerji" -> "walk";
            default -> "sparkles";
        };
    }

    private String actionTagFromStatus(String status) {
        return switch (status) {
            case "Dikkat" -> "Dikkat";
            case "Hassas" -> "Planlı";
            case "Destekleyici" -> "Fırsat";
            default -> "Kolay";
        };
    }

    private Integer etaFromImportance(int importance) {
        if (importance >= 82) return 12;
        if (importance >= 68) return 8;
        return 5;
    }

    private String resolveHouseForTransit(String transitPlanet, List<PlanetPosition> transitPositions, List<HousePlacement> natalHouses) {
        if (natalHouses == null || natalHouses.isEmpty()) {
            return null;
        }
        return transitPositions.stream()
                .filter(p -> transitPlanet.equalsIgnoreCase(p.planet()))
                .findFirst()
                .map(p -> String.valueOf(transitCalculator.getTransitHouse(p, natalHouses)))
                .orElse(null);
    }

    private String timeWindowForIndex(int idx) {
        return switch (idx % 4) {
            case 0 -> "09:00–12:00";
            case 1 -> "12:00–15:00";
            case 2 -> "15:00–18:00";
            default -> "18:00–21:00";
        };
    }

    private String normalizeToken(String input) {
        if (input == null) return "";
        return input
                .toLowerCase(Locale.ROOT)
                .replace("ı", "i")
                .replace("ç", "c")
                .replace("ş", "s")
                .replace("ğ", "g")
                .replace("ö", "o")
                .replace("ü", "u")
                .replaceAll("[^a-z0-9]", "");
    }

    private String clamp(String value, int maxLen) {
        String source = value == null ? "" : value.trim();
        if (source.length() <= maxLen) {
            return source;
        }
        return source.substring(0, Math.max(0, maxLen - 1)).trim() + "…";
    }

    private int clampInt(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value, int precision) {
        double scale = Math.pow(10, precision);
        return Math.round(value * scale) / scale;
    }

    private <T> List<T> parseJsonList(String json, Class<T> clazz) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            JavaType javaType = objectMapper.getTypeFactory().constructCollectionType(List.class, clazz);
            return objectMapper.readValue(json, javaType);
        } catch (Exception e) {
            log.debug("parseJsonList failed for {}", clazz.getSimpleName(), e);
            return List.of();
        }
    }

    private record UserAstroProfile(
            String sunSign,
            String moonSign,
            String risingSign,
            String dominantPlanet,
            Set<String> sensitiveHouses,
            Map<String, Integer> themePreference,
            String signatureHint,
            String profileVersion
    ) {}

    private record ActionTemplate(
            String id,
            String title,
            String detail,
            String icon,
            String tag,
            Integer etaMin,
            List<String> relatedTransitIds
    ) {}
}
