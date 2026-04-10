package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.CosmicCategoryDetail;
import com.mysticai.astrology.dto.CosmicDayDetailResponse;
import com.mysticai.astrology.dto.CosmicDetailSubcategory;
import com.mysticai.astrology.dto.CosmicPlannerDay;
import com.mysticai.astrology.dto.CosmicPlannerSubcategoryDot;
import com.mysticai.astrology.dto.cosmicplanner.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CosmicPlannerFacadeService {

    private final CosmicScoringService cosmicScoringService;

    private static final DateTimeFormatter YM_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final List<String> DOCK_ORDER = List.of("social", "transit", "moon", "beauty", "health", "career", "finance", "marriage");

    public CosmicPlannerMonthDTO getMonth(
            Long userId,
            int year,
            int month,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        YearMonth ym = YearMonth.of(year, month);
        var planner = cosmicScoringService.getPlannerMonth(
                userId,
                ym.format(YM_FORMATTER),
                locale,
                userGender,
                maritalStatus
        );

        List<CosmicPlannerMonthDayDTO> days = planner.days().stream()
                .map(this::toMonthDay)
                .toList();

        return new CosmicPlannerMonthDTO(
                year,
                month,
                days,
                planner.generatedAt() != null ? planner.generatedAt().toString() : null
        );
    }

    public CosmicPlannerDayDTO getDay(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        CosmicDayDetailResponse detail = cosmicScoringService.getDayDetail(userId, date, locale, userGender, maritalStatus);
        List<Map.Entry<String, CosmicCategoryDetail>> sorted = detail.categories().entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue().score(), a.getValue().score()))
                .toList();

        int overallScore = computeOverallScore(detail);
        String whySummary = sorted.isEmpty()
                ? "Bugün kozmik ritim daha sade ilerleme öneriyor."
                : firstNonBlank(sorted.get(0).getValue().reasoning(), "Bugün odaklı ve net adımlar daha iyi sonuç verir.");

        List<RecommendationItemDTO> doItems = collectRecommendations(
                detail.date(),
                sorted,
                true
        );
        List<RecommendationItemDTO> avoidItems = collectRecommendations(
                detail.date(),
                sorted,
                false
        );

        return new CosmicPlannerDayDTO(
                detail.date(),
                overallScore,
                toBand(overallScore),
                clampText(whySummary, 180),
                doItems,
                avoidItems,
                buildTimingWindows(overallScore, detail.mercuryRetrograde()),
                buildCategoryScores(detail, sorted),
                detail.generatedAt() != null ? detail.generatedAt().toString() : null
        );
    }

    public CosmicPlannerDayCategoriesDTO getDayCategories(
            Long userId,
            LocalDate date,
            String locale,
            String userGender,
            String maritalStatus
    ) {
        CosmicDayDetailResponse detail = cosmicScoringService.getDayDetail(userId, date, locale, userGender, maritalStatus);
        List<DockCategoryDTO> categories = new ArrayList<>();

        for (String key : DOCK_ORDER) {
            CosmicCategoryDetail category = detail.categories().get(key);
            if (category == null) continue;

            categories.add(new DockCategoryDTO(
                    key,
                    categoryLabelForKey(key, category.categoryLabel()),
                    category.score(),
                    clampText(firstNonBlank(category.reasoning(), "Bu alanda küçük ve net adımlar daha iyi sonuç verir."), 160),
                    collectCategoryRecommendations(detail.date(), key, category, true),
                    collectCategoryRecommendations(detail.date(), key, category, false)
            ));
        }

        if (categories.isEmpty()) {
            detail.categories().forEach((key, value) -> categories.add(new DockCategoryDTO(
                    key,
                    categoryLabelForKey(key, value.categoryLabel()),
                    value.score(),
                    clampText(firstNonBlank(value.reasoning(), "Bu alanda dengeyi korumak iyi olur."), 160),
                    collectCategoryRecommendations(detail.date(), key, value, true),
                    collectCategoryRecommendations(detail.date(), key, value, false)
            )));
        }

        return new CosmicPlannerDayCategoriesDTO(
                detail.date(),
                categories,
                detail.generatedAt() != null ? detail.generatedAt().toString() : null
        );
    }

    private CosmicPlannerMonthDayDTO toMonthDay(CosmicPlannerDay day) {
        List<CosmicPlannerSubcategoryDot> transitDots = day.dotsByCategory() != null
                ? day.dotsByCategory().getOrDefault("transit", List.of())
                : List.of();

        boolean hasRetro = transitDots.stream().anyMatch(dot -> normalize(dot.subCategoryKey()).contains("retro"));
        boolean hasCycles = transitDots.stream().anyMatch(dot -> normalize(dot.subCategoryKey()).contains("cycle"));
        boolean hasAspectFlow = transitDots.stream().anyMatch(dot -> normalize(dot.subCategoryKey()).contains("aspect"));

        String topCategory = day.categoryScores() == null
                ? null
                : day.categoryScores().entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> categoryLabelForKey(entry.getKey(), null))
                .orElse(null);

        int score = clamp(day.overallScore());
        return new CosmicPlannerMonthDayDTO(
                day.date(),
                score,
                toBand(score),
                new CategoryDotsDTO(hasRetro, hasCycles, hasAspectFlow),
                topCategory
        );
    }

    private int computeOverallScore(CosmicDayDetailResponse detail) {
        if (detail.categories() == null || detail.categories().isEmpty()) {
            return 5;
        }
        return clamp((int) Math.round(detail.categories().values().stream()
                .mapToInt(CosmicCategoryDetail::score)
                .average()
                .orElse(5)));
    }

    private List<RecommendationItemDTO> collectRecommendations(
            LocalDate date,
            List<Map.Entry<String, CosmicCategoryDetail>> sortedCategories,
            boolean doItems
    ) {
        LinkedHashSet<String> uniqueTexts = new LinkedHashSet<>();
        List<RecommendationItemDTO> output = new ArrayList<>();
        int max = doItems ? 5 : 4;

        List<Map.Entry<String, CosmicCategoryDetail>> sourceOrder = doItems
                ? sortedCategories
                : sortedCategories.stream()
                .sorted(Comparator.comparingInt(entry -> entry.getValue().score()))
                .toList();

        for (Map.Entry<String, CosmicCategoryDetail> entry : sourceOrder) {
            CosmicCategoryDetail category = entry.getValue();
            List<String> lines = doItems ? safeList(category.dos()) : safeList(category.donts());
            for (String line : lines) {
                String clean = cleanLine(line);
                if (clean.isBlank()) continue;
                String normalized = normalize(clean);
                if (!uniqueTexts.add(normalized)) continue;

                output.add(new RecommendationItemDTO(
                        stableId(date, entry.getKey(), clean, doItems ? "do" : "avoid"),
                        clampText(clean, 120),
                        null,
                        doItems ? RecommendationSeverity.INFO : RecommendationSeverity.WARN,
                        entry.getKey(),
                        toActionType(entry.getKey())
                ));
                if (output.size() >= max) {
                    return output;
                }
            }
        }

        if (output.isEmpty()) {
            output.add(new RecommendationItemDTO(
                    stableId(date, "fallback", doItems ? "Bugün küçük bir plan yap." : "Önemli kararları aceleye getirme.", doItems ? "do" : "avoid"),
                    doItems ? "Bugün küçük bir plan yap." : "Önemli kararları aceleye getirme.",
                    null,
                    doItems ? RecommendationSeverity.INFO : RecommendationSeverity.WARN,
                    null,
                    RecommendationActionType.PLAN
            ));
        }

        return output;
    }

    private List<RecommendationItemDTO> collectCategoryRecommendations(
            LocalDate date,
            String categoryKey,
            CosmicCategoryDetail category,
            boolean doItems
    ) {
        List<String> lines = doItems ? safeList(category.dos()) : safeList(category.donts());
        List<RecommendationItemDTO> items = new ArrayList<>();
        int max = doItems ? 3 : 2;
        int index = 0;
        for (String line : lines) {
            String clean = cleanLine(line);
            if (clean.isBlank()) continue;
            items.add(new RecommendationItemDTO(
                    stableId(date, categoryKey, clean, (doItems ? "do" : "avoid") + ":" + index),
                    clampText(clean, 120),
                    null,
                    doItems ? RecommendationSeverity.INFO : RecommendationSeverity.WARN,
                    categoryKey,
                    toActionType(categoryKey)
            ));
            index += 1;
            if (items.size() >= max) break;
        }
        return items;
    }

    private List<CategoryScoreDTO> buildCategoryScores(
            CosmicDayDetailResponse detail,
            List<Map.Entry<String, CosmicCategoryDetail>> sorted
    ) {
        List<CategoryScoreDTO> scores = new ArrayList<>();
        CosmicCategoryDetail transit = detail.categories().get("transit");

        if (transit != null && transit.subcategories() != null) {
            for (CosmicDetailSubcategory sub : transit.subcategories()) {
                String mapped = switch (normalize(sub.subCategoryKey())) {
                    case "retrogrades" -> "RETRO";
                    case "cycles" -> "CYCLES";
                    case "aspectflow" -> "ASPECT_FLOW";
                    default -> null;
                };
                if (mapped == null) continue;
                scores.add(new CategoryScoreDTO(
                        mapped,
                        clamp(sub.score()),
                        clampText(firstNonBlank(sub.insight(), sub.shortAdvice()), 140),
                        safeList(sub.triggerNotes()).stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isBlank()).limit(3).toList()
                ));
            }
        }

        if (!scores.isEmpty()) {
            return scores;
        }

        for (Map.Entry<String, CosmicCategoryDetail> entry : sorted.stream().limit(5).toList()) {
            CosmicCategoryDetail category = entry.getValue();
            scores.add(new CategoryScoreDTO(
                    normalize(entry.getKey()).toUpperCase(Locale.ROOT),
                    clamp(category.score()),
                    clampText(firstNonBlank(category.reasoning(), "Bu alanda denge önemli."), 140),
                    safeList(category.supportingAspects()).stream().limit(3).toList()
            ));
        }
        return scores;
    }

    private List<TimeWindowDTO> buildTimingWindows(int overallScore, boolean mercuryRetrograde) {
        List<TimeWindowDTO> windows = new ArrayList<>();

        if (overallScore >= 80) {
            windows.add(new TimeWindowDTO("09:00", "12:00", TimeWindowType.STRONG, "Odak ve üretkenlik için güçlü pencere."));
            windows.add(new TimeWindowDTO("14:00", "17:00", TimeWindowType.STRONG, "Toplantı ve görünür işler için akış destekli."));
            windows.add(new TimeWindowDTO("19:00", "21:00", TimeWindowType.CAUTION, "Akşam saatlerinde tempoyu sade tut."));
        } else if (overallScore >= 50) {
            windows.add(new TimeWindowDTO("09:00", "11:00", TimeWindowType.STRONG, "Kısa planlama ve net başlangıçlar için uygun."));
            windows.add(new TimeWindowDTO("12:00", "15:00", TimeWindowType.CAUTION, "Kararları aceleye getirmemek daha iyi olur."));
            windows.add(new TimeWindowDTO("16:00", "18:00", TimeWindowType.STRONG, "Günün ikinci yarısında toparlama mümkün."));
        } else {
            windows.add(new TimeWindowDTO("09:00", "10:30", TimeWindowType.CAUTION, "Güne düşük tempoda başlamak denge sağlar."));
            windows.add(new TimeWindowDTO("13:00", "16:00", TimeWindowType.CAUTION, "Kritik kararları ertelemek daha güvenli."));
            windows.add(new TimeWindowDTO("18:00", "20:00", TimeWindowType.STRONG, "Günü değerlendirme ve plan güncelleme için daha uygun."));
        }

        if (mercuryRetrograde) {
            windows.add(new TimeWindowDTO("16:00", "17:00", TimeWindowType.CAUTION, "Merkür retrosunda iletişimde ek kontrol faydalı olur."));
        }

        return windows;
    }

    private CosmicBand toBand(int score) {
        if (score >= 80) return CosmicBand.STRONG;
        if (score >= 50) return CosmicBand.BALANCED;
        return CosmicBand.CRITICAL;
    }

    private RecommendationActionType toActionType(String categoryKey) {
        String key = normalize(categoryKey);
        return switch (key) {
            case "social", "career", "official" -> RecommendationActionType.COMMUNICATION;
            case "marriage" -> RecommendationActionType.PLAN;
            case "finance" -> RecommendationActionType.FINANCE;
            case "health", "moon" -> RecommendationActionType.HEALTH;
            case "beauty", "color" -> RecommendationActionType.BEAUTY;
            case "transit", "recommendations" -> RecommendationActionType.PLAN;
            default -> RecommendationActionType.CUSTOM;
        };
    }

    private String categoryLabelForKey(String categoryKey, String fallbackLabel) {
        return switch (normalize(categoryKey)) {
            case "transit" -> "Transit";
            case "moon" -> "Ay";
            case "beauty" -> "Güzellik";
            case "health" -> "Sağlık";
            case "career" -> "Kariyer";
            case "finance" -> "Para";
            case "social" -> "Aşk";
            case "marriage" -> "Evlilik";
            case "official" -> "Resmi";
            case "activity" -> "Aktivite";
            case "home" -> "Ev";
            default -> firstNonBlank(fallbackLabel, categoryKey);
        };
    }

    private String stableId(LocalDate date, String categoryKey, String text, String seed) {
        String payload = String.join("|",
                String.valueOf(date),
                normalize(categoryKey),
                normalize(text),
                normalize(seed));
        return "rec-" + Integer.toHexString(payload.hashCode());
    }

    private String normalize(String input) {
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

    private int clamp(int value) {
        return Math.max(5, Math.min(100, value));
    }

    private String cleanLine(String value) {
        if (value == null) return "";
        return value.trim().replaceAll("\\s+", " ");
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

    private String clampText(String value, int maxLen) {
        String source = firstNonBlank(value);
        if (source.length() <= maxLen) {
            return source;
        }
        return source.substring(0, Math.max(0, maxLen - 1)).trim() + "…";
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }
}
