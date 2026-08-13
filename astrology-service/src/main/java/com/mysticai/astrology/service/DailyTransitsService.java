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
import com.mysticai.astrology.dto.daily.PlanFeedbackReason;
import com.mysticai.astrology.dto.daily.PlanFeedbackResponse;
import com.mysticai.astrology.service.personalplan.PersonalPlanService;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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
    private final PersonalPlanService personalPlanService;
    private final ObjectMapper objectMapper;

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Istanbul");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_DATE;
    private static final int MIN_TRANSITS = 3;
    private static final int MAX_TRANSITS = 7;
    private static final String INSIGHT_ENGINE_VERSION = "daily-insight-v3";
    private static final String DAILY_TRANSITS_CACHE_KEY_PREFIX = "dtc-v3:";
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

    private static final Map<String, String> PLANET_EN = Map.ofEntries(
            Map.entry("Sun", "Sun"),
            Map.entry("Moon", "Moon"),
            Map.entry("Mercury", "Mercury"),
            Map.entry("Venus", "Venus"),
            Map.entry("Mars", "Mars"),
            Map.entry("Jupiter", "Jupiter"),
            Map.entry("Saturn", "Saturn"),
            Map.entry("Uranus", "Uranus"),
            Map.entry("Neptune", "Neptune"),
            Map.entry("Pluto", "Pluto"),
            Map.entry("NorthNode", "North Node"),
            Map.entry("Chiron", "Chiron")
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

    public DailyTransitsDTO getDailyTransits(Long userId, LocalDate requestedDate, String timezoneHint, String locale) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Geçerli kullanıcı bulunamadı.");
        }

        String resolvedLocale = normalizeLocale(locale);
        ZoneId zone = resolveZone(timezoneHint);
        LocalDate date = requestedDate != null ? requestedDate : LocalDate.now(zone);
        NatalChart chart = findLatestChart(userId);
        UserAstroProfile profile = buildUserAstroProfile(userId, chart);
        String locationVersion = buildCacheVersion(chart, profile.profileVersion(), resolvedLocale);

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

        DailyTransitsDTO fresh = buildDailyTransitsDto(userId, date, zone, chart, profile, resolvedLocale);
        persistCache(userId, date, zone.getId(), locationVersion, fresh);
        return fresh;
    }

    /**
     * Premium personal plan for the user's LOCAL calendar day.
     *
     * Composition lives in {@link PersonalPlanService}; this method resolves the local day and
     * supplies the already-computed transit context so the two services stay acyclic. If
     * composition throws, a structured minimal premium payload is used; dull legacy templates
     * must never silently return to the screen.
     */
    public DailyActionsDTO getDailyActions(Long userId, LocalDate requestedDate, String timezoneHint, String locale) {
        PersonalPlanService.PlanRequest request = buildPlanRequest(userId, requestedDate, timezoneHint, locale);
        try {
            DailyActionsDTO plan = personalPlanService.buildPlan(request);
            if (plan != null) {
                return plan;
            }
        } catch (Exception e) {
            log.warn("Personal plan composition failed for userId={} localDate={}, using minimal premium payload: {}",
                    userId, request.localDate(), e.toString());
        }
        return personalPlanService.buildMinimalPlan(request.transits(), request.localDate(), request.english());
    }

    /**
     * Resolves everything the plan is keyed on. The local day is derived from the user's
     * timezone — never {@code LocalDate.now()} on the server and never the UTC day.
     */
    public PersonalPlanService.PlanRequest buildPlanRequest(
            Long userId, LocalDate requestedDate, String timezoneHint, String locale) {
        String resolvedLocale = normalizeLocale(locale);
        boolean english = isEnglishLocale(resolvedLocale);
        ZoneId zone = resolveZone(timezoneHint);
        LocalDate localDate = requestedDate != null ? requestedDate : LocalDate.now(zone);

        DailyTransitsDTO transitsDTO = getDailyTransits(userId, localDate, timezoneHint, resolvedLocale);
        NatalChart chart = findLatestChart(userId);
        List<PlanetPosition> natalPositions = parseJsonList(
                chart != null ? chart.getPlanetPositionsJson() : null, PlanetPosition.class);

        return new PersonalPlanService.PlanRequest(
                userId, localDate, zone, resolvedLocale, english, transitsDTO, chart, natalPositions);
    }

    private DailyActionsDTO buildLegacyDailyActions(
            Long userId, LocalDate date, DailyTransitsDTO transitsDTO, boolean english) {
        List<ActionTemplate> templates = buildActionTemplates(transitsDTO, english);
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

        String mood = transitsDTO.hero() != null ? transitsDTO.hero().moodTag() : t(english, "Sakin", "Calm");
        DailyActionsDTO.Header header = new DailyActionsDTO.Header(
                t(english, "Bugün Ne Yapabilirsin?", "What Can You Do Today?"),
                clamp(
                        english
                                ? "Plan 3 small steps for a " + mood.toLowerCase(Locale.ROOT) + " flow."
                                : mood + " akışı için 3 küçük adım planla.",
                        64)
        );

        return DailyActionsDTO.legacy(
                transitsDTO.date(),
                header,
                actions,
                new DailyActionsDTO.MiniPlan(t(english, "Mini Plan", "Mini Plan"), planSteps)
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

    /**
     * Records plan feedback and, when the reason calls for it, rebuilds the day's plan in the
     * same transaction so the replacement travels back in this response.
     */
    public PlanFeedbackResponse saveFeedback(Long userId, DailyFeedbackRequest request, String timezoneHint) {
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
        PlanFeedbackReason reason = PlanFeedbackReason.parse(request.reason());

        PersonalPlanService.PlanRequest planRequest =
                buildPlanRequest(userId, request.date(), timezoneHint, request.locale());

        return personalPlanService.submitFeedback(
                planRequest,
                clamp(request.itemId(), 120),
                normalizedSentiment,
                reason,
                request.note());
    }

    private DailyTransitsDTO buildDailyTransitsDto(
            Long userId,
            LocalDate date,
            ZoneId zone,
            NatalChart chart,
            UserAstroProfile userProfile,
            String locale
    ) {
        boolean english = isEnglishLocale(locale);
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
        String moonSign = moon != null ? translateSign(moon.sign(), english) : t(english, "Başak", "Virgo");
        String moonPhase = translateMoonPhase(transitCalculator.getMoonPhase(date), english);

        List<PlanetPosition> retrograde = transits.stream()
                .filter(p -> p.retrograde() && !"Sun".equalsIgnoreCase(p.planet()) && !"Moon".equalsIgnoreCase(p.planet()))
                .toList();

        List<DailyTransitsDTO.RetrogradeItem> retroItems = retrograde.stream()
                .map(position -> toRetroItem(position, natalHouses, english))
                .toList();

        List<DailyTransitsDTO.TransitItem> transitItems =
                buildTransitItems(aspects, transits, natalHouses, date, zone, userId, userProfile, english);
        List<DailyTransitsDTO.FocusPoint> focusPoints = buildFocusPoints(transitItems, retroItems, english);
        DailyTransitsDTO.Hero hero = buildHero(transitItems, retroItems, chart, date, userId, english);
        String contextKey = buildDailyContextKey(userId, date, chart, transitItems, retroItems, moonPhase, moonSign);

        String retroCountValue = buildRetroCountText(retroItems, contextKey, english);
        List<DailyTransitsDTO.QuickFact> quickFacts = List.of(
                new DailyTransitsDTO.QuickFact("moon-phase", t(english, "Ay Fazı", "Moon Phase"), moonPhase, "moonPhase"),
                new DailyTransitsDTO.QuickFact("moon-sign", t(english, "Ay Burcu", "Moon Sign"), moonSign, "zodiacSign"),
                new DailyTransitsDTO.QuickFact("retro", "Retro", retroCountValue, "retro")
        );

        DailyTransitsDTO.TransitItem topTransit = transitItems.isEmpty() ? null : transitItems.get(0);
        String topTheme = topTransit == null ? localizeThemeKey("mood", english) : topTransit.theme();
        String todayBody = focusPoints.stream()
                .limit(2)
                .map(DailyTransitsDTO.FocusPoint::text)
                .reduce((a, b) -> clamp(a, 64) + " " + clamp(b, 64))
                .orElseGet(() -> fallbackTodayBody(topTheme, hero.moodTag(), contextKey, english));

        DailyTransitsDTO.TodayCanDo todayCanDo = new DailyTransitsDTO.TodayCanDo(
                buildTodayCanDoHeadline(topTheme, hero.moodTag(), contextKey, english),
                clamp(todayBody, 108),
                buildTodayCtaText(topTheme, contextKey, english),
                "TodayActions"
        );

        return new DailyTransitsDTO(
                date.format(DATE_FORMATTER),
                buildDailyTitle(chart, topTransit, topTheme, contextKey, english),
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

    private String buildDailyTitle(
            NatalChart chart,
            DailyTransitsDTO.TransitItem topTransit,
            String topTheme,
            String contextKey,
            boolean english
    ) {
        String sign = chart == null ? "" : translateSign(chart.getSunSign(), english);
        List<String> options = new ArrayList<>();
        options.add(t(english, "Bugün Seni Neler Etkiliyor", "What Is Influencing You Today"));
        options.add(t(english, "Bugün İçin Rehberin", "Your Guide for Today"));
        options.add(english ? "Today's " + topTheme + " flow" : topTheme + " odaklı günlük akış");
        if (topTransit != null && topTransit.technical() != null) {
            if (isHouseTransitAspect(topTransit.technical().aspect())) {
                options.add(english
                        ? topTransit.technical().transitPlanet() + " in " + topTransit.technical().natalPoint()
                        : topTransit.technical().transitPlanet() + " " + topTransit.technical().natalPoint() + " alanında");
            } else {
                options.add(english
                        ? topTransit.technical().transitPlanet() + " - " + topTransit.technical().natalPoint() + " focus"
                        : topTransit.technical().transitPlanet() + " - " + topTransit.technical().natalPoint() + " vurgusu");
            }
        }
        if (!sign.isBlank()) {
            options.add(english ? sign + " guide for today" : sign + " için bugünlük rehber");
        }
        return clamp(pickVariant(options, contextKey + "|title"), 42);
    }

    private String buildRetroCountText(List<DailyTransitsDTO.RetrogradeItem> retroItems, String contextKey, boolean english) {
        if (retroItems == null || retroItems.isEmpty()) {
            return pickVariant(
                    english ? List.of("None", "Light pressure", "Calm flow") : List.of("Yok", "Düşük baskı", "Sakin akış"),
                    contextKey + "|retro-none");
        }

        int count = retroItems.size();
        if (count == 1) {
            return pickVariant(
                    english ? List.of("1 planet", "1 active retrograde", "1 retro influence") : List.of("1 gezegen", "1 aktif retro", "1 retro etkisi"),
                    contextKey + "|retro-one");
        }
        return pickVariant(
                english
                        ? List.of(count + " planets", count + " active retrogrades", count + " retro influences")
                        : List.of(count + " gezegen", count + " aktif retro", count + " retro etkisi"),
                contextKey + "|retro-many");
    }

    private String buildTodayCanDoHeadline(String topTheme, String moodTag, String contextKey, boolean english) {
        List<String> options = new ArrayList<>();
        options.add(t(english, "Bugün Yapabileceklerin", "What You Can Do Today"));
        options.add(t(english, "Bugün için net adımlar", "Clear steps for today"));
        options.add(english ? topTheme + " mini plan" : topTheme + " odaklı mini plan");
        switch (canonicalMoodTag(moodTag)) {
            case "focus" -> options.add(t(english, "Bugün odak planı", "Today's focus plan"));
            case "social" -> options.add(t(english, "Bugün sosyal denge planı", "Today's social balance plan"));
            case "bold" -> options.add(t(english, "Bugün cesur ama kontrollü adımlar", "Bold but measured steps for today"));
            default -> {
            }
        }
        return clamp(pickVariant(options, contextKey + "|today-headline"), 46);
    }

    private String buildTodayCtaText(String topTheme, String contextKey, boolean english) {
        List<String> options = switch (canonicalTheme(topTheme)) {
            case "communication" -> english
                    ? List.of("Open communication steps", "How do you move today?", "See your message plan")
                    : List.of("İletişim adımlarını aç", "Bugün nasıl ilerlersin?", "Mesaj planını gör");
            case "love" -> english
                    ? List.of("Open relationship steps", "How do you move today?", "See balance steps")
                    : List.of("İlişki adımlarını aç", "Bugün nasıl ilerlersin?", "Denge adımlarını gör");
            case "work" -> english
                    ? List.of("Open your work plan", "How do you move today?", "See priority steps")
                    : List.of("İş planını aç", "Bugün nasıl ilerlersin?", "Öncelik adımlarını gör");
            case "energy" -> english
                    ? List.of("Open your energy plan", "How do you move today?", "See pacing steps")
                    : List.of("Enerji planını aç", "Bugün nasıl ilerlersin?", "Tempo adımlarını gör");
            default -> english
                    ? List.of("What Can You Do Today?", "How do you move today?", "See today's steps")
                    : List.of("Bugün Ne Yapabilirsin?", "Bugün nasıl ilerlersin?", "Günün adımlarını gör");
        };
        return clamp(pickVariant(options, contextKey + "|today-cta"), 34);
    }

    private String fallbackTodayBody(String topTheme, String moodTag, String contextKey, boolean english) {
        List<String> options = switch (canonicalTheme(topTheme)) {
            case "communication" -> english
                    ? List.of(
                            "Start one conversation with a clear sentence; staying short and direct makes the day easier.",
                            "Gather important messages in one place and answer them in order to calm your mind.")
                    : List.of(
                            "Bir konuşmayı net bir cümleyle başlat; kısa ve açık kalman gününü kolaylaştırır.",
                            "Önemli mesajları tek ekranda toparlayıp sırayla cevaplaman zihnini rahatlatır.");
            case "love" -> english
                    ? List.of(
                            "Stating your expectations calmly in relationships reduces unnecessary tension today.",
                            "A small but sincere gesture strengthens emotional balance during the day.")
                    : List.of(
                            "İlişkilerde beklentini sakin bir dille söylemek bugün gereksiz gerilimi azaltır.",
                            "Küçük ama samimi bir jest, gün içindeki duygusal dengeyi güçlendirir.");
            case "work" -> english
                    ? List.of(
                            "Finishing one task before moving to the next will noticeably improve your efficiency.",
                            "Planning the day in two short blocks and delaying distractions protects your pace.")
                    : List.of(
                            "Tek bir işi bitirmeye odaklanıp sonra diğerine geçmen verimini belirgin artırır.",
                            "Günü iki kısa blokta planlayıp dikkat dağıtan işleri ertelemek tempoyu korur.");
            case "energy" -> english
                    ? List.of(
                            "Moving forward with short breaks and drinking more water lowers end-of-day fatigue.",
                            "Keeping a steady pace and avoiding sudden accelerations protects mental clarity.")
                    : List.of(
                            "Kısa molalarla ilerleyip su tüketimini artırman gün sonu yorgunluğunu düşürür.",
                            "Tempoyu sabit tutup ani hızlanmalardan kaçınman zihinsel berraklığı korur.");
            default -> english
                    ? List.of(
                            "Choosing one priority today and completing it will clarify the rest of your day.",
                            "Taking small but steady steps strengthens your sense of control.")
                    : List.of(
                            "Bugün tek bir öncelik seçip onu tamamlaman günün geri kalanını netleştirir.",
                            "Küçük ama kararlı adımlar atman gün içinde kontrol hissini güçlendirir.");
        };

        if ("emotional".equals(canonicalMoodTag(moodTag))) {
            options = new ArrayList<>(options);
            options.add(t(
                    english,
                    "Duygusal yoğunluk artarsa kararlarını kısa bir mola sonrası vermek daha sağlıklı olur.",
                    "If emotions intensify, making decisions after a short pause will be healthier."
            ));
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
            UserAstroProfile userProfile,
            boolean english
    ) {
        Map<String, PlanetPosition> transitByPlanet = new LinkedHashMap<>();
        for (PlanetPosition position : transitPositions) {
            transitByPlanet.put(cleanPlanet(position.planet()), position);
        }

        AtomicInteger index = new AtomicInteger(0);
        List<DailyTransitsDTO.TransitItem> rankedAspectItems = aspects.stream()
                .map(aspect -> buildAspectTransitItem(aspect, transitByPlanet, transitPositions, natalHouses, date, userId, userProfile, index, english))
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparingInt(DailyTransitsDTO.TransitItem::importance).reversed()
                        .thenComparingInt((DailyTransitsDTO.TransitItem item) -> isCautionLabel(item.label()) ? 0 : 1)
                        .thenComparingDouble(item -> item.technical() != null ? item.technical().orb() : 99.0))
                .toList();

        List<DailyTransitsDTO.TransitItem> items = new ArrayList<>();
        Map<String, Integer> themeCount = new HashMap<>();
        Set<String> representedPlanets = new HashSet<>();
        Set<String> seenIdentities = new HashSet<>();

        for (DailyTransitsDTO.TransitItem item : rankedAspectItems) {
            if (items.size() >= MAX_TRANSITS) {
                break;
            }
            if (!canAcceptTransitItem(item, themeCount, seenIdentities)) {
                continue;
            }
            items.add(item);
            themeCount.merge(item.theme(), 1, Integer::sum);
            seenIdentities.add(buildTransitIdentity(item));
            representedPlanets.add(cleanTransitPlanet(item));
        }

        if (items.size() < MIN_TRANSITS) {
            addHouseTransitItems(
                    items,
                    themeCount,
                    seenIdentities,
                    representedPlanets,
                    transitPositions,
                    natalHouses,
                    date,
                    userId,
                    userProfile,
                    index,
                    english
            );
        }

        return items.stream()
                .sorted(Comparator
                        .comparingInt(DailyTransitsDTO.TransitItem::importance).reversed()
                        .thenComparingInt((DailyTransitsDTO.TransitItem item) -> isCautionLabel(item.label()) ? 0 : 1)
                        .thenComparing(DailyTransitsDTO.TransitItem::titlePlain))
                .limit(MAX_TRANSITS)
                .toList();
    }

    private DailyTransitsDTO.TransitItem buildAspectTransitItem(
            PlanetaryAspect aspect,
            Map<String, PlanetPosition> transitByPlanet,
            List<PlanetPosition> transitPositions,
            List<HousePlacement> natalHouses,
            LocalDate date,
            Long userId,
            UserAstroProfile userProfile,
            AtomicInteger index,
            boolean english
    ) {
        String transitPlanet = cleanPlanet(aspect.planet1());
        if (!ACTIONABLE_TRANSIT_PLANETS.contains(transitPlanet)) {
            return null;
        }

        String natalPoint = cleanPlanet(aspect.planet2());
        String house = resolveHouseForTransit(transitPlanet, transitPositions, natalHouses);
        boolean retrograde = Optional.ofNullable(transitByPlanet.get(transitPlanet))
                .map(PlanetPosition::retrograde)
                .orElse(false);
        boolean supportive = isSupportive(aspect, transitPlanet);
        String label = supportive ? t(english, "Destekleyici", "Supportive") : t(english, "Dikkat", "Caution");
        String theme = themeForPlanet(transitPlanet, english);
        String transitPlanetTr = translatePlanet(transitPlanet, english);
        String natalPointTr = translatePlanet(natalPoint, english);
        String variationKey = buildVariationKey(date, userId, transitPlanet, natalPointTr, aspect.type().name(), house);
        String aspectLabel = translateAspect(aspect.type(), english);
        String title = supportive
                ? transitPlanetTr + " - " + natalPointTr + t(english, " uyumu", " harmony")
                : transitPlanetTr + " - " + natalPointTr + t(english, " gerilimi", " tension");
        String baseImpact = supportive
                ? supportiveImpact(theme, transitPlanet, house, variationKey, english)
                : cautionImpact(theme, transitPlanet, house, variationKey, english);
        String areaIntro = supportive
                ? (english
                    ? transitPlanetTr + " opens support around " + themeFocusArea(theme, true) + ". "
                    : transitPlanetTr + " " + themeFocusArea(theme, false) + " alanında destek açıyor. ")
                : (english
                    ? transitPlanetTr + " asks for balance around " + themeFocusArea(theme, true) + ". "
                    : transitPlanetTr + " " + themeFocusArea(theme, false) + " alanında denge istiyor. ");
        String impact = clamp(areaIntro + baseImpact, 160);
        int importance = computeImportance(
                aspect,
                house,
                retrograde,
                transitPlanet,
                natalPoint,
                userProfile
        );
        return new DailyTransitsDTO.TransitItem(
                "insight-" + normalizeToken(theme) + "-" + index.incrementAndGet(),
                clamp(title, 48),
                impact,
                label,
                theme,
                null,
                importance,
                new DailyTransitsDTO.Technical(
                        transitPlanetTr,
                        natalPointTr,
                        aspectLabel,
                        round(aspect.orb(), 2),
                        null,
                        house
                ),
                clamp(actionHint(theme, label, house, english), 96),
                clamp(avoidHint(theme, label, house, english), 96),
                importance,
                relevanceFromImportance(importance, english),
                clamp(reasonFrom(theme, house, supportive, transitPlanet, userProfile, english), 120),
                buildTechnicalReason(transitPlanetTr, natalPointTr, aspectLabel, round(aspect.orb(), 2), house, english)
        );
    }

    private void addHouseTransitItems(
            List<DailyTransitsDTO.TransitItem> items,
            Map<String, Integer> themeCount,
            Set<String> seenIdentities,
            Set<String> representedPlanets,
            List<PlanetPosition> transitPositions,
            List<HousePlacement> natalHouses,
            LocalDate date,
            Long userId,
            UserAstroProfile userProfile,
            AtomicInteger index,
            boolean english
    ) {
        for (PlanetPosition planet : transitPositions) {
            if (items.size() >= MIN_TRANSITS || items.size() >= MAX_TRANSITS) {
                break;
            }

            String transitPlanet = cleanPlanet(planet.planet());
            if (!ACTIONABLE_TRANSIT_PLANETS.contains(transitPlanet) || representedPlanets.contains(transitPlanet)) {
                continue;
            }

            DailyTransitsDTO.TransitItem item = buildHouseTransitItem(
                    planet,
                    natalHouses,
                    date,
                    userId,
                    userProfile,
                    index,
                    english
            );
            if (item == null || !canAcceptTransitItem(item, themeCount, seenIdentities)) {
                continue;
            }

            items.add(item);
            themeCount.merge(item.theme(), 1, Integer::sum);
            seenIdentities.add(buildTransitIdentity(item));
            representedPlanets.add(transitPlanet);
        }
    }

    private DailyTransitsDTO.TransitItem buildHouseTransitItem(
            PlanetPosition transitPosition,
            List<HousePlacement> natalHouses,
            LocalDate date,
            Long userId,
            UserAstroProfile userProfile,
            AtomicInteger index,
            boolean english
    ) {
        String transitPlanet = cleanPlanet(transitPosition.planet());
        String house = resolveHouseForTransit(transitPosition, natalHouses);
        if (house == null || house.isBlank()) {
            return null;
        }

        boolean supportive = isHouseTransitSupportive(transitPlanet, house, transitPosition.retrograde());
        String label = supportive ? t(english, "Destekleyici", "Supportive") : t(english, "Dikkat", "Caution");
        String theme = themeForPlanet(transitPlanet, english);
        String transitPlanetTr = translatePlanet(transitPlanet, english);
        String variationKey = buildVariationKey(date, userId, transitPlanet, houseText(house), "HOUSE_TRANSIT", house);
        String areaFull = houseAreaText(house, english);
        String areaShort = houseAreaShortText(house, english);
        String baseImpact = supportive
                ? supportiveImpact(theme, transitPlanet, house, variationKey, english)
                : cautionImpact(theme, transitPlanet, house, variationKey, english);
        String houseImpactIntro = supportive
                ? (english
                    ? transitPlanetTr + " supports your " + areaFull + ". "
                    : transitPlanetTr + " " + areaFull + " alanını destekliyor. ")
                : (english
                    ? transitPlanetTr + " points to careful progress in your " + areaFull + ". "
                    : transitPlanetTr + " " + areaFull + " alanında dikkatli ilerlemeyi işaret ediyor. ");
        String impact = clamp(houseImpactIntro + baseImpact, 160);
        int importance = computeHouseTransitImportance(transitPlanet, house, transitPosition.retrograde(), userProfile);

        return new DailyTransitsDTO.TransitItem(
                "insight-" + normalizeToken(theme) + "-" + index.incrementAndGet(),
                clamp(
                        supportive
                                ? (english ? transitPlanetTr + " supports your " + areaShort : transitPlanetTr + " " + areaShort + " alanını destekliyor")
                                : (english ? transitPlanetTr + " asks for care in " + areaShort : transitPlanetTr + " " + areaShort + " alanında dikkat istiyor"),
                        48
                ),
                impact,
                label,
                theme,
                null,
                importance,
                new DailyTransitsDTO.Technical(
                        transitPlanetTr,
                        areaShort,
                        t(english, "Ev Geçişi", "House Transit"),
                        0.0,
                        null,
                        house
                ),
                clamp(actionHint(theme, label, house, english), 96),
                clamp(avoidHint(theme, label, house, english), 96),
                importance,
                relevanceFromImportance(importance, english),
                clamp(reasonFrom(theme, house, supportive, transitPlanet, userProfile, english), 120),
                english ? transitPlanetTr + " transit through " + areaShort : transitPlanetTr + " " + areaShort + " geçişi"
        );
    }

    private boolean canAcceptTransitItem(
            DailyTransitsDTO.TransitItem item,
            Map<String, Integer> themeCount,
            Set<String> seenIdentities
    ) {
        if (item == null) {
            return false;
        }
        if (themeCount.getOrDefault(item.theme(), 0) >= 2) {
            return false;
        }
        return !seenIdentities.contains(buildTransitIdentity(item));
    }

    private String cleanTransitPlanet(DailyTransitsDTO.TransitItem item) {
        if (item == null || item.technical() == null) {
            return "";
        }
        return cleanPlanet(item.technical().transitPlanet());
    }

    private boolean isHouseTransitSupportive(String transitPlanet, String house, boolean retrograde) {
        if (retrograde) {
            return false;
        }
        return switch (transitPlanet) {
            case "Mercury" -> !Set.of("8", "12").contains(house);
            case "Venus" -> !Set.of("6", "8", "12").contains(house);
            case "Mars" -> Set.of("1", "3", "5", "10", "11").contains(house);
            case "Jupiter" -> !Set.of("8", "12").contains(house);
            case "Saturn" -> Set.of("3", "6", "10", "11").contains(house);
            case "Sun" -> Set.of("1", "5", "9", "10", "11").contains(house);
            case "Moon" -> !Set.of("8", "12").contains(house);
            default -> !Set.of("8", "12").contains(house);
        };
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
            Long userId,
            boolean english
    ) {
        DailyTransitsDTO.TransitItem top = transits.isEmpty() ? null : transits.get(0);
        String theme = top != null ? top.theme() : localizeThemeKey("mood", english);
        String moodTag = moodTagFromTheme(theme, retrogrades.size(), english);
        int baseIntensity = transits.isEmpty()
                ? 48
                : clampInt((int) Math.round(transits.stream().mapToInt(DailyTransitsDTO.TransitItem::importance).average().orElse(58)), 38, 90);
        int retroPenalty = Math.min(retrogrades.size() * 3, 8);
        int cautionPenalty = top != null && isCautionLabel(top.label()) ? 5 : 0;
        int intensity = clampInt(baseIntensity - retroPenalty - cautionPenalty, 38, 92);

        String heroSeed = buildHeroSeed(top, chart, date, userId, retrogrades.size());
        String signSignature = buildSignSignature(chart, english);
        String topPlanet = top != null && top.technical() != null
                ? firstNonBlank(top.technical().transitPlanet(), top.technical().natalPoint())
                : null;
        String topPlanetTr = topPlanet == null ? "" : translatePlanet(cleanPlanet(topPlanet), english);
        String focusArea = themeFocusArea(theme, english);

        String retroHint = switch (retrogrades.size()) {
            case 0 -> "";
            case 1 -> t(english, " Retro nedeniyle hızdan çok netlik kazandırır.", " Retrograde pressure favors clarity over speed.");
            default -> t(english, " Retrolar yüzünden kararlarını iki kez kontrol etmek iyi olur.", " Multiple retrogrades make double-checking worthwhile.");
        };

        List<String> headlineOptions = new ArrayList<>();
        headlineOptions.add(english
                ? "Today's main emphasis lands on " + focusArea + "."
                : "Bugün " + focusArea + " tarafında asıl vurgu öne çıkıyor.");
        headlineOptions.add(english
                ? "Following the real triggers in " + focusArea + " will help more."
                : focusArea + " alanında gerçek tetikleri takip etmek daha çok işine yarar.");
        if (top != null && top.technical() != null) {
            if (isHouseTransitAspect(top.technical().aspect())) {
                headlineOptions.add(english
                        ? topPlanetTr + " highlights your " + houseAreaText(top.technical().house(), true) + " today."
                        : topPlanetTr + " bugün " + houseAreaText(top.technical().house(), false) + " alanını öne çıkarıyor.");
            } else {
                headlineOptions.add(english
                        ? topPlanetTr + " with " + top.technical().natalPoint() + " highlights " + focusArea + " today."
                        : topPlanetTr + " ile " + top.technical().natalPoint() + " teması bugün " + focusArea + " başlığını vurguluyor.");
            }
        } else if (!topPlanetTr.isBlank()) {
            headlineOptions.add(english
                    ? topPlanetTr + " energy pushes " + focusArea + " to the front today."
                    : topPlanetTr + " etkisi bugün " + focusArea + " başlığını öne taşıyor.");
        }
        if (!signSignature.isBlank()) {
            headlineOptions.add(english
                    ? signSignature + " adds extra sensitivity to this theme."
                    : signSignature + " bu temada ekstra hassasiyet veriyor.");
        }
        String headline = pickVariant(headlineOptions, heroSeed + "|headline");
        if (!retroHint.isBlank()) {
            headline = clamp(headline + retroHint, 50);
        }

        String topAction = top != null
                ? actionHint(theme, top.label(), houseOf(top), english)
                : actionHint(theme, t(english, "Nötr", "Neutral"), null, english);
        List<String> supportOptions = new ArrayList<>();
        if (top != null) {
            supportOptions.add(top.impactPlain());
            supportOptions.add(top.reason());
        }
        supportOptions.add(topAction + " " + themeSupportDetail(theme, english));
        supportOptions.add(themeSupportDetail(theme, english) + " " + topAction);
        if (!signSignature.isBlank()) {
            supportOptions.add(english
                    ? "To balance " + signSignature.toLowerCase(Locale.ROOT) + ", " + topAction.toLowerCase(Locale.ROOT)
                    : signSignature + " etkisini dengelemek için " + topAction.toLowerCase(Locale.ROOT));
        }
        if (!topPlanetTr.isBlank()) {
            supportOptions.add(english
                    ? "With " + topPlanetTr + " emphasized, " + topAction.toLowerCase(Locale.ROOT)
                    : topPlanetTr + " vurgusu varken " + topAction.toLowerCase(Locale.ROOT));
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

    private String buildSignSignature(NatalChart chart, boolean english) {
        if (chart == null) return "";
        String sun = translateSign(chart.getSunSign(), english);
        String rising = translateSign(chart.getRisingSign(), english);
        if (!sun.isBlank() && !rising.isBlank()) {
            return english ? "Your " + sun + "-" + rising + " signature" : sun + " - " + rising + " imzan";
        }
        if (!sun.isBlank()) {
            return english ? sun + " emphasis" : sun + " etkisi";
        }
        if (!rising.isBlank()) {
            return english ? rising + " rising" : rising + " yükseleni";
        }
        return "";
    }

    private String themeFocusArea(String theme, boolean english) {
        return switch (canonicalTheme(theme)) {
            case "communication" -> t(english, "iletişim ve yakın çevre", "communication and nearby connections");
            case "love" -> t(english, "ilişkiler", "relationships");
            case "work" -> t(english, "iş ve sorumluluklar", "work and responsibilities");
            case "energy" -> t(english, "kişisel tempo", "personal pacing");
            default -> t(english, "günlük düzen", "daily rhythm");
        };
    }

    private String themeSupportDetail(String theme, boolean english) {
        return switch (canonicalTheme(theme)) {
            case "communication" -> t(english, "Kısa cümleler yanlış anlaşılmayı azaltır.", "Short sentences reduce misunderstandings.");
            case "love" -> t(english, "Beklentini açık söylemen gerilimi düşürür.", "Stating expectations clearly lowers tension.");
            case "work" -> t(english, "Tek işe odaklanmak bugün daha hızlı sonuç verir.", "Focusing on one task brings faster results today.");
            case "energy" -> t(english, "Kısa molalar gün sonu yorgunluğunu azaltır.", "Short breaks lower end-of-day fatigue.");
            default -> t(english, "Önceliğini tek bir başlıkta tutmak günü rahatlatır.", "Keeping one clear priority makes the day easier.");
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
        if ("bold".equals(canonicalMoodTag(moodTag))) return "mars";
        return switch (canonicalTheme(theme)) {
            case "communication" -> "mercury";
            case "love" -> "venus";
            case "work" -> "saturn";
            case "energy" -> "mars";
            default -> "moon";
        };
    }

    private String resolveHeroGradient(String moodTag, int retroCount, String label) {
        if (retroCount >= 2 || isCautionLabel(label)) {
            return "nightSky";
        }
        if ("bold".equals(canonicalMoodTag(moodTag))) {
            return "sunrise";
        }
        if ("social".equals(canonicalMoodTag(moodTag))) {
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
            List<DailyTransitsDTO.RetrogradeItem> retrogrades,
            boolean english
    ) {
        List<String> suggestions = new ArrayList<>();
        for (DailyTransitsDTO.TransitItem item : transits) {
            if (suggestions.size() >= 3) break;
            String action = firstNonBlank(item.action(), actionHint(item.theme(), item.label(), houseOf(item), english));
            suggestions.add(action);
            if (suggestions.size() >= 3) break;
            if (isCautionLabel(item.label()) || normalizeToken(item.label()).contains("hassas")) {
                suggestions.add(firstNonBlank(item.avoid(), avoidHint(item.theme(), item.label(), houseOf(item), english)));
            }
        }

        if (suggestions.size() < 3 && !retrogrades.isEmpty()) {
            suggestions.add(retrogrades.get(0).meaningPlain());
        }
        if (suggestions.size() < 3 && !transits.isEmpty()) {
            suggestions.add(transits.get(0).reason());
        }
        if (suggestions.size() < 3) {
            suggestions.add(t(english, "Gün içinde 10 dakikalık bir plan molası vermen odağını toparlar.", "A 10-minute planning pause during the day can restore focus."));
        }
        if (suggestions.size() < 3) {
            suggestions.add(t(english, "Akşam için tek bir dinlendirici aktivite seçmek enerjini dengeler.", "Choosing one restorative activity for the evening helps balance your energy."));
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

    private DailyTransitsDTO.RetrogradeItem toRetroItem(PlanetPosition position, List<HousePlacement> natalHouses, boolean english) {
        String planet = translatePlanet(position.planet(), english);
        String house = resolveHouseForTransit(position, natalHouses);
        String area = houseAreaText(house, english);
        String meaning = switch (position.planet()) {
            case "Mercury" -> house == null
                    ? t(english, "Merkür retrosu mesaj, plan ve detayları iki kez kontrol etmeyi istiyor.", "Mercury retrograde asks you to double-check messages, plans, and details.")
                    : t(english, "Merkür retrosu " + area + " alanında mesaj, plan ve detayları iki kez kontrol etmeyi istiyor.", "Mercury retrograde asks you to double-check messages, plans, and details around " + area + ".");
            case "Venus" -> house == null
                    ? t(english, "Venüs retrosu ilişkiler ve beklentilerde eski temaları yeniden düşündürebilir.", "Venus retrograde can bring old themes back in relationships and expectations.")
                    : t(english, "Venüs retrosu " + area + " alanında ilişkiler ve beklentileri yeniden gözden geçirmeyi istiyor.", "Venus retrograde asks you to review relationships and expectations around " + area + ".");
            case "Mars" -> house == null
                    ? t(english, "Mars retrosu acele çıkışları değil, enerjiyi planlı kullanmayı istiyor.", "Mars retrograde favors planned energy over rushed reactions.")
                    : t(english, "Mars retrosu " + area + " tarafında enerjiyi aceleye değil plana vermeni istiyor.", "Mars retrograde asks you to direct energy toward planning rather than rushing in " + area + ".");
            case "Jupiter" -> house == null
                    ? t(english, "Jüpiter retrosu büyüme planlarını aceleyle değil, yeniden değerlendirmeyle netleştirir.", "Jupiter retrograde clarifies growth plans through review rather than haste.")
                    : t(english, "Jüpiter retrosu " + area + " alanında büyük resmi yeniden tartmanı istiyor.", "Jupiter retrograde asks you to reconsider the bigger picture around " + area + ".");
            case "Saturn" -> house == null
                    ? t(english, "Satürn retrosu sorumlulukları yeniden yapılandırmayı ve eksikleri sabırla toplamayı ister.", "Saturn retrograde asks you to rebuild responsibilities and gather loose ends with patience.")
                    : t(english, "Satürn retrosu " + area + " alanında sorumlulukları daha sağlam kurgulamanı istiyor.", "Saturn retrograde asks you to structure responsibilities more solidly around " + area + ".");
            default -> house == null
                    ? t(english, "Bu retro ilgili konuda daha yavaş, dikkatli ve bilinçli ilerlemeni önerir.", "This retrograde suggests moving more slowly, carefully, and consciously in the related area.")
                    : t(english, "Bu retro " + area + " tarafında daha yavaş, dikkatli ve bilinçli ilerlemeni önerir.", "This retrograde suggests moving more slowly, carefully, and consciously around " + area + ".");
        };
        String risk = retroRiskLevel(position.planet(), house);
        return new DailyTransitsDTO.RetrogradeItem(planet, meaning, risk);
    }

    private List<ActionTemplate> buildActionTemplates(DailyTransitsDTO dto, boolean english) {
        List<ActionTemplate> templates = new ArrayList<>();
        List<DailyTransitsDTO.TransitItem> related = dto.transits() == null ? List.of() : dto.transits();
        for (int i = 0; i < Math.min(4, related.size()); i++) {
            DailyTransitsDTO.TransitItem item = related.get(i);
            List<String> relatedIds = List.of(item.id());
            String task = firstNonBlank(item.action(), actionHint(item.theme(), item.label(), houseOf(item), english));
            String caution = firstNonBlank(item.avoid(), avoidHint(item.theme(), item.label(), houseOf(item), english));
            String detail = clamp(item.theme() + " • " + task + " " + caution, 120);
            templates.add(new ActionTemplate(
                    "action-insight-" + (i + 1),
                    toActionTitle(task),
                    detail,
                    iconForTheme(item.theme()),
                    actionTagFromStatus(item.label(), english),
                    etaFromImportance(item.importance()),
                    relatedIds
            ));
        }

        if (templates.size() < 4 && dto.retrogrades() != null) {
            int retroIndex = 0;
            for (DailyTransitsDTO.RetrogradeItem retro : dto.retrogrades()) {
                if (templates.size() >= 4) {
                    break;
                }
                retroIndex += 1;
                templates.add(new ActionTemplate(
                        "action-retro-" + retroIndex,
                        clamp(english ? "Prepare a checklist for " + retro.planet() + " retrograde." : retro.planet() + " retrosu için kontrol listesi hazırla.", 80),
                        clamp(retro.meaningPlain(), 120),
                        "repeat",
                        english ? "Bold" : "Planlı",
                        6,
                        related.stream().limit(2).map(DailyTransitsDTO.TransitItem::id).toList()
                ));
            }
        }

        if (templates.size() < 5) {
            List<String> relatedIds = related.stream().limit(2).map(DailyTransitsDTO.TransitItem::id).toList();
            templates.add(new ActionTemplate(
                    "action-evening-check",
                    t(english, "Akşam için 1 mini plan yaz.", "Write 1 mini plan for tonight."),
                    t(english, "Yarın için tek bir öncelik belirleyip not alman yeterli.", "Naming one priority for tomorrow and writing it down is enough."),
                    "checkmark-done",
                    t(english, "Kolay", "Easy"),
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
        return natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc(String.valueOf(userId)).orElse(null);
    }

    private String buildCacheVersion(NatalChart chart, String profileVersion, String locale) {
        String locationVersion;
        if (chart == null || chart.getLatitude() == null || chart.getLongitude() == null) {
            locationVersion = "na";
        } else {
            locationVersion = round(chart.getLatitude(), 3) + ":" + round(chart.getLongitude(), 3);
        }
        // Cache lookup key DB'de VARCHAR(64); raw profile signature zamanla bu limiti asabiliyor.
        String rawVersion = locationVersion
                + "|pv:" + firstNonBlank(profileVersion, "na")
                + "|locale:" + normalizeLocale(locale)
                + "|iv:" + INSIGHT_ENGINE_VERSION;
        return DAILY_TRANSITS_CACHE_KEY_PREFIX + sha256Base64Url(rawVersion);
    }

    private String sha256Base64Url(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(firstNonBlank(value, "na").getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 kullanılamadı.", e);
        }
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
        String signHint = buildSignSignature(chart, false);

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

    private String normalizeLocale(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("en") ? "en" : "tr";
    }

    private boolean isEnglishLocale(String locale) {
        return "en".equals(normalizeLocale(locale));
    }

    private String t(boolean english, String tr, String en) {
        return english ? en : tr;
    }

    private String canonicalTheme(String theme) {
        String token = normalizeToken(theme);
        if (token.contains("iletisim") || token.contains("communication")) return "communication";
        if (token.contains("ask") || token.contains("love") || token.contains("relationship")) return "love";
        if (token.equals("is") || token.contains("work") || token.contains("career")) return "work";
        if (token.contains("enerji") || token.contains("energy")) return "energy";
        return "mood";
    }

    private String localizeThemeKey(String canonicalTheme, boolean english) {
        return switch (canonicalTheme) {
            case "communication" -> t(english, "İletişim", "Communication");
            case "love" -> t(english, "Aşk", "Love");
            case "work" -> t(english, "İş", "Work");
            case "energy" -> t(english, "Enerji", "Energy");
            default -> t(english, "Ruh Hali", "Mood");
        };
    }

    private String canonicalMoodTag(String moodTag) {
        String token = normalizeToken(moodTag);
        if (token.contains("odak") || token.contains("focus")) return "focus";
        if (token.contains("sosyal") || token.contains("social")) return "social";
        if (token.contains("cesur") || token.contains("bold")) return "bold";
        if (token.contains("duygusal") || token.contains("emotional")) return "emotional";
        return "calm";
    }

    private String localizeMoodTag(String canonicalMoodTag, boolean english) {
        return switch (canonicalMoodTag) {
            case "focus" -> t(english, "Odak", "Focus");
            case "social" -> t(english, "Sosyal", "Social");
            case "bold" -> t(english, "Cesur", "Bold");
            case "emotional" -> t(english, "Duygusal", "Emotional");
            default -> t(english, "Sakin", "Calm");
        };
    }

    private boolean isHouseTransitAspect(String aspect) {
        String token = normalizeToken(aspect);
        return "evgecisi".equals(token) || "housetransit".equals(token);
    }

    private String translateMoonPhase(String phase, boolean english) {
        if (!english) return firstNonBlank(phase, "Yeni Ay");
        return switch (firstNonBlank(phase, "Yeni Ay")) {
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

    private String cleanPlanet(String value) {
        if (value == null) return "";
        return value.replace("T-", "").replace("N-", "").trim();
    }

    private String translatePlanet(String english, boolean englishLocale) {
        return englishLocale ? PLANET_EN.getOrDefault(english, english) : PLANET_TR.getOrDefault(english, english);
    }

    private String translateSign(String english, boolean englishLocale) {
        return englishLocale ? english : SIGN_TR.getOrDefault(english, english);
    }

    private String themeForPlanet(String transitPlanet, boolean english) {
        return switch (transitPlanet) {
            case "Mercury" -> localizeThemeKey("communication", english);
            case "Venus" -> localizeThemeKey("love", english);
            case "Jupiter", "Saturn", "Sun" -> localizeThemeKey("work", english);
            case "Mars" -> localizeThemeKey("energy", english);
            default -> localizeThemeKey("mood", english);
        };
    }

    private boolean isSupportive(PlanetaryAspect aspect, String transitPlanet) {
        return switch (aspect.type()) {
            case TRINE, SEXTILE -> true;
            case QUINCUNX, SQUARE, OPPOSITION -> false;
            case CONJUNCTION -> BENEFIC_PLANETS.contains(transitPlanet);
        };
    }

    private String supportiveImpact(String theme, String planet, String house, String variationKey, boolean english) {
        List<String> options = switch (canonicalTheme(theme)) {
            case "communication" -> english
                    ? List.of(
                            "Conversations can flow well; a short message to the right person may bring a quick response.",
                            "Clear sentences bring faster results; a short conversation may make work easier.",
                            "The flow supports new connections; open and simple communication is an advantage."
                    )
                    : List.of(
                            "Konuşmalar akıcı olur; doğru kişiye yazacağın kısa mesaj hızlı dönüş getirebilir.",
                            "Net cümleler hızlı sonuç verir; kısa bir görüşme işini kolaylaştırabilir.",
                            "Yeni temaslar için uygun bir akış var; açık ve sade iletişim avantaj sağlar."
                    );
            case "love" -> english
                    ? List.of(
                            "Small gestures support your relationship; being clear without being sharp is enough.",
                            "Empathy strengthens the bond; a calm conversation can reduce distance.",
                            "There is a warm tone in relationships; staying sincere without exaggeration helps."
                    )
                    : List.of(
                            "Küçük jestler ilişkine iyi gelir; kırıcı olmadan net kalman yeterli olur.",
                            "Empati kurduğunda bağ güçlenir; sakin bir konuşma uzaklığı azaltabilir.",
                            "İlişkilerde sıcak bir zemin var; abartmadan samimi kalmak olumlu ilerletir."
                    );
            case "work" -> english
                    ? List.of(
                            "If you sort priorities well, you can recover your workflow faster than expected.",
                            "Starting with a clear plan reduces scatter and lifts productivity during the day.",
                            "Working in time blocks will bring better results today."
                    )
                    : List.of(
                            "Önceliklerini doğru sıralarsan işlerini beklediğinden daha hızlı toparlayabilirsin.",
                            "Net bir planla başladığında dağınıklık azalır; verim gün içinde yükselir.",
                            "Zaman bloklarıyla ilerlemek bugün daha çok sonuç getirir."
                    );
            case "energy" -> english
                    ? List.of(
                            "Movement can raise motivation; a short walk may clear your mind.",
                            "Your physical rhythm is rising; short breaks help you sustain it.",
                            "The day's energy is climbing; a short activity can strengthen focus."
                    )
                    : List.of(
                            "Hareket etmek motivasyonunu artırır; kısa bir yürüyüş zihnini açar.",
                            "Bedensel ritim yükseliyor; küçük molalarla bu akışı daha iyi korursun.",
                            "Günün enerjisi artıyor; kısa bir aktivite odaklanmanı güçlendirir."
                    );
            default -> english
                    ? List.of(
                            translatePlanet(planet, true) + " strengthens intuition, making your inner voice easier to hear today.",
                            "The emotional ground is softer; staying calm helps decisions become clearer.",
                            "Your mental flow is more orderly, so small steps can move things safely forward."
                    )
                    : List.of(
                            translatePlanet(planet, false) + " etkisi sezgini güçlendirir; gün içinde iç sesini duyman kolaylaşır.",
                            "Duygusal zeminde yumuşama var; sakin kaldığında kararların netleşir.",
                            "Zihinsel akış daha düzenli; küçük adımlarla güvenli biçimde ilerleyebilirsin."
                    );
        };
        return pickVariant(options, variationKey + "|impact");
    }

    private String cautionImpact(String theme, String planet, String house, String variationKey, boolean english) {
        List<String> options = switch (canonicalTheme(theme)) {
            case "communication" -> english
                    ? List.of(
                            "Misunderstandings are possible, so review messages once before sending.",
                            "Rushed replies can create tension; a short pause protects communication.",
                            "Tone can harden quickly, so a clear but soft style works better."
                    )
                    : List.of(
                            "Yanlış anlaşılmalar olabilir; mesajları göndermeden önce bir kez daha kontrol et.",
                            "Acele cevaplar gerilim yaratabilir; kısa bir duraklama iletişimi korur.",
                            "İletişimde ton kolay sertleşebilir; net ama yumuşak bir dil daha iyi sonuç verir."
                    );
            case "love" -> english
                    ? List.of(
                            "Emotional reactions may intensify; listening before responding will work better.",
                            "Sensitivity can rise in relationships; avoiding cutting words keeps balance.",
                            "Expectations can climb quickly, so keeping the conversation open and calm is safer."
                    )
                    : List.of(
                            "Duygusal tepkiler büyüyebilir; önce dinleyip sonra yanıt vermek daha iyi sonuç verir.",
                            "İlişkilerde hassasiyet artabilir; kırıcı cümlelerden kaçınmak dengeyi korur.",
                            "Beklentiler çabuk yükseliyor; konuşmayı açık ve sakin tutmak daha güvenli olur."
                    );
            case "work" -> english
                    ? List.of(
                            "The calendar may tighten, so focusing on one task and sequencing the rest reduces stress.",
                            "Opening too many threads at once can drain you; a one-task approach may save the day.",
                            "Workflow can slow down; moving with a priority list increases your sense of control."
                    )
                    : List.of(
                            "Takvimde sıkışma olabilir; tek işe odaklanıp kalanını sıralamak stresi azaltır.",
                            "Aynı anda çok başlık açmak yorabilir; tek görev yaklaşımı bugünü kurtarır.",
                            "İş akışı gecikebilir; öncelik listesiyle ilerlemek kontrol duygusunu artırır."
                    );
            case "energy" -> english
                    ? List.of(
                            "Fatigue may accumulate, so taking short breaks protects performance.",
                            "Energy may fluctuate, so spreading pace through the day works better.",
                            "Starting fast is easy but sustaining it may be hard; build your rhythm in stages."
                    )
                    : List.of(
                            "Yorgunluk birikebilir; küçük molalar vermek performansını korur.",
                            "Enerji dalgalanması yaşayabilirsin; tempoyu gün içine yaymak daha doğru olur.",
                            "Hızlı başlamak kolay, sürdürmek zor olabilir; ritmini aşama aşama kur."
                    );
            default -> english
                    ? List.of(
                            translatePlanet(planet, true) + " may create emotional fluctuations, so avoid rushing decisions.",
                            "Emotional reactions may rise; a short review break will be healthier.",
                            "Your inner voice may feel mixed, so giving decisions more time can help."
                    )
                    : List.of(
                            translatePlanet(planet, false) + " etkisi duygusal dalgalanma yaratabilir; kararlarını aceleye getirme.",
                            "Duygusal tepkiler artabilir; kısa bir değerlendirme arası daha sağlıklı olur.",
                            "İç sesin karışabilir; netlik için kararlarını zamana yayman faydalı olur."
                    );
        };
        return pickVariant(options, variationKey + "|impact");
    }

    private int computeImportance(
            PlanetaryAspect aspect,
            String house,
            boolean isRetrograde,
            String transitPlanet,
            String natalPoint,
            UserAstroProfile userProfile
    ) {
        double orbAllowance = Math.max(aspect.type().getOrbAllowance(), 1.0);
        double tightness = 1.0 - Math.min(Math.max(aspect.orb(), 0), orbAllowance) / orbAllowance;
        int orbScore = clampInt((int) Math.round(tightness * 20), 0, 20);
        int score = 12
                + aspectStrengthWeight(aspect.type())
                + orbScore
                + houseWeight(house)
                + transitPlanetWeight(transitPlanet)
                + natalPointWeight(natalPoint)
                + dominantPlanetBonus(userProfile, transitPlanet)
                + sensitiveHouseBonus(userProfile, house)
                + (isRetrograde ? 2 : 0);
        return clampInt(score, 42, 97);
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

    private int computeHouseTransitImportance(
            String transitPlanet,
            String house,
            boolean retrograde,
            UserAstroProfile userProfile
    ) {
        int score = 42
                + houseWeight(house)
                + transitPlanetWeight(transitPlanet)
                + dominantPlanetBonus(userProfile, transitPlanet)
                + sensitiveHouseBonus(userProfile, house)
                + (retrograde ? 2 : 0);
        return clampInt(score, 46, 84);
    }

    private int aspectStrengthWeight(PlanetaryAspect.AspectType type) {
        return switch (type) {
            case CONJUNCTION -> 18;
            case OPPOSITION -> 17;
            case SQUARE -> 16;
            case TRINE -> 14;
            case SEXTILE -> 12;
            case QUINCUNX -> 8;
        };
    }

    private int transitPlanetWeight(String transitPlanet) {
        return switch (cleanPlanet(transitPlanet)) {
            case "Mercury", "Venus", "Mars", "Saturn", "Jupiter" -> 8;
            case "Sun" -> 7;
            case "Moon" -> 6;
            default -> 4;
        };
    }

    private int natalPointWeight(String natalPoint) {
        return switch (cleanPlanet(natalPoint)) {
            case "Sun", "Moon" -> 8;
            case "Mercury", "Venus", "Mars" -> 7;
            case "Jupiter", "Saturn" -> 6;
            default -> 4;
        };
    }

    private int houseWeight(String house) {
        return switch (house == null ? "" : house) {
            case "1", "4", "7", "10" -> 6;
            case "2", "5", "8", "11" -> 4;
            case "3", "6", "9", "12" -> 2;
            default -> 0;
        };
    }

    private boolean isCautionLabel(String label) {
        String normalized = normalizeToken(label);
        return normalized.contains("dikkat") || normalized.contains("hassas") || normalized.contains("caution");
    }

    private String translateAspect(PlanetaryAspect.AspectType type, boolean english) {
        if (type == null) return "";
        if (!english) return type.getTurkishName();
        return switch (type) {
            case CONJUNCTION -> "Conjunction";
            case SEXTILE -> "Sextile";
            case SQUARE -> "Square";
            case TRINE -> "Trine";
            case QUINCUNX -> "Quincunx";
            case OPPOSITION -> "Opposition";
        };
    }

    private String relevanceFromImportance(int importance, boolean english) {
        if (importance >= 82) return t(english, "Yüksek", "High");
        if (importance >= 64) return t(english, "Orta", "Medium");
        return t(english, "Düşük", "Low");
    }

    private String reasonFrom(
            String theme,
            String house,
            boolean supportive,
            String transitPlanet,
            UserAstroProfile userProfile,
            boolean english) {
        String area = houseAreaText(house, english);
        String areaClause = (house != null && !house.isBlank())
                ? (supportive
                        ? t(english, area + " konusunda iyi bir pencere açılıyor.", "A useful window is opening around " + area + ".")
                        : t(english, area + " konusunda ölçülü ilerlemek faydalı olur.", "Measured progress will help around " + area + "."))
                : (supportive
                        ? t(english, "Küçük ve net adımlar akışı korur.", "Small and clear steps protect the flow.")
                        : t(english, "Acele karar yerine kısa bir kontrol yapman faydalı olur.", "A quick review is better than a rushed decision."));
        String base = supportive
                ? t(english, "Bu temada destekleyici bir akış var.", "There is a supportive flow in this theme.")
                : t(english, "Bu temada gün içinde dikkatli bir adım gerekiyor.", "This theme calls for a careful move today.");
        return base + " " + areaClause;
    }

    private String buildTechnicalReason(
            String transitPlanet,
            String natalPoint,
            String aspect,
            double orb,
            String house,
            boolean english
    ) {
        if (isHouseTransitAspect(aspect)) {
            return transitPlanet + " • " + natalPoint + " • " + aspect;
        }
        String houseText = (house == null || house.isBlank())
                ? t(english, "ev-bilgisi yok", "no house data")
                : (english ? "house " + house : "ev " + house);
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

    private String pickVariant(List<String> options, String key) {
        if (options == null || options.isEmpty()) {
            return "";
        }
        int index = Math.abs(key.hashCode()) % options.size();
        return options.get(index);
    }

    private String moodTagFromTheme(String theme, int retroCount, boolean english) {
        if (retroCount >= 2) return localizeMoodTag("focus", english);
        return switch (canonicalTheme(theme)) {
            case "communication", "love" -> localizeMoodTag("social", english);
            case "work" -> localizeMoodTag("focus", english);
            case "energy" -> localizeMoodTag("bold", english);
            default -> localizeMoodTag("emotional", english);
        };
    }

    /**
     * Concrete per-transit suggestion.
     *
     * The house is part of the key on purpose: the previous version keyed on theme alone, so
     * every "Ruh Hali" transit rendered the same sentence and the screen showed the identical
     * advice two or three times. Keying on the affected house means two transits only collide
     * when they genuinely land in the same life area.
     */
    private String actionHint(String theme, String label, String house, boolean english) {
        boolean caution = isCautionLabel(label) || normalizeToken(label).contains("hassas");
        return switch (house == null ? "" : house.trim()) {
            case "1" -> caution
                    ? t(english, "Bugün verdiğiniz bir cevabı ikinci kez açıklamak zorunda hissetmeyin; ilk cümlenizi tekrar edin.", "Do not feel obliged to explain an answer twice today; repeat your first sentence.")
                    : t(english, "Rahatsız olduğunuz bir durumu tek cümlede söyleyin: neyin uymadığını ve neyi tercih ettiğinizi.", "Say what does not sit well in one sentence: what is not working, and what you would prefer.");
            case "2" -> caution
                    ? t(english, "Sözlü konuşulan bir tutarı işleme koymadan önce yazılı teyidini isteyin.", "Ask for written confirmation of a verbally discussed amount before acting on it.")
                    : t(english, "Bir ödeme veya aboneliğin iptal ve yenileme maddesini bugün okuyun.", "Read the cancellation and renewal clause of a payment or subscription today.");
            case "3" -> caution
                    ? t(english, "İkinci elden duyduğunuz bir bilgiyi iletmeden önce kaynağına doğrulatın.", "Verify second-hand information with its source before passing it on.")
                    : t(english, "Önemli bir mesajda ne istediğinizi ilk cümlede yazın; açıklamayı arkaya bırakın.", "Put your ask in the first sentence of an important message and leave the explanation after it.");
            case "4" -> caution
                    ? t(english, "İki aile üyesi arasında mesaj taşımak yerine doğrudan konuşmalarını önerin.", "Suggest two family members speak directly instead of carrying messages between them.")
                    : t(english, "Bir aile üyesine somut yardım önerin: hangi işi, ne zaman devralacağınızı söyleyin.", "Offer a family member concrete help: name the task and when you will take it on.");
            case "5" -> caution
                    ? t(english, "İlk halinden memnun olduğunuz bir işi hemen paylaşmayın; akşam tekrar okuyun.", "Do not share work you like on first draft; reread it in the evening.")
                    : t(english, "Aklınıza gelen fikri düzeltmeden yazın; düzenlemeyi yarına bırakın.", "Write the idea down as it arrives and leave editing to tomorrow.");
            case "6" -> caution
                    ? t(english, "Yorgunluk sinyalini ertelediğiniz anı fark edin ve o anda ne yaptığınızı not edin.", "Notice when you postpone a tiredness signal and write down what you were doing.")
                    : t(english, "Bugünkü molanızın saatini önceden yazın; \"fırsat bulunca\" bırakmayın.", "Write down the time of today's break instead of leaving it to \"when I get a chance\".");
            case "7" -> caution
                    ? t(english, "Kısa ya da geç gelen bir mesajı yorumlamadan önce ne kastedildiğini sorun.", "Ask what was meant before interpreting a short or delayed message.")
                    : t(english, "Yakın birine takdir ettiğiniz somut bir davranışı tek örnekle söyleyin.", "Tell someone close one specific thing they did that you valued.");
            case "8" -> caution
                    ? t(english, "Süreli denen bir teklife anında karar vermeyin; yarın da geçerli mi diye sorun.", "Do not decide immediately on a \"limited time\" offer; ask whether it still stands tomorrow.")
                    : t(english, "Paylaşılan bir masrafta kimin neyi üstlendiğini bugün rakamla yazın.", "Write down with numbers who covers what in a shared cost today.");
            case "9" -> caution
                    ? t(english, "Karardan önce hâlâ bilmediğiniz tek bilgiyi belirleyin ve onu sorun.", "Identify the one fact you still do not have before deciding, and go ask for it.")
                    : t(english, "Vereceğiniz kararın hangi koşulda doğru sayılacağını karardan önce yazın.", "Write down the condition that would make your decision the right one, before you make it.");
            case "10" -> caution
                    ? t(english, "Size sunulan bir koşula aynı konuşmada cevap vermeyin; yazılı halini isteyin.", "Do not answer a condition put to you in the same conversation; ask for it in writing.")
                    : t(english, "Yeni bir sorumluluğu kabul etmeden önce teslim zamanını ve beklenen sonucu netleştirin.", "Clarify the delivery time and expected outcome before accepting a new responsibility.");
            case "11" -> caution
                    ? t(english, "Grup sohbetinde konuşmanın tamamını okumadan cevap yazmayın.", "Do not reply in a group thread before reading the whole conversation.")
                    : t(english, "Gelen bir davete \"belki\" demek yerine net bir evet veya hayır verin.", "Give a clear yes or no to an invitation instead of \"maybe\".");
            case "12" -> caution
                    ? t(english, "Yoğunlukta yazdığınız mesajı taslakta bırakın ve akşam yeniden okuyun.", "Leave a message written under intensity in drafts and reread it in the evening.")
                    : t(english, "Hissettiğiniz şeyi \"iyi\" veya \"kötü\" yerine tek ve kesin bir kelimeyle yazın.", "Write what you feel with one precise word instead of \"good\" or \"bad\".");
            default -> actionHintByTheme(theme, caution, english);
        };
    }

    private String houseOf(DailyTransitsDTO.TransitItem item) {
        return item != null && item.technical() != null ? item.technical().house() : null;
    }

    /** Used only when no house is known (missing birth time), keyed on the transiting theme. */
    private String actionHintByTheme(String theme, boolean caution, boolean english) {
        return switch (canonicalTheme(theme)) {
            case "communication" -> caution
                    ? t(english, "Konuşulan bir tarihin \"bu hafta\" gibi belirsiz kalmasına izin vermeyin; net günü teyit edin.", "Do not let a discussed date stay vague like \"this week\"; confirm the exact day.")
                    : t(english, "Cevapsız kalmış bir konuyu tek soruyla açın: hangi noktada kaldığını sorun.", "Reopen a thread that went quiet with one question: ask which point it stalled at.");
            case "love" -> caution
                    ? t(english, "Bir gerginlikte geçmiş örnekleri sıralamak yerine bugünkü tek davranışı adlandırın.", "In a tense moment, name today's single behaviour instead of listing past examples.")
                    : t(english, "Karşınızdakinin ne beklediğini tahmin etmek yerine doğrudan sorun.", "Ask directly what the other person expects instead of guessing.");
            case "work" -> caution
                    ? t(english, "İstenen bir teslim tarihine anında evet demeyin; mevcut yükünüzü gözden geçirip akşam cevap verin.", "Do not say yes to a requested deadline immediately; review your load and answer in the evening.")
                    : t(english, "Listenizde en uzun süredir açık duran maddeyi bugün kapatın.", "Close the item that has been open longest on your list today.");
            case "energy" -> caution
                    ? t(english, "Geç saatte yeni bir işe başlamak yerine başlangıcını yarın sabaha yazın.", "Rather than starting something new late, schedule its start for tomorrow morning.")
                    : t(english, "Listenizden bir maddeyi bilinçli olarak yarına taşıyın ve bunu not edin.", "Deliberately move one item to tomorrow and write that down.");
            default -> caution
                    ? t(english, "Bugünkü ruh halinizden yola çıkarak bir durum hakkında genel sonuç yazmayın.", "Do not draw a general conclusion about a situation from today's mood.")
                    : t(english, "Size iyi gelecek şeyi bir kişiye somut olarak söyleyin: dinlemesini mi, fikir vermesini mi istiyorsunuz?", "Tell one person concretely what would help: do you want them to listen, or to give an opinion?");
        };
    }

    /** Concrete risk to watch, keyed on the affected house for the same anti-duplication reason. */
    private String avoidHint(String theme, String label, String house, boolean english) {
        boolean caution = isCautionLabel(label) || normalizeToken(label).contains("hassas");
        return switch (house == null ? "" : house.trim()) {
            case "1" -> t(english, "Verdiğiniz bir karar yeniden tartışmaya açılırsa gerekçe eklemek yerine kararı aynen tekrar edin.", "If a decision of yours is reopened, repeat it as-is rather than adding justification.");
            case "2", "8" -> t(english, "Bir tutarı veya koşulu hiçbir yere yazmadan sözlü olarak bırakmaktan kaçının.", "Avoid leaving an amount or condition purely verbal and unwritten.");
            case "3" -> t(english, "Eksik bir mesajı tamamlanmış gibi okuyup cevap yazmaktan kaçının.", "Avoid replying to an incomplete message as if it were complete.");
            case "4" -> t(english, "Başkalarının konusunu onlar adına taşıma rolüne geçmekten kaçının.", "Avoid slipping into the role of carrying other people's issue for them.");
            case "5" -> t(english, "Erken bir yoruma dayanarak işin tamamını değiştirmekten kaçının.", "Avoid rewriting the whole piece based on early feedback.");
            case "6", "12" -> t(english, "Açılan boş zamanı hemen yeni bir işle doldurmaktan kaçının.", "Avoid immediately filling freed-up time with new work.");
            case "7" -> t(english, "Gelen kısa bir cevabı ilgisizlik olarak yorumlamaktan kaçının.", "Avoid reading a short reply as disinterest.");
            case "9" -> t(english, "Geri dönülemez bir kararı kontrol etmeden vermekten kaçının.", "Avoid making an irreversible decision without checking that it is irreversible.");
            case "10" -> t(english, "Kapsamı belirsiz bir sorumluluğu yazılı netleştirmeden üstlenmekten kaçının.", "Avoid taking on a responsibility whose scope was never put in writing.");
            case "11" -> t(english, "Grup içinde eksik bağlamla cevap vermekten kaçının.", "Avoid replying in a group with only partial context.");
            default -> caution
                    ? t(english, "Duygusal yoğunluk anında yazılan bir mesajı aynı gün göndermekten kaçının.", "Avoid sending a message written in a moment of emotional intensity the same day.")
                    : t(english, "Birbirine bağlı görünen iki kararı aynı anda vermekten kaçının.", "Avoid making two seemingly linked decisions at the same time.");
        };
    }

    private String iconForTheme(String theme) {
        return switch (canonicalTheme(theme)) {
            case "communication" -> "chatbubble-ellipses";
            case "love" -> "heart";
            case "work" -> "briefcase";
            case "energy" -> "walk";
            default -> "sparkles";
        };
    }

    private String actionTagFromStatus(String status, boolean english) {
        if (isCautionLabel(status) || normalizeToken(status).contains("hassas")) {
            return t(english, "Cesur", "Bold");
        }
        if (normalizeToken(status).contains("destekleyici") || normalizeToken(status).contains("supportive")) {
            return t(english, "Cesur", "Bold");
        }
        return t(english, "Kolay", "Easy");
    }

    private Integer etaFromImportance(int importance) {
        if (importance >= 82) return 12;
        if (importance >= 68) return 8;
        return 5;
    }

    private String resolveHouseForTransit(PlanetPosition transitPosition, List<HousePlacement> natalHouses) {
        if (transitPosition == null || natalHouses == null || natalHouses.isEmpty()) {
            return null;
        }
        return String.valueOf(transitCalculator.getTransitHouse(transitPosition, natalHouses));
    }

    private String resolveHouseForTransit(String transitPlanet, List<PlanetPosition> transitPositions, List<HousePlacement> natalHouses) {
        if (natalHouses == null || natalHouses.isEmpty()) {
            return null;
        }
        return transitPositions.stream()
                .filter(p -> transitPlanet.equalsIgnoreCase(p.planet()))
                .findFirst()
                .map(p -> resolveHouseForTransit(p, natalHouses))
                .orElse(null);
    }

    private String houseText(String house) {
        return house == null || house.isBlank() ? "related house" : house + ". house";
    }

    private String houseAreaText(String house, boolean english) {
        return switch (house == null ? "" : house) {
            case "1" -> t(english, "kişisel duruşun", "personal stance");
            case "2" -> t(english, "maddi güvenlik ve kaynakların", "material security and resources");
            case "3" -> t(english, "yakın çevre ve iletişimin", "nearby connections and communication");
            case "4" -> t(english, "ev, aile ve iç huzurun", "home, family, and inner calm");
            case "5" -> t(english, "yaratıcılık, keyif ve romantizm", "creativity, pleasure, and romance");
            case "6" -> t(english, "günlük düzenin ve sağlık ritmin", "daily rhythm and health routines");
            case "7" -> t(english, "ilişkiler ve ortaklıkların", "relationships and partnerships");
            case "8" -> t(english, "paylaşımlar, sınırlar ve derin duygular", "shared matters, boundaries, and deep emotions");
            case "9" -> t(english, "inançlar, eğitim ve ufuk genişletme", "beliefs, education, and widening horizons");
            case "10" -> t(english, "kariyer, hedefler ve görünürlüğün", "career, goals, and visibility");
            case "11" -> t(english, "sosyal çevre ve gelecek planların", "social circle and future plans");
            case "12" -> t(english, "dinlenme, geri çekilme ve bilinçaltın", "rest, retreat, and the subconscious");
            default -> t(english, "ilgili yaşam alanın", "the related life area");
        };
    }

    private String houseAreaShortText(String house, boolean english) {
        return switch (house == null ? "" : house) {
            case "1" -> t(english, "kişisel duruş", "personal stance");
            case "2" -> t(english, "maddi alan", "material matters");
            case "3" -> t(english, "iletişim", "communication");
            case "4" -> t(english, "ev ve aile", "home and family");
            case "5" -> t(english, "yaratıcılık", "creativity");
            case "6" -> t(english, "günlük düzen", "daily routine");
            case "7" -> t(english, "ilişkiler", "relationships");
            case "8" -> t(english, "paylaşım ve dönüşüm", "sharing and transformation");
            case "9" -> t(english, "ufuk ve inanç", "horizons and belief");
            case "10" -> t(english, "kariyer", "career");
            case "11" -> t(english, "sosyal çevre", "social circle");
            case "12" -> t(english, "dinlenme ve içe çekilme", "rest and retreat");
            default -> t(english, "günlük akış", "daily flow");
        };
    }

    private String retroRiskLevel(String planet, String house) {
        boolean angular = Set.of("1", "4", "7", "10").contains(house);
        return switch (cleanPlanet(planet)) {
            case "Mars", "Saturn" -> angular ? "High" : "Med";
            case "Mercury" -> Set.of("3", "6", "9").contains(house) ? "High" : "Med";
            case "Venus", "Jupiter" -> angular ? "Med" : "Low";
            default -> "Low";
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
