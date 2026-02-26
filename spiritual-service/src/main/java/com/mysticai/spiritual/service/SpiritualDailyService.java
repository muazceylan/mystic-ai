package com.mysticai.spiritual.service;

import com.mysticai.spiritual.dto.daily.*;
import com.mysticai.spiritual.dto.common.PagedResponse;
import com.mysticai.spiritual.entity.*;
import com.mysticai.spiritual.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SpiritualDailyService {

    private static final String GLOBAL_SCOPE = "GLOBAL";
    private static final String ALGO_VERSION = "v1";
    private static final int DEFAULT_PRAYER_SET_SIZE = 5;
    private static final Set<String> REQUIRED_WEEKLY_CATEGORIES = Set.of("SUKUR", "KORUNMA", "HUZUR");

    private final PrayerRepository prayerRepository;
    private final PrayerSetRepository prayerSetRepository;
    private final PrayerSetItemRepository prayerSetItemRepository;
    private final AsmaulHusnaRepository asmaulHusnaRepository;
    private final AsmaDailyRepository asmaDailyRepository;
    private final MeditationExerciseRepository meditationExerciseRepository;
    private final MeditationDailyRepository meditationDailyRepository;
    private final DhikrEntryRepository dhikrEntryRepository;
    private final UserPrayerFavoriteRepository userPrayerFavoriteRepository;

    @Transactional
    public DailyPrayerSetResponse getDailyPrayerSet(Long userId, LocalDate date, String acceptLanguage, String timezone) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        String locale = normalizeLocale(acceptLanguage);

        PrayerSet snapshot = prayerSetRepository
                .findFirstBySetDateAndLocaleAndSelectionScopeAndUserIdIsNull(targetDate, locale, GLOBAL_SCOPE)
                .orElseGet(() -> generatePrayerSetSnapshot(targetDate, locale));

        return mapPrayerSetResponse(snapshot, userId);
    }

    public PrayerDetailResponse getPrayerDetail(Long userId, Long prayerId) {
        Prayer prayer = prayerRepository.findByIdAndActiveTrue(prayerId)
                .orElseThrow(() -> new IllegalArgumentException("Prayer not found"));
        boolean favorite = userPrayerFavoriteRepository.existsByUserIdAndPrayerId(userId, prayerId);
        return new PrayerDetailResponse(
                prayer.getId(),
                prayer.getTitle(),
                prayer.getCategory(),
                prayer.getSourceLabel(),
                prayer.getSourceNote(),
                prayer.getArabicText(),
                prayer.getTransliterationTr(),
                prayer.getMeaningTr(),
                prayer.getRecommendedRepeatCount(),
                prayer.getEstimatedReadSeconds(),
                prayer.getIsFavoritable(),
                favorite,
                prayer.getDisclaimerText()
        );
    }

    public List<ShortPrayerItemResponse> getShortPrayers(String category, Integer limit) {
        int safeLimit = Math.max(1, Math.min(limit == null ? 8 : limit, 20));
        List<Prayer> source = (category == null || category.isBlank())
                ? prayerRepository.findAllByActiveTrueOrderByIdAsc()
                : prayerRepository.findAllByActiveTrueAndCategoryIgnoreCaseOrderByIdAsc(category);

        return source.stream()
                .filter(p -> Optional.ofNullable(p.getEstimatedReadSeconds()).orElse(999) <= 45
                        || Optional.ofNullable(p.getDifficultyLevel()).orElse(2) <= 1)
                .limit(safeLimit)
                .map(p -> new ShortPrayerItemResponse(
                        p.getId(),
                        p.getTitle(),
                        p.getCategory(),
                        p.getRecommendedRepeatCount(),
                        p.getEstimatedReadSeconds(),
                        p.getSourceLabel()
                ))
                .toList();
    }

    @Transactional
    public DailyAsmaResponse getDailyAsma(Long userId, LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        String locale = "tr";

        AsmaDaily daily = asmaDailyRepository
                .findFirstByDailyDateAndLocaleAndSelectionScopeAndUserIdIsNull(targetDate, locale, GLOBAL_SCOPE)
                .orElseGet(() -> generateAsmaDailySnapshot(targetDate, locale));

        AsmaulHusna asma = asmaulHusnaRepository.findByIdAndActiveTrue(daily.getAsmaId())
                .orElseThrow(() -> new IllegalArgumentException("Asma not found"));

        return new DailyAsmaResponse(
                daily.getDailyDate(),
                daily.getSelectionScope(),
                asma.getId(),
                asma.getOrderNo(),
                asma.getArabicName(),
                asma.getTransliterationTr(),
                asma.getMeaningTr(),
                asma.getReflectionTextTr(),
                asma.getTheme(),
                asma.getRecommendedDhikrCount(),
                asma.getSourceNote()
        );
    }

    public PagedResponse<AsmaListItemResponse> getAsmaList(String search, String theme, String sort, int page, int pageSize) {
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        String normalizedTheme = (theme == null || theme.isBlank()) ? null : theme.trim();
        String sortMode = (sort == null || sort.isBlank()) ? "order" : sort.trim().toLowerCase(Locale.ROOT);

        List<AsmaulHusna> all = asmaulHusnaRepository.searchActive(normalizedSearch, normalizedTheme);

        Comparator<AsmaulHusna> comparator = switch (sortMode) {
            case "alpha", "alphabetic" ->
                    Comparator.comparing(AsmaulHusna::getTransliterationTr, String.CASE_INSENSITIVE_ORDER)
                            .thenComparing(AsmaulHusna::getOrderNo);
            default -> Comparator.comparing(AsmaulHusna::getOrderNo);
        };

        List<AsmaListItemResponse> mapped = all.stream()
                .sorted(comparator)
                .map(a -> new AsmaListItemResponse(
                        a.getId(),
                        a.getOrderNo(),
                        a.getArabicName(),
                        a.getTransliterationTr(),
                        a.getMeaningTr(),
                        a.getTheme(),
                        a.getRecommendedDhikrCount()
                ))
                .toList();

        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, Math.min(pageSize, 100));
        int fromIndex = Math.min((safePage - 1) * safePageSize, mapped.size());
        int toIndex = Math.min(fromIndex + safePageSize, mapped.size());
        int totalPages = (int) Math.ceil(mapped.size() / (double) safePageSize);
        return new PagedResponse<>(mapped.subList(fromIndex, toIndex), safePage, safePageSize, mapped.size(), totalPages);
    }

    public AsmaDetailResponse getAsmaDetail(Long asmaId) {
        AsmaulHusna asma = asmaulHusnaRepository.findByIdAndActiveTrue(asmaId)
                .orElseThrow(() -> new IllegalArgumentException("Asma not found"));
        return new AsmaDetailResponse(
                asma.getId(),
                asma.getOrderNo(),
                asma.getArabicName(),
                asma.getTransliterationTr(),
                asma.getMeaningTr(),
                asma.getReflectionTextTr(),
                asma.getTheme(),
                asma.getRecommendedDhikrCount(),
                asma.getSourceNote()
        );
    }

    @Transactional
    public DailyMeditationResponse getDailyMeditation(Long userId, LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        String locale = "tr";

        MeditationDaily daily = meditationDailyRepository
                .findFirstByDailyDateAndLocaleAndSelectionScopeAndUserIdIsNull(targetDate, locale, GLOBAL_SCOPE)
                .orElseGet(() -> generateMeditationDailySnapshot(targetDate, locale));

        MeditationExercise exercise = meditationExerciseRepository.findByIdAndActiveTrue(daily.getExerciseId())
                .orElseThrow(() -> new IllegalArgumentException("Meditation exercise not found"));

        return new DailyMeditationResponse(
                daily.getDailyDate(),
                daily.getSelectionScope(),
                exercise.getId(),
                exercise.getTitle(),
                exercise.getType(),
                exercise.getFocusTheme(),
                exercise.getDurationSec(),
                exercise.getStepsJson(),
                exercise.getBreathingPatternJson(),
                exercise.getAnimationMode(),
                exercise.getBackgroundAudioEnabledByDefault(),
                exercise.getDisclaimerText()
        );
    }

    private PrayerSet generatePrayerSetSnapshot(LocalDate targetDate, String locale) {
        List<Prayer> candidates = prayerRepository.findAllByActiveTrueOrderByIdAsc();
        if (candidates.isEmpty()) {
            throw new IllegalArgumentException("Prayer catalog is empty");
        }

        int desiredCount = Math.min(DEFAULT_PRAYER_SET_SIZE, candidates.size());
        String seedKey = "prayer|" + targetDate + "|" + locale + "|" + GLOBAL_SCOPE;

        Map<Long, Integer> recentCounts14 = loadPrayerCounts(targetDate.minusDays(14), targetDate.minusDays(1), locale);
        Map<Long, Integer> recentCounts30 = loadPrayerCounts(targetDate.minusDays(30), targetDate.minusDays(1), locale);
        Set<String> weeklyCategories = loadWeeklyShownCategories(targetDate, locale);
        Set<String> missingRequired = REQUIRED_WEEKLY_CATEGORIES.stream()
                .filter(cat -> !weeklyCategories.contains(cat))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Prayer> selected = selectPrayersDeterministically(candidates, desiredCount, seedKey, recentCounts14, recentCounts30, missingRequired);

        PrayerSet set = prayerSetRepository.save(PrayerSet.builder()
                .setDate(targetDate)
                .locale(locale)
                .selectionScope(GLOBAL_SCOPE)
                .userId(null)
                .algoVersion(ALGO_VERSION)
                .seedHash(sha256Hex(seedKey))
                .setSize(selected.size())
                .abVariant(selected.size() <= 3 ? "3_DUA" : "5_DUA")
                .generatedBy("SYSTEM")
                .build());

        int order = 1;
        for (Prayer prayer : selected) {
            prayerSetItemRepository.save(PrayerSetItem.builder()
                    .prayerSetId(set.getId())
                    .prayerId(prayer.getId())
                    .displayOrder(order++)
                    .targetRepeatCount(prayer.getRecommendedRepeatCount())
                    .isMandatory(false)
                    .reasonCode("ALGO_SELECT")
                    .build());
        }
        return set;
    }

    private AsmaDaily generateAsmaDailySnapshot(LocalDate targetDate, String locale) {
        List<AsmaulHusna> all = asmaulHusnaRepository.findAllByActiveTrueOrderByOrderNoAsc();
        if (all.isEmpty()) {
            throw new IllegalArgumentException("Asma catalog is empty");
        }

        String seedKey = "asma|" + targetDate + "|" + locale + "|" + GLOBAL_SCOPE;
        int idx = Math.floorMod((int) stableLongHash(seedKey), all.size());
        Set<Long> recent30 = asmaDailyRepository
                .findAllByDailyDateBetweenAndLocaleAndSelectionScopeAndUserIdIsNullOrderByDailyDateDesc(
                        targetDate.minusDays(30), targetDate.minusDays(1), locale, GLOBAL_SCOPE
                )
                .stream()
                .map(AsmaDaily::getAsmaId)
                .collect(Collectors.toSet());

        int shifts = 0;
        AsmaulHusna candidate = all.get(idx);
        while (recent30.contains(candidate.getId()) && shifts < all.size()) {
            idx = (idx + 1) % all.size();
            candidate = all.get(idx);
            shifts++;
        }

        return asmaDailyRepository.save(AsmaDaily.builder()
                .dailyDate(targetDate)
                .locale(locale)
                .selectionScope(GLOBAL_SCOPE)
                .asmaId(candidate.getId())
                .algoVersion(ALGO_VERSION)
                .seedHash(sha256Hex(seedKey))
                .build());
    }

    private MeditationDaily generateMeditationDailySnapshot(LocalDate targetDate, String locale) {
        List<MeditationExercise> all = meditationExerciseRepository.findAllByActiveTrueOrderByIdAsc();
        if (all.isEmpty()) {
            throw new IllegalArgumentException("Meditation exercise catalog is empty");
        }

        String seedKey = "meditation|" + targetDate + "|" + locale + "|" + GLOBAL_SCOPE;
        Set<Long> recent14 = meditationDailyRepository
                .findAllByDailyDateBetweenAndLocaleAndSelectionScopeAndUserIdIsNullOrderByDailyDateDesc(
                        targetDate.minusDays(14), targetDate.minusDays(1), locale, GLOBAL_SCOPE
                )
                .stream()
                .map(MeditationDaily::getExerciseId)
                .collect(Collectors.toSet());

        List<MeditationExercise> ranked = new ArrayList<>(all);
        ranked.sort(Comparator
                .comparingDouble((MeditationExercise ex) -> meditationScore(ex, seedKey, recent14))
                .reversed()
                .thenComparing(MeditationExercise::getId));

        MeditationExercise selected = ranked.getFirst();
        return meditationDailyRepository.save(MeditationDaily.builder()
                .dailyDate(targetDate)
                .locale(locale)
                .selectionScope(GLOBAL_SCOPE)
                .exerciseId(selected.getId())
                .algoVersion(ALGO_VERSION)
                .seedHash(sha256Hex(seedKey))
                .build());
    }

    private DailyPrayerSetResponse mapPrayerSetResponse(PrayerSet set, Long userId) {
        List<PrayerSetItem> items = prayerSetItemRepository.findAllByPrayerSetIdOrderByDisplayOrderAsc(set.getId());
        if (items.isEmpty()) {
            return new DailyPrayerSetResponse(set.getSetDate(), set.getSelectionScope(), set.getId(),
                    Optional.ofNullable(set.getAbVariant()).orElse("5_DUA"), List.of());
        }

        List<Long> prayerIds = items.stream().map(PrayerSetItem::getPrayerId).toList();
        Map<Long, Prayer> prayerMap = prayerRepository.findAllById(prayerIds).stream()
                .collect(Collectors.toMap(Prayer::getId, Function.identity()));

        Map<Long, DhikrEntry> progressMap = dhikrEntryRepository
                .findAllByUserIdAndEntryDateAndPrayerIdIn(userId, set.getSetDate(), prayerIds)
                .stream()
                .collect(Collectors.toMap(DhikrEntry::getPrayerId, Function.identity()));

        List<PrayerSetItemResponse> responseItems = items.stream()
                .map(item -> {
                    Prayer prayer = prayerMap.get(item.getPrayerId());
                    if (prayer == null) {
                        return null;
                    }
                    DhikrEntry progress = progressMap.get(item.getPrayerId());
                    int progressCount = progress != null && progress.getTotalRepeatCount() != null ? progress.getTotalRepeatCount() : 0;
                    int target = item.getTargetRepeatCount() != null ? item.getTargetRepeatCount() : prayer.getRecommendedRepeatCount();
                    return new PrayerSetItemResponse(
                            Optional.ofNullable(item.getDisplayOrder()).orElse(0),
                            prayer.getId(),
                            prayer.getTitle(),
                            prayer.getCategory(),
                            target,
                            prayer.getEstimatedReadSeconds(),
                            progressCount,
                            target > 0 && progressCount >= target
                    );
                })
                .filter(Objects::nonNull)
                .toList();

        return new DailyPrayerSetResponse(
                set.getSetDate(),
                set.getSelectionScope(),
                set.getId(),
                Optional.ofNullable(set.getAbVariant()).orElse("5_DUA"),
                responseItems
        );
    }

    private Map<Long, Integer> loadPrayerCounts(LocalDate from, LocalDate to, String locale) {
        if (to.isBefore(from)) return Map.of();

        List<PrayerSet> sets = prayerSetRepository
                .findAllBySetDateBetweenAndLocaleAndSelectionScopeAndUserIdIsNullOrderBySetDateDesc(from, to, locale, GLOBAL_SCOPE);
        if (sets.isEmpty()) return Map.of();

        List<Long> setIds = sets.stream().map(PrayerSet::getId).toList();
        List<PrayerSetItem> items = prayerSetItemRepository.findAllByPrayerSetIdIn(setIds);

        Map<Long, Integer> counts = new HashMap<>();
        for (PrayerSetItem item : items) {
            counts.merge(item.getPrayerId(), 1, Integer::sum);
        }
        return counts;
    }

    private Set<String> loadWeeklyShownCategories(LocalDate targetDate, String locale) {
        LocalDate weekStart = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = targetDate.minusDays(1);
        if (weekEnd.isBefore(weekStart)) return Set.of();

        List<PrayerSet> sets = prayerSetRepository
                .findAllBySetDateBetweenAndLocaleAndSelectionScopeAndUserIdIsNullOrderBySetDateDesc(weekStart, weekEnd, locale, GLOBAL_SCOPE);
        if (sets.isEmpty()) return Set.of();

        List<Long> setIds = sets.stream().map(PrayerSet::getId).toList();
        List<PrayerSetItem> items = prayerSetItemRepository.findAllByPrayerSetIdIn(setIds);
        Set<Long> prayerIds = items.stream().map(PrayerSetItem::getPrayerId).collect(Collectors.toSet());
        Map<Long, Prayer> prayerMap = prayerRepository.findAllById(prayerIds).stream()
                .collect(Collectors.toMap(Prayer::getId, Function.identity()));

        Set<String> categories = new HashSet<>();
        for (PrayerSetItem item : items) {
            Prayer p = prayerMap.get(item.getPrayerId());
            if (p != null && p.getCategory() != null) categories.add(p.getCategory());
        }
        return categories;
    }

    private List<Prayer> selectPrayersDeterministically(List<Prayer> candidates,
                                                        int desiredCount,
                                                        String seedKey,
                                                        Map<Long, Integer> recentCounts14,
                                                        Map<Long, Integer> recentCounts30,
                                                        Set<String> missingRequired) {
        List<Prayer> selected = new ArrayList<>();
        Set<Long> selectedIds = new HashSet<>();
        Set<String> selectedCategories = new HashSet<>();
        boolean[] needsShort = {true};
        boolean[] needsMedium = {true};

        for (String requiredCategory : missingRequired) {
            if (selected.size() >= desiredCount) break;
            Prayer pick = candidates.stream()
                    .filter(p -> !selectedIds.contains(p.getId()))
                    .filter(p -> requiredCategory.equalsIgnoreCase(p.getCategory()))
                    .sorted(Comparator
                            .comparingDouble((Prayer p) -> scorePrayer(p, seedKey, recentCounts14, recentCounts30, selectedCategories, missingRequired, needsShort[0], needsMedium[0]))
                            .reversed()
                            .thenComparing(Prayer::getId))
                    .findFirst()
                    .orElse(null);

            if (pick != null) {
                addSelected(selected, selectedIds, selectedCategories, needsShort, needsMedium, pick);
            }
        }

        while (selected.size() < desiredCount) {
            Prayer pick = candidates.stream()
                    .filter(p -> !selectedIds.contains(p.getId()))
                    .sorted(Comparator
                            .comparingDouble((Prayer p) -> scorePrayer(p, seedKey, recentCounts14, recentCounts30, selectedCategories, missingRequired, needsShort[0], needsMedium[0]))
                            .reversed()
                            .thenComparing(Prayer::getId))
                    .findFirst()
                    .orElse(null);

            if (pick == null) break;
            addSelected(selected, selectedIds, selectedCategories, needsShort, needsMedium, pick);
        }

        return selected;
    }

    private void addSelected(List<Prayer> selected,
                             Set<Long> selectedIds,
                             Set<String> selectedCategories,
                             boolean[] needsShort,
                             boolean[] needsMedium,
                             Prayer pick) {
        selected.add(pick);
        selectedIds.add(pick.getId());
        if (pick.getCategory() != null) selectedCategories.add(pick.getCategory());
        if (Optional.ofNullable(pick.getDifficultyLevel()).orElse(1) <= 1) needsShort[0] = false;
        if (Optional.ofNullable(pick.getDifficultyLevel()).orElse(1) == 2) needsMedium[0] = false;
    }

    private double scorePrayer(Prayer prayer,
                               String seedKey,
                               Map<Long, Integer> recentCounts14,
                               Map<Long, Integer> recentCounts30,
                               Set<String> selectedCategories,
                               Set<String> missingRequired,
                               boolean needsShort,
                               boolean needsMedium) {
        double score = 100.0;
        Long prayerId = prayer.getId();

        if (recentCounts14.getOrDefault(prayerId, 0) > 0) {
            score -= 45;
        }

        score -= Math.min(recentCounts30.getOrDefault(prayerId, 0) * 8, 32);

        if (prayer.getCategory() != null && missingRequired.contains(prayer.getCategory())) {
            score += 40;
        }

        if (prayer.getCategory() != null && selectedCategories.contains(prayer.getCategory())) {
            score -= 12;
        }

        int difficulty = Optional.ofNullable(prayer.getDifficultyLevel()).orElse(1);
        if (needsShort && difficulty == 1) score += 18;
        if (needsMedium && difficulty == 2) score += 12;

        if (Optional.ofNullable(prayer.getEstimatedReadSeconds()).orElse(0) > 90) {
            score -= 10;
        }

        score += deterministicJitter(seedKey + "|" + prayerId, 0.0, 5.0);
        return score;
    }

    private double meditationScore(MeditationExercise ex, String seedKey, Set<Long> recent14) {
        double score = 100.0;
        if (recent14.contains(ex.getId())) score -= 50;
        if (Optional.ofNullable(ex.getDurationSec()).orElse(0) <= 180) score += 12;
        score += deterministicJitter(seedKey + "|" + ex.getId(), 0.0, 4.0);
        return score;
    }

    private String normalizeLocale(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) return "tr";
        String normalized = acceptLanguage.toLowerCase(Locale.ROOT);
        return normalized.startsWith("en") ? "en" : "tr";
    }

    private long stableLongHash(String input) {
        long h = 1125899906842597L;
        for (int i = 0; i < input.length(); i++) {
            h = 31 * h + input.charAt(i);
        }
        return h;
    }

    private double deterministicJitter(String input, double min, double max) {
        long raw = stableLongHash(input);
        double ratio = (raw & Long.MAX_VALUE) / (double) Long.MAX_VALUE;
        return min + ((max - min) * ratio);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
