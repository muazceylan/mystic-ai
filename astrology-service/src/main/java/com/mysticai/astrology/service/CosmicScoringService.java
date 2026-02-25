package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CosmicScoringService {

    private final DailyLifeGuideService dailyLifeGuideService;
    private final TransitCalculator transitCalculator;

    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyy-MM");

    public CosmicSummaryResponse getDailySummary(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        String normalizedLocale = normalizeLocale(locale);

        DayBundle bundle = buildDayBundle(userId, targetDate, normalizedLocale, userGender, maritalStatus);
        List<CosmicSummaryCard> focusCards = buildFocusCards(bundle.activities);

        return new CosmicSummaryResponse(
                userId,
                targetDate.toString(),
                normalizedLocale,
                bundle.dailyGuide,
                bundle.categoryScores,
                focusCards,
                LocalDateTime.now()
        );
    }

    public CosmicPlannerResponse getPlannerMonth(
            Long userId,
            String monthParam,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        String normalizedLocale = normalizeLocale(locale);
        YearMonth month = parseYearMonth(monthParam);

        List<CosmicPlannerDay> days = new ArrayList<>();
        Map<String, LinkedHashMap<String, CosmicLegendItem>> legends = new LinkedHashMap<>();

        for (int day = 1; day <= month.lengthOfMonth(); day++) {
            LocalDate date = month.atDay(day);
            DayBundle bundle = buildDayBundle(userId, date, normalizedLocale, userGender, maritalStatus);

            Map<String, List<CosmicPlannerSubcategoryDot>> dotsByCategory = new LinkedHashMap<>();
            Map<String, List<CosmicSubItem>> byCategory = bundle.activities.stream()
                    .collect(Collectors.groupingBy(CosmicSubItem::categoryKey, LinkedHashMap::new, Collectors.toList()));

            byCategory.forEach((categoryKey, items) -> {
                List<CosmicPlannerSubcategoryDot> dots = items.stream()
                        .sorted(Comparator.comparingInt(CosmicSubItem::score).reversed())
                        .map(item -> new CosmicPlannerSubcategoryDot(item.subCategoryKey(), item.label(), item.colorHex(), item.score()))
                        .toList();
                dotsByCategory.put(categoryKey, dots);

                LinkedHashMap<String, CosmicLegendItem> legendMap = legends.computeIfAbsent(categoryKey, key -> new LinkedHashMap<>());
                for (CosmicSubItem item : items) {
                    legendMap.putIfAbsent(item.subCategoryKey(), new CosmicLegendItem(item.subCategoryKey(), item.label(), item.colorHex()));
                }
            });

            int overall = bundle.categoryScores.isEmpty()
                    ? 5
                    : clamp(bundle.categoryScores.values().stream().mapToInt(Integer::intValue).sum() / bundle.categoryScores.size());

            days.add(new CosmicPlannerDay(date, overall, bundle.categoryScores, dotsByCategory));
        }

        Map<String, List<CosmicLegendItem>> legendResponse = new LinkedHashMap<>();
        legends.forEach((key, value) -> legendResponse.put(key, new ArrayList<>(value.values())));

        return new CosmicPlannerResponse(
                userId,
                month.format(YM),
                normalizedLocale,
                legendResponse,
                days,
                LocalDateTime.now()
        );
    }

    public CosmicDayDetailResponse getDayDetail(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        String normalizedLocale = normalizeLocale(locale);
        DayBundle bundle = buildDayBundle(userId, targetDate, normalizedLocale, userGender, maritalStatus);

        List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(targetDate);
        boolean mercuryRetrograde = transits.stream()
                .anyMatch(p -> "Mercury".equalsIgnoreCase(p.planet()) && p.retrograde());
        String moonPhaseRaw = transitCalculator.getMoonPhase(targetDate);
        boolean english = isEnglish(normalizedLocale);

        Map<String, CosmicCategoryDetail> categories = bundle.activities.stream()
                .collect(Collectors.groupingBy(CosmicSubItem::categoryKey, LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, List<CosmicSubItem>>>comparingInt(
                                entry -> clamp(bundle.categoryScores.getOrDefault(entry.getKey(), 5)))
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> buildCategoryDetail(
                                entry.getKey(),
                                entry.getValue(),
                                clamp(bundle.categoryScores.getOrDefault(entry.getKey(), 5)),
                                english
                        ),
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        return new CosmicDayDetailResponse(
                userId,
                targetDate,
                normalizedLocale,
                localizeMoonPhase(moonPhaseRaw, english),
                mercuryRetrograde,
                categories,
                LocalDateTime.now()
        );
    }

    public CosmicCategoryDetailsResponse getCategoryDetails(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus,
            String categoryKey
    ) {
        CosmicDayDetailResponse dayDetail = getDayDetail(userId, date, locale, userGender, maritalStatus);
        String normalizedKey = categoryKey == null ? "" : categoryKey.trim().toLowerCase(Locale.ROOT);
        CosmicCategoryDetail category = dayDetail.categories().entrySet().stream()
                .filter(entry -> entry.getKey() != null)
                .filter(entry -> entry.getKey().equalsIgnoreCase(normalizedKey))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown cosmic category: " + categoryKey));

        return new CosmicCategoryDetailsResponse(
                dayDetail.userId(),
                dayDetail.date(),
                dayDetail.locale(),
                category.categoryKey(),
                dayDetail.moonPhase(),
                dayDetail.mercuryRetrograde(),
                category,
                dayDetail.generatedAt()
        );
    }

    public int getActivityScore(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus,
            String categoryKey,
            String subCategoryKey
    ) {
        DayBundle bundle = buildDayBundle(userId, date, normalizeLocale(locale), userGender, maritalStatus);
        return bundle.activities.stream()
                .filter(item -> item.categoryKey().equalsIgnoreCase(categoryKey))
                .filter(item -> item.subCategoryKey().equalsIgnoreCase(subCategoryKey))
                .map(CosmicSubItem::score)
                .findFirst()
                .orElse(5);
    }

    private DayBundle buildDayBundle(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        DailyLifeGuideResponse dailyGuide = dailyLifeGuideService.getDailyGuide(
                new DailyLifeGuideRequest(userId, locale, userGender, maritalStatus, date)
        );

        List<CosmicSubItem> activities = new ArrayList<>();
        if (dailyGuide.activities() != null) {
            for (DailyLifeGuideActivity activity : dailyGuide.activities()) {
                String categoryKey = mapGroupToCategoryKey(activity.groupKey());
                if (categoryKey == null) continue;
                String subKey = mapActivityToSubKey(activity.activityKey());
                String color = resolveColor(categoryKey, subKey);
                activities.add(new CosmicSubItem(
                        categoryKey,
                        subKey,
                        activity.groupLabel(),
                        activity.activityKey(),
                        activity.activityLabel(),
                        clamp(activity.score()),
                        color,
                        activity.shortAdvice(),
                        activity.technicalExplanation(),
                        activity.insight(),
                        activity.triggerNotes() == null ? List.of() : activity.triggerNotes()
                ));
            }
        }

        addTransitAndMoonSyntheticItems(activities, dailyGuide, date, locale);
        addColorAndRecommendationSyntheticItems(activities, dailyGuide, date, locale);

        activities = activities.stream()
                .sorted(Comparator.comparingInt(CosmicSubItem::score).reversed()
                        .thenComparing(CosmicSubItem::categoryKey)
                        .thenComparing(CosmicSubItem::label))
                .toList();

        Map<String, Integer> unsortedCategoryScores = activities.stream()
                .collect(Collectors.groupingBy(CosmicSubItem::categoryKey, LinkedHashMap::new, Collectors.collectingAndThen(Collectors.toList(), list ->
                        clamp((int) Math.round(list.stream().mapToInt(CosmicSubItem::score).average().orElse(5)))
                )));
        Map<String, Integer> categoryScores = unsortedCategoryScores.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        return new DayBundle(dailyGuide, activities, categoryScores);
    }

    private void addTransitAndMoonSyntheticItems(
            List<CosmicSubItem> items,
            DailyLifeGuideResponse dailyGuide,
            LocalDate date,
            String locale
    ) {
        boolean english = isEnglish(locale);
        List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(date);
        long retroCount = transits.stream().filter(PlanetPosition::retrograde).count();
        String moonPhaseRaw = transitCalculator.getMoonPhase(date);
        String moonPhase = localizeMoonPhase(moonPhaseRaw, english);
        String moonSign = transits.stream()
                .filter(p -> "Moon".equalsIgnoreCase(p.planet()))
                .map(PlanetPosition::sign)
                .findFirst()
                .orElse("Cancer");
        int overall = dailyGuide.overallScore();

        int transitBase = clamp(55 + (overall - 50) / 2 - (int) retroCount * 6);
        int retroScore = clamp(82 - (int) retroCount * 18);
        int flowScore = clamp(transitBase + (retroCount == 0 ? 8 : -4));
        int cycleScore = clamp(50 + (overall >= 65 ? 12 : overall <= 40 ? -12 : 0));

        items.add(new CosmicSubItem(
                "transit", "retrogrades", t(english, "Transit", "Transit"), "TRANSIT_RETROGRADES",
                t(english, "Retrolar", "Retrogrades"), retroScore, resolveColor("transit", "retrogrades"),
                t(english, "Retro yoğunluğu bugünkü karar ritmini belirliyor.", "Retro density is shaping today's decision rhythm."),
                t(english, "Retro gezegen sayısı ve ritmi günün karar akışını etkiliyor.", "Retro planet density and rhythm are affecting the day's decision flow."),
                t(english, "Retro yoğun günlerde esneklik ve yeniden kontrol kazanım sağlar.", "On retro-heavy days, flexibility and rechecking creates advantage."),
                List.of(t(english, "Retro yoğunluğu", "Retro density"), t(english, "Zamanlama hassasiyeti", "Timing sensitivity"))
        ));
        items.add(new CosmicSubItem(
                "transit", "aspect_flow", t(english, "Transit", "Transit"), "TRANSIT_ASPECT_FLOW",
                t(english, "Açı Akışı", "Aspect Flow"), flowScore, resolveColor("transit", "aspect_flow"),
                t(english, "Uyumlu/sert açı dengesi günün akışını etkiliyor.", "The balance of supportive and tense aspects affects the flow of the day."),
                t(english, "Destekleyici ve zorlayıcı açıların dengesi akış kalitesini belirliyor.", "The balance of supportive and tense aspects sets the flow quality."),
                t(english, "Açı akışını izleyerek yoğun hamleleri doğru saate taşıyabilirsin.", "By reading aspect flow, you can move heavier actions to better timing windows."),
                List.of(t(english, "Açı yoğunluğu", "Aspect density"), t(english, "Akış dengesi", "Flow balance"))
        ));
        items.add(new CosmicSubItem(
                "transit", "cycles", t(english, "Transit", "Transit"), "TRANSIT_CYCLES",
                t(english, "Döngüler", "Cycles"), cycleScore, resolveColor("transit", "cycles"),
                t(english, "Gezegensel döngü temposu planlama kalitesini etkiler.", "Planetary cycle tempo affects planning quality."),
                t(english, "Devam eden transit döngüleri kararların sürdürülebilirliğini etkiler.", "Ongoing transit cycles affect the sustainability of decisions."),
                t(english, "Bugün kısa vadeli değil, döngü uyumlu adımlar daha verimli olabilir.", "Today, cycle-aligned steps may work better than short-term impulses."),
                List.of(t(english, "Döngü temposu", "Cycle tempo"), t(english, "Süreklilik", "Continuity"))
        ));

        int moonPhaseScore = clamp(scoreMoonPhase(moonPhaseRaw));
        int moonSignScore = clamp(scoreMoonSign(moonSign));
        int lunarRhythmScore = clamp((moonPhaseScore + moonSignScore + overall) / 3);

        items.add(new CosmicSubItem(
                "moon", "moon_phase", t(english, "Ay", "Moon"), "MOON_PHASE",
                t(english, "Ay Fazı", "Moon Phase"), moonPhaseScore, resolveColor("moon", "moon_phase"),
                t(english, "Bugünün ay fazı: ", "Today's moon phase: ") + moonPhase,
                t(english, "Ay fazı duygusal ritim ve başlangıç/bitiriş dengesini etkiler.", "Moon phase influences emotional rhythm and start/finish balance."),
                t(english, "Ay fazını dikkate almak zamanlama kalitesini yükseltir.", "Using the Moon phase can improve timing quality."),
                List.of(moonPhase)
        ));
        items.add(new CosmicSubItem(
                "moon", "moon_sign", t(english, "Ay", "Moon"), "MOON_SIGN",
                t(english, "Ay Burcu", "Moon Sign"), moonSignScore, resolveColor("moon", "moon_sign"),
                t(english, "Ay burcu vurgusu: ", "Moon sign emphasis: ") + (english ? moonSign : localizeSignTr(moonSign)),
                t(english, "Ay burcu günlük psikolojik tonu ve tepki hızını etkiler.", "Moon sign affects daily psychological tone and reactivity."),
                t(english, "Ay burcu vurgusu iletişim ve tempo tercihini şekillendirir.", "Moon sign emphasis shapes communication and pacing preferences."),
                List.of(t(english, "Ay burcu", "Moon sign") + ": " + (english ? moonSign : localizeSignTr(moonSign)))
        ));
        items.add(new CosmicSubItem(
                "moon", "lunar_rhythm", t(english, "Ay", "Moon"), "LUNAR_RHYTHM",
                t(english, "Ay Ritmi", "Lunar Rhythm"), lunarRhythmScore, resolveColor("moon", "lunar_rhythm"),
                t(english, "Ay ritmi duygusal tempo ve zamanlama üzerinde etkili.", "Lunar rhythm affects emotional tempo and timing."),
                t(english, "Ay ritmi gün içinde enerji dalgalanmasını yönetmede yardımcıdır.", "Lunar rhythm helps manage energy fluctuations through the day."),
                t(english, "Daha uyumlu saatleri seçmek genel akışı iyileştirir.", "Choosing more aligned hours improves the overall flow."),
                List.of(t(english, "Duygusal tempo", "Emotional tempo"), t(english, "Zamanlama", "Timing"))
        ));
    }

    private void addColorAndRecommendationSyntheticItems(
            List<CosmicSubItem> items,
            DailyLifeGuideResponse dailyGuide,
            LocalDate date,
            String locale
    ) {
        boolean english = isEnglish(locale);
        List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(date);
        String moonSign = transits.stream()
                .filter(p -> "Moon".equalsIgnoreCase(p.planet()))
                .map(PlanetPosition::sign)
                .findFirst()
                .orElse("Cancer");
        String moonPhaseRaw = transitCalculator.getMoonPhase(date);
        int overall = clamp(dailyGuide.overallScore());

        int green = clamp(overall + (moonSign.equalsIgnoreCase("Taurus") || moonSign.equalsIgnoreCase("Virgo") ? 6 : 0));
        int pink = clamp(overall - 4 + (moonPhaseRaw.contains("Dolunay") ? 5 : 0));
        int blue = clamp(overall - 2 + (moonSign.equalsIgnoreCase("Aquarius") || moonSign.equalsIgnoreCase("Gemini") ? 7 : 0));
        int yellow = clamp(overall - 3 + (moonSign.equalsIgnoreCase("Leo") || moonSign.equalsIgnoreCase("Sagittarius") ? 6 : 0));
        int purple = clamp(overall + (moonSign.equalsIgnoreCase("Pisces") || moonSign.equalsIgnoreCase("Scorpio") ? 8 : 2));

        items.add(new CosmicSubItem("color", "green", t(english, "Renk", "Color"), "COLOR_GREEN",
                t(english, "Yeşil", "Green"), green, "#16A34A",
                t(english, "Denge ve sakinlik için yeşil tonları destekleyici olabilir.", "Green tones can support balance and calm."),
                t(english, "Ay ritmi ve genel skor yeşil kullanımını destekliyor.", "The lunar rhythm and overall score support using green."),
                t(english, "Görüşme ve planlama anlarında yeşil tonlar denge hissi verebilir.", "Green tones may reinforce balance during meetings and planning."),
                List.of(t(english, "Renk frekansı", "Color frequency"), t(english, "Denge", "Balance"))));
        items.add(new CosmicSubItem("color", "pink", t(english, "Renk", "Color"), "COLOR_PINK",
                t(english, "Pembe", "Pink"), pink, "#EC4899",
                t(english, "Sosyal ve duygusal yumuşaklık için pembe tonlar uygun olabilir.", "Pink tones may support social and emotional softness."),
                t(english, "Venüsyen temalarda pembe tonlar daha uyumlu çalışabilir.", "Pink tones may work better in Venus-oriented themes."),
                t(english, "Nazik iletişim ve yakınlık kurmak istediğin anlarda tercih edilebilir.", "Useful when you want a gentler communication and closeness."),
                List.of(t(english, "Venüs teması", "Venus theme"))));
        items.add(new CosmicSubItem("color", "yellow", t(english, "Renk", "Color"), "COLOR_YELLOW",
                t(english, "Sarı", "Yellow"), yellow, "#EAB308",
                t(english, "Canlılık ve görünürlük için sarı dikkat çekici olabilir.", "Yellow can be attention-supportive for vitality and visibility."),
                t(english, "Bugünkü görünürlük ihtiyacı sarı tonlarını orta düzeyde destekliyor.", "Today's visibility needs support yellow tones at a moderate level."),
                t(english, "Sunum, sosyal görünürlük ve enerji artışı gereken anlarda tercih edilebilir.", "May be preferred for presentations and visibility-oriented moments."),
                List.of(t(english, "Görünürlük", "Visibility"))));
        items.add(new CosmicSubItem("color", "blue", t(english, "Renk", "Color"), "COLOR_BLUE",
                t(english, "Mavi", "Blue"), blue, "#3B82F6",
                t(english, "Zihinsel berraklık ve iletişim tonu için mavi destek olabilir.", "Blue can support mental clarity and communication tone."),
                t(english, "Merküryen akışlarda mavi tonlar odak ve düzen hissi verir.", "In Mercurial flows, blue tones support focus and order."),
                t(english, "İş, toplantı veya resmi iletişimlerde mavi daha dengeli bir seçim olabilir.", "Blue may be a balanced choice for work or formal communication."),
                List.of(t(english, "Zihinsel berraklık", "Mental clarity"))));
        items.add(new CosmicSubItem("color", "purple", t(english, "Renk", "Color"), "COLOR_PURPLE",
                t(english, "Mor", "Purple"), purple, "#9333EA",
                t(english, "Sezgisel ve ruhsal odaklarda mor tonlar daha uyumlu olabilir.", "Purple tones may feel more aligned for intuitive/spiritual focus."),
                t(english, "Neptünyen/Pisces temaları mor tonlarını destekleyebilir.", "Neptunian/Pisces themes can support purple tones."),
                t(english, "Meditasyon, dua veya içe dönüş anlarında mor tonlar eşlik edebilir.", "Purple can accompany meditation, prayer, and inward focus."),
                List.of(t(english, "Sezgisel odak", "Intuitive focus"))));

        int recBase = overall;
        items.add(new CosmicSubItem("recommendations", "timing", t(english, "Öneriler", "Recommendations"), "REC_TIMING",
                t(english, "Zamanlama", "Timing"), clamp(recBase + 2), "#22C55E",
                t(english, "Önemli adımları enerjinin daha sakin olduğu saatlere yay.", "Spread important steps into calmer energy windows."),
                t(english, "Gün içi tempo dalgalanması zamanlama kalitesini belirliyor.", "Intra-day tempo swings shape timing quality."),
                t(english, "Öncelikleri sıraya koyup zaman bloklarıyla ilerlemek bugünü iyileştirir.", "Priority ordering and time blocks improve the day."),
                List.of(t(english, "Zaman bloklama", "Time blocking"))));
        items.add(new CosmicSubItem("recommendations", "communication", t(english, "Öneriler", "Recommendations"), "REC_COMM",
                t(english, "İletişim", "Communication"), clamp(recBase - 3), "#3B82F6",
                t(english, "Mesajları kısa ve net tut; ikinci okumayla gönder.", "Keep messages short and clear; send after a second read."),
                t(english, "İletişim tonu bugünün kritik verim belirleyicilerinden biri.", "Communication tone is one of the key productivity levers today."),
                t(english, "Yanlış anlaşılmaları azaltmak için netlik ve tempo kontrolü önemli.", "Clarity and pacing reduce misunderstandings."),
                List.of(t(english, "Netlik", "Clarity"), t(english, "İkinci kontrol", "Second check"))));
        items.add(new CosmicSubItem("recommendations", "energy", t(english, "Öneriler", "Recommendations"), "REC_ENERGY",
                t(english, "Enerji Yönetimi", "Energy Management"), clamp(recBase + (recBase >= 65 ? 5 : -4)), "#A855F7",
                t(english, "Enerjini tek hamlede tüketme; aralıklı ilerle.", "Do not spend all your energy at once; move in intervals."),
                t(english, "Gün enerjisi dalgalıysa ritim yönetimi sonuç kalitesini korur.", "When energy fluctuates, rhythm management protects result quality."),
                t(english, "Kısa mola + odak blokları verimi yükseltebilir.", "Short breaks plus focus blocks can improve output."),
                List.of(t(english, "Ritim", "Rhythm"), t(english, "Mola", "Break"))));
    }

    private CosmicCategoryDetail buildCategoryDetail(
            String categoryKey,
            List<CosmicSubItem> items,
            int categoryScore,
            boolean english
    ) {
        List<CosmicSubItem> sortedDesc = items.stream()
                .sorted(Comparator.comparingInt(CosmicSubItem::score).reversed())
                .toList();
        List<CosmicSubItem> sortedAsc = items.stream()
                .sorted(Comparator.comparingInt(CosmicSubItem::score))
                .toList();

        int doCount = categoryScore >= 85 ? 3 : categoryScore >= 60 ? 2 : 1;
        int dontCount = categoryScore <= 25 ? 3 : categoryScore <= 55 ? 2 : 1;

        List<String> dos = sortedDesc.stream()
                .limit(doCount)
                .map(item -> item.label() + " · " + item.shortAdvice())
                .toList();
        List<String> donts = sortedAsc.stream()
                .limit(dontCount)
                .map(item -> item.label() + " · " + cautionTextFor(item, english))
                .toList();

        CosmicSubItem primary = categoryScore < 50 ? sortedAsc.getFirst() : sortedDesc.getFirst();
        String reasoning = primary.insight();
        List<String> supportingAspects = items.stream()
                .flatMap(item -> item.triggerNotes().stream())
                .filter(note -> note != null && !note.isBlank())
                .distinct()
                .limit(6)
                .toList();

        List<CosmicDetailSubcategory> subcategories = items.stream()
                .sorted(Comparator.comparingInt(CosmicSubItem::score).reversed())
                .map(item -> new CosmicDetailSubcategory(
                        item.subCategoryKey(),
                        item.label(),
                        item.colorHex(),
                        item.score(),
                        item.shortAdvice(),
                        item.technicalExplanation(),
                        item.insight(),
                        item.triggerNotes()
                ))
                .toList();

        return new CosmicCategoryDetail(
                categoryKey,
                items.getFirst().categoryLabel(),
                categoryScore,
                dos,
                donts,
                reasoning,
                supportingAspects,
                subcategories
        );
    }

    private String cautionTextFor(CosmicSubItem item, boolean english) {
        if (item.score() <= 30) {
            return t(english, "Bugün erteleme veya düşük riskli yaklaşım daha güvenli olabilir.", "Today, postponing or a low-risk approach may be safer.");
        }
        if (item.score() <= 50) {
            return t(english, "Dikkatli tempo ve ikinci kontrol önerilir.", "A cautious pace and a second check are recommended.");
        }
        return t(english, "Karar öncesi detayları yeniden doğrula.", "Recheck details before deciding.");
    }

    private List<CosmicSummaryCard> buildFocusCards(List<CosmicSubItem> activities) {
        if (activities.isEmpty()) return List.of();

        List<CosmicSubItem> eligible = activities.stream()
                .filter(item -> isCompassCategory(item.categoryKey()))
                .toList();
        if (eligible.isEmpty()) return List.of();

        List<CosmicSubItem> sortedDesc = eligible.stream()
                .sorted(Comparator.comparingInt(CosmicSubItem::score).reversed())
                .toList();
        List<CosmicSubItem> sortedAsc = eligible.stream()
                .sorted(Comparator.comparingInt(CosmicSubItem::score))
                .toList();

        List<CosmicSummaryCard> cards = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (CosmicSubItem item : sortedDesc) {
            if (cards.size() >= 2) break;
            String key = item.categoryKey() + ":" + item.subCategoryKey();
            if (!seen.add(key)) continue;
            cards.add(toFocusCard(item, "OPPORTUNITY"));
        }
        for (CosmicSubItem item : sortedAsc) {
            String key = item.categoryKey() + ":" + item.subCategoryKey();
            if (!seen.add(key)) continue;
            cards.add(toFocusCard(item, "WARNING"));
            break;
        }

        return cards;
    }

    private boolean isCompassCategory(String categoryKey) {
        return switch (categoryKey) {
            case "beauty", "finance", "career", "social", "health", "home", "spiritual", "activity", "official" -> true;
            default -> false;
        };
    }

    private CosmicSummaryCard toFocusCard(CosmicSubItem item, String type) {
        return new CosmicSummaryCard(
                item.categoryKey(),
                item.subCategoryKey(),
                item.categoryLabel(),
                item.activityKey(),
                item.label(),
                item.score(),
                type,
                item.shortAdvice(),
                item.colorHex()
        );
    }

    private int scoreMoonPhase(String moonPhase) {
        return switch (moonPhase) {
            case "Yeni Ay" -> 78;
            case "Hilal (Büyüyen)" -> 74;
            case "İlk Dördün" -> 68;
            case "Şişkin Ay (Büyüyen)" -> 72;
            case "Dolunay" -> 42;
            case "Şişkin Ay (Küçülen)" -> 53;
            case "Son Dördün" -> 49;
            case "Hilal (Küçülen)" -> 57;
            default -> 55;
        };
    }

    private int scoreMoonSign(String sign) {
        String s = (sign == null ? "" : sign).toLowerCase(Locale.ROOT);
        if (s.contains("taurus") || s.contains("virgo") || s.contains("libra")) return 74;
        if (s.contains("cancer") || s.contains("pisces")) return 70;
        if (s.contains("scorpio") || s.contains("aries")) return 48;
        return 60;
    }

    private String mapGroupToCategoryKey(String groupKey) {
        return switch (groupKey) {
            case "beauty", "finance", "career", "social", "health", "home", "spiritual", "activity", "official" -> groupKey;
            default -> null;
        };
    }

    private String mapActivityToSubKey(String activityKey) {
        if (activityKey == null) return "unknown";
        return switch (activityKey) {
            case "HAIR_CUT" -> "hair_cut";
            case "SKIN_CARE" -> "skin_care";
            case "NAIL_CARE" -> "nail_care";
            case "HAIR_REDUCTION" -> "hair_reduction";
            case "AESTHETIC_TOUCH" -> "aesthetic";
            case "INVESTMENT" -> "investment";
            case "BIG_PURCHASE" -> "big_purchase";
            case "SHOPPING" -> "shopping";
            case "DEBT_CREDIT" -> "debt_credit";
            case "SIGNATURE" -> "signature";
            case "MEETING" -> "meeting";
            case "JOB_APPLICATION", "NEW_JOB" -> "new_job";
            case "CAREER_EDUCATION" -> "career_education";
            case "SENIORITY" -> "seniority";
            case "RESIGNATION" -> "resignation";
            case "ENTREPRENEURSHIP" -> "entrepreneurship";
            case "FIRST_DATE" -> "first_date";
            case "FLIRT" -> "flirt";
            case "SOCIAL_INVITE" -> "social_invites";
            case "CHECKUP" -> "checkup";
            case "DIET_DETOX" -> "diet_detox";
            case "TREATMENT" -> "treatment";
            case "OPERATION" -> "operation";
            case "REST_RECOVERY" -> "rest_recovery";
            case "CULTURE_ART" -> "culture_art";
            case "ACTIVITY_SHOPPING" -> "shopping";
            case "REPAIR" -> "repair";
            case "HOUSEWORK" -> "housework";
            case "SPORT" -> "sport";
            case "PARTY_FUN" -> "party_fun";
            case "SOCIAL_EVENT" -> "social_event";
            case "VACATION" -> "vacation";
            case "LAW" -> "law";
            case "VENTURE" -> "venture";
            case "OFFICIAL_DOCUMENTS" -> "official_documents";
            case "APPLICATIONS" -> "applications";
            case "PUBLIC_AFFAIRS" -> "public_affairs";
            case "OFFICIAL_MEETING" -> "meeting";
            case "THESIS_RESEARCH" -> "thesis_research";
            case "CLEANING" -> "cleaning";
            case "MOVING" -> "moving";
            case "RENOVATION" -> "renovation";
            case "DECORATION" -> "decoration";
            case "PLANT_CARE" -> "plant_care";
            case "MEDITATION" -> "meditation";
            case "WORSHIP" -> "worship";
            case "PRAYER" -> "prayer";
            case "EDUCATION_EXAM" -> "career_education";
            case "DEEP_SESSION", "INNER_JOURNEY" -> "inner_journey";
            case "RITUAL" -> "ritual";
            default -> activityKey.toLowerCase(Locale.ROOT);
        };
    }

    private String resolveColor(String categoryKey, String subCategoryKey) {
        return switch (categoryKey) {
            case "beauty" -> switch (subCategoryKey) {
                case "hair_reduction" -> "#2EC4B6";
                case "hair_cut" -> "#E85DBE";
                case "skin_care" -> "#E3B341";
                case "aesthetic" -> "#3B82F6";
                case "nail_care" -> "#9CA3AF";
                default -> "#A78BFA";
            };
            case "health" -> switch (subCategoryKey) {
                case "diet_detox" -> "#7BC47F";
                case "checkup" -> "#4F86F7";
                case "treatment" -> "#EC4899";
                case "operation" -> "#FB7185";
                case "rest_recovery" -> "#A78BFA";
                default -> "#F59E0B";
            };
            case "activity" -> switch (subCategoryKey) {
                case "culture_art" -> "#6D28D9";
                case "shopping" -> "#EAB308";
                case "repair" -> "#94A3B8";
                case "housework" -> "#EC4899";
                case "sport" -> "#2563EB";
                case "party_fun" -> "#7BC47F";
                case "social_event" -> "#9333EA";
                case "vacation" -> "#14B8A6";
                default -> "#6366F1";
            };
            case "official" -> switch (subCategoryKey) {
                case "official_documents" -> "#38BDF8";
                case "law" -> "#E3B341";
                case "applications" -> "#22C55E";
                case "public_affairs" -> "#F97316";
                case "venture" -> "#A855F7";
                case "meeting" -> "#3B82F6";
                case "thesis_research" -> "#9CA3AF";
                default -> "#64748B";
            };
            case "finance" -> switch (subCategoryKey) {
                case "investment" -> "#22C55E";
                case "big_purchase" -> "#0EA5E9";
                case "shopping" -> "#F59E0B";
                case "debt_credit" -> "#EF4444";
                default -> "#0EA5E9";
            };
            case "career" -> switch (subCategoryKey) {
                case "new_job" -> "#14B8A6";
                case "career_education" -> "#3B82F6";
                case "seniority" -> "#A855F7";
                case "resignation" -> "#FB7185";
                case "entrepreneurship" -> "#22C55E";
                case "signature" -> "#2563EB";
                case "meeting" -> "#8B5CF6";
                case "job_application" -> "#14B8A6";
                default -> "#6366F1";
            };
            case "social" -> switch (subCategoryKey) {
                case "first_date" -> "#EC4899";
                case "flirt" -> "#8B5CF6";
                case "social_invites" -> "#22C55E";
                default -> "#F97316";
            };
            case "moon" -> switch (subCategoryKey) {
                case "moon_phase" -> "#7BC47F";
                case "moon_sign" -> "#E85DBE";
                case "lunar_rhythm" -> "#3B82F6";
                default -> "#A78BFA";
            };
            case "transit" -> switch (subCategoryKey) {
                case "retrogrades" -> "#FB7185";
                case "aspect_flow" -> "#22D3EE";
                case "cycles" -> "#8B5CF6";
                default -> "#94A3B8";
            };
            case "home" -> switch (subCategoryKey) {
                case "cleaning" -> "#22C55E";
                case "moving" -> "#60A5FA";
                case "renovation" -> "#F59E0B";
                case "decoration" -> "#EC4899";
                case "plant_care" -> "#14B8A6";
                default -> "#10B981";
            };
            case "spiritual" -> switch (subCategoryKey) {
                case "worship" -> "#22C55E";
                case "prayer" -> "#EC4899";
                case "meditation" -> "#8B5CF6";
                case "career_education", "education_exam" -> "#3B82F6";
                case "inner_journey", "deep_session" -> "#94A3B8";
                case "ritual" -> "#A855F7";
                default -> "#8B5CF6";
            };
            default -> "#94A3B8";
        };
    }

    private YearMonth parseYearMonth(String raw) {
        if (raw == null || raw.isBlank()) return YearMonth.now();
        String value = raw.trim();
        try {
            if (value.matches("^\\d{4}-\\d{2}$")) {
                return YearMonth.parse(value, YM);
            }
            if (value.matches("^\\d{2}$")) {
                int m = Integer.parseInt(value);
                return YearMonth.of(LocalDate.now().getYear(), Math.max(1, Math.min(12, m)));
            }
        } catch (DateTimeParseException | NumberFormatException ignored) {
            log.warn("Invalid month param '{}', falling back to current month", raw);
        }
        return YearMonth.now();
    }

    private int clamp(int score) {
        return Math.max(5, Math.min(100, score));
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

    private String localizeMoonPhase(String moonPhase, boolean english) {
        if (!english) return moonPhase;
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

    private String localizeSignTr(String sign) {
        return switch (sign) {
            case "Aries" -> "Koç";
            case "Taurus" -> "Boğa";
            case "Gemini" -> "İkizler";
            case "Cancer" -> "Yengeç";
            case "Leo" -> "Aslan";
            case "Virgo" -> "Başak";
            case "Libra" -> "Terazi";
            case "Scorpio" -> "Akrep";
            case "Sagittarius" -> "Yay";
            case "Capricorn" -> "Oğlak";
            case "Aquarius" -> "Kova";
            case "Pisces" -> "Balık";
            default -> sign;
        };
    }

    private record CosmicSubItem(
            String categoryKey,
            String subCategoryKey,
            String categoryLabel,
            String activityKey,
            String label,
            int score,
            String colorHex,
            String shortAdvice,
            String technicalExplanation,
            String insight,
            List<String> triggerNotes
    ) {}

    private record DayBundle(
            DailyLifeGuideResponse dailyGuide,
            List<CosmicSubItem> activities,
            Map<String, Integer> categoryScores
    ) {}
}
