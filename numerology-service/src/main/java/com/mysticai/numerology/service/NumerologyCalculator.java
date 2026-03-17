package com.mysticai.numerology.service;

import com.mysticai.numerology.dto.NumerologyResponse;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class NumerologyCalculator {

    private static final String VERSION = "numerology_v3";
    private static final String CONTENT_VERSION = "numerology_content_v3_0";
    private static final String CALCULATION_VERSION = "numerology_calc_v3_0";
    private static final String BRAND_MARK = "Mystic AI";
    private static final boolean PREMIUM_FEATURES_ENABLED = false;
    private static final Map<Character, Integer> PYTHAGOREAN_CHART = new HashMap<>();
    private static final List<String> FREE_SECTIONS = List.of(
            "hero",
            "timing",
            "miniGuidance",
            "shareCard",
            "trust",
            "coreNumbers.lifePath",
            "coreNumbers.birthday"
    );
    private static final List<String> PREMIUM_SECTIONS = List.of(
            "coreNumbers.destiny",
            "coreNumbers.soulUrge",
            "combinedProfile",
            "profile.growthEdges",
            "profile.relationshipStyle",
            "timing.advanced"
    );
    private static final List<String> PREVIEW_SECTIONS = List.of(
            "combinedProfile",
            "coreNumbers.destiny",
            "coreNumbers.soulUrge"
    );
    private static final List<String> ALL_SECTIONS = List.of(
            "hero",
            "timing",
            "miniGuidance",
            "shareCard",
            "trust",
            "coreNumbers.lifePath",
            "coreNumbers.birthday",
            "coreNumbers.destiny",
            "coreNumbers.soulUrge",
            "combinedProfile",
            "profile.growthEdges",
            "profile.relationshipStyle",
            "timing.advanced"
    );

    static {
        String[] letters = {
                "ABCDEFGHI",
                "JKLMNOPQR",
                "STUVWXYZ"
        };
        for (String rowLetters : letters) {
            for (int col = 0; col < rowLetters.length(); col++) {
                char letter = rowLetters.charAt(col);
                PYTHAGOREAN_CHART.put(letter, col + 1);
            }
        }
    }

    public NumerologyResponse calculate(
            String name,
            String birthDateStr,
            String effectiveDateStr,
            String locale,
            String guidancePeriod
    ) {
        LocalDate birthDate = parseBirthDate(birthDateStr);
        LocalDate effectiveDate = parseEffectiveDate(effectiveDateStr, birthDate);
        boolean english = isEnglish(locale);
        String resolvedLocale = english ? "en" : "tr";
        boolean weeklyGuidance = isWeekly(guidancePeriod);
        String safeName = sanitizeDisplayName(name);
        String normalizedName = normalizeNameForCalculation(safeName);
        String generatedAt = Instant.now().toString();

        int lifePathRaw = sumDigits(String.format(
                "%04d%02d%02d",
                birthDate.getYear(),
                birthDate.getMonthValue(),
                birthDate.getDayOfMonth()
        ));
        int destinyRaw = calculateNameSum(normalizedName);
        int soulUrgeRaw = calculateVowelSum(normalizedName);
        int lifePathNumber = calculateLifePathNumber(birthDate);
        int birthdayNumber = reduceToSingleDigit(birthDate.getDayOfMonth());
        int destinyNumber = calculateDestinyNumber(normalizedName);
        int soulUrgeNumber = calculateSoulUrgeNumber(normalizedName, destinyNumber);

        List<NumerologyResponse.CoreNumber> coreNumbers = List.of(
                buildCoreNumber("lifePath", lifePathNumber, english),
                buildCoreNumber("birthday", birthdayNumber, english),
                buildCoreNumber("destiny", destinyNumber, english),
                buildCoreNumber("soulUrge", soulUrgeNumber, english)
        );

        int universalYear = calculateUniversalYear(effectiveDate.getYear());
        int personalYear = calculatePersonalYear(birthDate, effectiveDate.getYear());
        int personalMonth = calculatePersonalMonth(personalYear, effectiveDate.getMonthValue());
        int personalDay = calculatePersonalDay(personalMonth, effectiveDate.getDayOfMonth());
        int cycleProgress = calculateCycleProgress(effectiveDate);
        String yearPhase = buildYearPhase(effectiveDate, english);
        String shortTheme = describePersonalYearTheme(personalYear, english);
        String currentPeriodFocus = buildCurrentPeriodFocus(personalYear, yearPhase, english);
        String nextRefreshAt = buildNextRefreshAt(effectiveDate, weeklyGuidance);

        NumerologyResponse.Timing timing = new NumerologyResponse.Timing(
                personalYear,
                universalYear,
                personalMonth,
                personalDay,
                cycleProgress,
                yearPhase,
                currentPeriodFocus,
                shortTheme,
                nextRefreshAt
        );

        NumerologyResponse.ClassicCycle classicCycle = buildClassicCycle(
                birthDate,
                effectiveDate,
                lifePathNumber,
                english
        );
        NumerologyResponse.KarmicDebt karmicDebt = buildKarmicDebt(
                lifePathRaw,
                destinyRaw,
                soulUrgeRaw,
                birthDate.getDayOfMonth(),
                english
        );

        DominantNumber dominant = determineDominantNumber(lifePathNumber, birthdayNumber, destinyNumber, soulUrgeNumber);
        CombinedInsights combinedInsights = buildCombinedInsights(
                lifePathNumber,
                birthdayNumber,
                destinyNumber,
                soulUrgeNumber,
                personalYear,
                dominant,
                english
        );

        NumerologyResponse.CombinedProfile combinedProfile = new NumerologyResponse.CombinedProfile(
                dominant.id(),
                dominant.value(),
                combinedInsights.dominantEnergy(),
                combinedInsights.innerConflict(),
                combinedInsights.naturalStyle(),
                combinedInsights.decisionStyle(),
                combinedInsights.relationshipStyle(),
                combinedInsights.growthArc(),
                combinedInsights.compatibilityTeaser()
        );

        NumerologyResponse.Profile profile = new NumerologyResponse.Profile(
                buildProfileEssence(lifePathNumber, destinyNumber, soulUrgeNumber, personalYear, english),
                buildStrengths(coreNumbers),
                buildGrowthEdges(coreNumbers),
                buildReflectionPrompt(dominant.value(), personalYear, english)
        );

        int seed = Math.abs(Objects.hash(normalizedName, birthDateStr, effectiveDate.toString(), VERSION, guidancePeriod));
        NumerologyResponse.AngelSignal angelSignal = buildAngelSignal(
                personalDay,
                effectiveDate,
                seed,
                english,
                weeklyGuidance
        );
        NumerologyResponse.MiniGuidance miniGuidance = new NumerologyResponse.MiniGuidance(
                buildDailyFocus(personalYear, seed, english, weeklyGuidance),
                buildMiniGuidance(personalYear, dominant.value(), yearPhase, seed, english, weeklyGuidance),
                buildReflectionPromptOfDay(dominant.value(), seed, english, weeklyGuidance),
                buildValidFor(effectiveDate, english, weeklyGuidance)
        );

        String headline = buildHeadline(personalYear, dominant.value(), shortTheme, english);
        String annualSnapshotKey = buildAnnualSnapshotKey(normalizedName, birthDateStr, effectiveDate.getYear());

        NumerologyResponse.ShareCardPayload shareCardPayload = new NumerologyResponse.ShareCardPayload(
                safeName,
                dominant.value(),
                headline,
                personalYear,
                shortTheme,
                CONTENT_VERSION,
                generatedAt,
                BRAND_MARK
        );

        NumerologyResponse.CalculationMeta calculationMeta = new NumerologyResponse.CalculationMeta(
                t(english, "Takvim yılı yöntemi", "Calendar year method"),
                t(english, "11, 22 ve 33 indirgenmeden korunur.", "11, 22, and 33 remain unreduced."),
                List.of(
                        t(
                                english,
                                "Türkçe karakterler hesaplama öncesi Latin eşdeğerlerine normalize edilir.",
                                "Turkish characters are normalized to Latin equivalents before calculation."
                        ),
                        t(
                                english,
                                "İsimde yalnızca harfler numeroloji toplamına dahil edilir.",
                                "Only letters from the name are included in numerology totals."
                        )
                ),
                List.of(
                        t(
                                english,
                                "Life Path = doğum tarihindeki tüm rakamların toplamı, sonra indirgeme.",
                                "Life Path = sum all birth-date digits, then reduce."
                        ),
                        t(
                                english,
                                "Birthday Number = gün hanesinin indirgenmiş hali.",
                                "Birthday Number = reduced day-of-month value."
                        ),
                        t(
                                english,
                                "Destiny = isim harf değerlerinin toplamı.",
                                "Destiny = sum of full-name letter values."
                        ),
                        t(
                                english,
                                "Soul Urge = isimdeki sesli harflerin toplamı.",
                                "Soul Urge = sum of vowels in the name."
                        ),
                        t(
                                english,
                                "Personal Month = kişisel yıl + ay numarası.",
                                "Personal Month = personal year + month number."
                        ),
                        t(
                                english,
                                "Personal Day = kişisel ay + gün numarası.",
                                "Personal Day = personal month + day number."
                        ),
                        t(
                                english,
                                "Pinnacle / Challenge döngüleri yaşam evrelerine göre hesaplanır.",
                                "Pinnacle / Challenge cycles are calculated by life stages."
                        )
                )
        );

        String summary = buildSummary(headline, timing, combinedProfile, miniGuidance, angelSignal, english);

        return new NumerologyResponse(
                safeName,
                birthDateStr,
                headline,
                coreNumbers,
                timing,
                classicCycle,
                karmicDebt,
                angelSignal,
                profile,
                combinedProfile,
                miniGuidance,
                shareCardPayload,
                calculationMeta,
                buildSectionLockState(),
                summary,
                generatedAt,
                VERSION,
                CONTENT_VERSION,
                CALCULATION_VERSION,
                resolvedLocale,
                generatedAt,
                annualSnapshotKey
        );
    }

    private NumerologyResponse.SectionLockState buildSectionLockState() {
        if (!PREMIUM_FEATURES_ENABLED) {
            return new NumerologyResponse.SectionLockState(ALL_SECTIONS, List.of(), List.of());
        }
        return new NumerologyResponse.SectionLockState(FREE_SECTIONS, PREMIUM_SECTIONS, PREVIEW_SECTIONS);
    }

    private LocalDate parseBirthDate(String birthDateStr) {
        try {
            return LocalDate.parse(birthDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid birth date format. Please use YYYY-MM-DD format.");
        }
    }

    private LocalDate parseEffectiveDate(String effectiveDateStr, LocalDate fallbackDate) {
        if (effectiveDateStr == null || effectiveDateStr.isBlank()) {
            return LocalDate.now();
        }

        try {
            return LocalDate.parse(effectiveDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            return fallbackDate != null ? LocalDate.now() : LocalDate.now();
        }
    }

    private boolean isEnglish(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("en");
    }

    private boolean isWeekly(String guidancePeriod) {
        if (guidancePeriod == null) {
            return false;
        }
        String normalized = guidancePeriod.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("week") || normalized.equals("weekly");
    }

    private String sanitizeDisplayName(String name) {
        if (name == null || name.isBlank()) {
            return "Mystic Soul";
        }
        return name.trim().replaceAll("\\s+", " ");
    }

    private int calculateLifePathNumber(LocalDate birthDate) {
        String dateStr = String.format(
                "%04d%02d%02d",
                birthDate.getYear(),
                birthDate.getMonthValue(),
                birthDate.getDayOfMonth()
        );
        return reduceToSingleDigit(sumDigits(dateStr));
    }

    private int calculateDestinyNumber(String normalizedName) {
        return reduceToSingleDigit(calculateNameSum(normalizedName));
    }

    private int calculateSoulUrgeNumber(String normalizedName, int destinyNumber) {
        int sum = calculateVowelSum(normalizedName);
        if (sum == 0) {
            return destinyNumber;
        }
        return reduceToSingleDigit(sum);
    }

    private int calculateNameSum(String normalizedName) {
        int sum = 0;
        for (char c : normalizedName.toCharArray()) {
            Integer value = PYTHAGOREAN_CHART.get(c);
            if (value != null) {
                sum += value;
            }
        }
        return sum;
    }

    private int calculateVowelSum(String normalizedName) {
        int sum = 0;
        for (char c : normalizedName.toCharArray()) {
            if (isVowel(c)) {
                Integer value = PYTHAGOREAN_CHART.get(c);
                if (value != null) {
                    sum += value;
                }
            }
        }
        return sum;
    }

    private int calculateUniversalYear(int year) {
        return reduceToSingleDigit(sumDigits(String.valueOf(year)));
    }

    private int calculatePersonalYear(LocalDate birthDate, int effectiveYear) {
        int monthDigits = sumDigits(String.valueOf(birthDate.getMonthValue()));
        int dayDigits = sumDigits(String.valueOf(birthDate.getDayOfMonth()));
        int yearDigits = sumDigits(String.valueOf(effectiveYear));
        return reduceToSingleDigit(monthDigits + dayDigits + yearDigits);
    }

    private int calculatePersonalMonth(int personalYear, int month) {
        return reduceToSingleDigit(personalYear + month);
    }

    private int calculatePersonalDay(int personalMonth, int day) {
        return reduceToSingleDigit(personalMonth + day);
    }

    private String buildNextRefreshAt(LocalDate effectiveDate, boolean weeklyGuidance) {
        return weeklyGuidance
                ? effectiveDate.plusDays(7).toString()
                : effectiveDate.plusDays(1).toString();
    }

    private int calculateCycleProgress(LocalDate effectiveDate) {
        LocalDate yearStart = LocalDate.of(effectiveDate.getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(effectiveDate.getYear(), 12, 31);
        long elapsed = ChronoUnit.DAYS.between(yearStart, effectiveDate) + 1;
        long total = ChronoUnit.DAYS.between(yearStart, yearEnd) + 1;
        double ratio = total <= 0 ? 0d : (double) elapsed / (double) total;
        return (int) Math.max(1, Math.min(100, Math.round(ratio * 100d)));
    }

    private String normalizeNameForCalculation(String name) {
        String mapped = name
                .replace('Ç', 'C').replace('ç', 'c')
                .replace('Ğ', 'G').replace('ğ', 'g')
                .replace('İ', 'I').replace('ı', 'i')
                .replace('Ö', 'O').replace('ö', 'o')
                .replace('Ş', 'S').replace('ş', 's')
                .replace('Ü', 'U').replace('ü', 'u');

        String normalized = Normalizer.normalize(mapped, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return normalized.replaceAll("[^A-Za-z]", "").toUpperCase(Locale.ROOT);
    }

    private boolean isVowel(char c) {
        return c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U';
    }

    private int sumDigits(String value) {
        int sum = 0;
        for (char c : value.toCharArray()) {
            if (Character.isDigit(c)) {
                sum += Character.getNumericValue(c);
            }
        }
        return sum;
    }

    private int reduceToSingleDigit(int number) {
        if (isMasterNumber(number)) {
            return number;
        }

        while (number > 9) {
            int sum = 0;
            while (number > 0) {
                sum += number % 10;
                number /= 10;
            }
            number = sum;
            if (isMasterNumber(number)) {
                break;
            }
        }
        return number;
    }

    private boolean isMasterNumber(int number) {
        return number == 11 || number == 22 || number == 33;
    }

    private NumerologyResponse.ClassicCycle buildClassicCycle(
            LocalDate birthDate,
            LocalDate effectiveDate,
            int lifePathNumber,
            boolean english
    ) {
        int monthBase = reduceToSingleDigit(birthDate.getMonthValue());
        int dayBase = reduceToSingleDigit(birthDate.getDayOfMonth());
        int yearBase = reduceToSingleDigit(sumDigits(String.valueOf(birthDate.getYear())));

        int p1 = reduceToSingleDigit(monthBase + dayBase);
        int p2 = reduceToSingleDigit(dayBase + yearBase);
        int p3 = reduceToSingleDigit(p1 + p2);
        int p4 = reduceToSingleDigit(monthBase + yearBase);

        int c1 = reduceChallenge(Math.abs(monthBase - dayBase));
        int c2 = reduceChallenge(Math.abs(dayBase - yearBase));
        int c3 = reduceChallenge(Math.abs(c1 - c2));
        int c4 = reduceChallenge(Math.abs(monthBase - yearBase));

        int age = Math.max(0, (int) ChronoUnit.YEARS.between(birthDate, effectiveDate));
        int firstSpanEnd = Math.max(27, 36 - reduceForCycle(lifePathNumber));
        int secondSpanEnd = firstSpanEnd + 9;
        int thirdSpanEnd = secondSpanEnd + 9;

        List<NumerologyResponse.PinnaclePhase> pinnacles = List.of(
                new NumerologyResponse.PinnaclePhase(1, p1, 0, firstSpanEnd, describePinnacleTheme(p1, english)),
                new NumerologyResponse.PinnaclePhase(2, p2, firstSpanEnd + 1, secondSpanEnd, describePinnacleTheme(p2, english)),
                new NumerologyResponse.PinnaclePhase(3, p3, secondSpanEnd + 1, thirdSpanEnd, describePinnacleTheme(p3, english)),
                new NumerologyResponse.PinnaclePhase(4, p4, thirdSpanEnd + 1, 120, describePinnacleTheme(p4, english))
        );

        List<NumerologyResponse.ChallengePhase> challenges = List.of(
                new NumerologyResponse.ChallengePhase(1, c1, 0, firstSpanEnd, describeChallengeFocus(c1, english)),
                new NumerologyResponse.ChallengePhase(2, c2, firstSpanEnd + 1, secondSpanEnd, describeChallengeFocus(c2, english)),
                new NumerologyResponse.ChallengePhase(3, c3, secondSpanEnd + 1, thirdSpanEnd, describeChallengeFocus(c3, english)),
                new NumerologyResponse.ChallengePhase(4, c4, thirdSpanEnd + 1, 120, describeChallengeFocus(c4, english))
        );

        List<NumerologyResponse.LifeCyclePhase> lifeCycles = List.of(
                new NumerologyResponse.LifeCyclePhase(
                        "formative",
                        monthBase,
                        0,
                        27,
                        t(english, "Temel Kurulum", "Formative Cycle"),
                        describeLifeCycleTheme(monthBase, english)
                ),
                new NumerologyResponse.LifeCyclePhase(
                        "productive",
                        dayBase,
                        28,
                        56,
                        t(english, "Üretim ve Sorumluluk", "Productive Cycle"),
                        describeLifeCycleTheme(dayBase, english)
                ),
                new NumerologyResponse.LifeCyclePhase(
                        "harvest",
                        yearBase,
                        57,
                        120,
                        t(english, "Hasat ve Aktarım", "Harvest Cycle"),
                        describeLifeCycleTheme(yearBase, english)
                )
        );

        return new NumerologyResponse.ClassicCycle(
                pinnacles,
                challenges,
                lifeCycles,
                findActiveAgePhase(age, pinnacles),
                findActiveAgePhase(age, challenges),
                findActiveAgePhase(age, lifeCycles)
        );
    }

    private NumerologyResponse.KarmicDebt buildKarmicDebt(
            int lifePathRaw,
            int destinyRaw,
            int soulUrgeRaw,
            int birthdayRaw,
            boolean english
    ) {
        List<Integer> debts = new ArrayList<>();
        List<String> sources = new ArrayList<>();

        detectKarmicDebt(debts, sources, lifePathRaw, t(english, "Yaşam yolu toplamı", "Life Path total"));
        detectKarmicDebt(debts, sources, destinyRaw, t(english, "Kader toplamı", "Destiny total"));
        detectKarmicDebt(debts, sources, soulUrgeRaw, t(english, "Ruh güdüsü toplamı", "Soul Urge total"));
        detectKarmicDebt(debts, sources, birthdayRaw, t(english, "Doğum günü", "Birthday number"));

        String summary = debts.isEmpty()
                ? t(
                        english,
                        "Bu okumada baskın bir karmik borç sayısı görünmüyor. Tema daha çok güncel döngü ve eylem netliği.",
                        "No dominant karmic debt number is visible in this reading. The theme is mostly current cycle and action clarity."
                )
                : t(
                        english,
                        "Karmik borç sayıları bu dönemde tekrar eden öğrenme temalarını işaret ediyor. Sert kader değil, farkındalık çağrısıdır.",
                        "Karmic debt numbers indicate repeating learning themes in this period. They are awareness calls, not rigid fate."
                );

        return new NumerologyResponse.KarmicDebt(debts, sources, summary);
    }

    private NumerologyResponse.AngelSignal buildAngelSignal(
            int personalDay,
            LocalDate effectiveDate,
            int seed,
            boolean english,
            boolean weeklyGuidance
    ) {
        int digit = Math.max(1, Math.min(9, Math.floorMod(personalDay + effectiveDate.getDayOfMonth() + seed, 9) + 1));
        int angelNumber = digit * 111;
        return new NumerologyResponse.AngelSignal(
                angelNumber,
                angelMeaning(digit, english),
                angelAction(digit, english),
                weeklyGuidance
                        ? t(english, "Bu hafta", "This week")
                        : effectiveDate.toString()
        );
    }

    private void detectKarmicDebt(List<Integer> debts, List<String> sources, int value, String sourceLabel) {
        if (value == 13 || value == 14 || value == 16 || value == 19) {
            if (!debts.contains(value)) {
                debts.add(value);
            }
            sources.add(sourceLabel);
        }
    }

    private int reduceChallenge(int value) {
        if (value <= 9) {
            return value;
        }
        return sumDigits(String.valueOf(value));
    }

    private int reduceForCycle(int value) {
        if (value <= 9) {
            return value;
        }
        return sumDigits(String.valueOf(value));
    }

    private int findActiveAgePhase(int age, List<? extends Object> phases) {
        for (int i = 0; i < phases.size(); i++) {
            Object phase = phases.get(i);
            int startAge;
            int endAge;
            if (phase instanceof NumerologyResponse.PinnaclePhase pinnacle) {
                startAge = pinnacle.startAge();
                endAge = pinnacle.endAge();
            } else if (phase instanceof NumerologyResponse.ChallengePhase challenge) {
                startAge = challenge.startAge();
                endAge = challenge.endAge();
            } else if (phase instanceof NumerologyResponse.LifeCyclePhase lifeCycle) {
                startAge = lifeCycle.startAge();
                endAge = lifeCycle.endAge();
            } else {
                continue;
            }

            if (age >= startAge && age <= endAge) {
                return i;
            }
        }
        return Math.max(0, phases.size() - 1);
    }

    private String describePinnacleTheme(int number, boolean english) {
        return switch (number) {
            case 1 -> t(english, "Başlatma ve liderlik", "Initiation and leadership");
            case 2 -> t(english, "Uyum ve ortaklık", "Harmony and partnership");
            case 3 -> t(english, "İfade ve görünürlük", "Expression and visibility");
            case 4 -> t(english, "Yapı ve disiplin", "Structure and discipline");
            case 5 -> t(english, "Değişim ve cesaret", "Change and courage");
            case 6 -> t(english, "Sorumluluk ve bakım", "Responsibility and care");
            case 7 -> t(english, "Derinlik ve içgörü", "Depth and insight");
            case 8 -> t(english, "Sonuç ve güç", "Results and power");
            case 9 -> t(english, "Tamamlama ve bırakma", "Completion and release");
            case 11 -> t(english, "Sezgi ve ilham", "Intuition and inspiration");
            case 22 -> t(english, "Büyük inşa", "Large-scale building");
            case 33 -> t(english, "Şefkatli hizmet", "Compassionate service");
            default -> t(english, "Kişisel büyüme", "Personal growth");
        };
    }

    private String describeChallengeFocus(int number, boolean english) {
        return switch (number) {
            case 0 -> t(english, "Açık alan: yönünü özgürce seçebilirsin.", "Open field: you can choose your direction freely.");
            case 1 -> t(english, "Benlik ve net sınır koyma", "Selfhood and setting clear boundaries");
            case 2 -> t(english, "Duygusal denge ve sabır", "Emotional balance and patience");
            case 3 -> t(english, "Dağılmadan ifade", "Expression without scattering");
            case 4 -> t(english, "Esneklik içinde düzen", "Order with flexibility");
            case 5 -> t(english, "Özgürlükte tutarlılık", "Consistency within freedom");
            case 6 -> t(english, "Bakım verirken öz bakım", "Self-care while caring for others");
            case 7 -> t(english, "Aşırı analiz yerine netlik", "Clarity instead of over-analysis");
            case 8 -> t(english, "Güç kullanımında denge", "Balance in using power");
            case 9 -> t(english, "Bırakma ve kapanış", "Release and closure");
            default -> t(english, "Farkındalık ve denge", "Awareness and balance");
        };
    }

    private String describeLifeCycleTheme(int number, boolean english) {
        return switch (number) {
            case 1, 8 -> t(english, "Öne çıkma, karar alma, etki yaratma", "Stepping forward, deciding, and creating impact");
            case 2, 6 -> t(english, "İlişki, bakım, ortak ritim", "Relationship, care, and shared rhythm");
            case 3, 5 -> t(english, "İfade, yenilenme, hareket", "Expression, renewal, and movement");
            case 4 -> t(english, "Sistem kurma, istikrar", "Building systems and stability");
            case 7, 11 -> t(english, "İçe dönüş, sezgi, anlam", "Introspection, intuition, and meaning");
            case 9, 33 -> t(english, "Hizmet, tamamlama, aktarım", "Service, completion, and transmission");
            case 22 -> t(english, "Vizyonu somuta indirme", "Turning vision into structure");
            default -> t(english, "Kişisel gelişim", "Personal development");
        };
    }

    private String angelMeaning(int digit, boolean english) {
        return switch (digit) {
            case 1 -> t(english, "Yeni başlangıç enerjisi", "A new beginning energy");
            case 2 -> t(english, "Denge ve ortaklık sinyali", "A signal for balance and partnership");
            case 3 -> t(english, "İfade et ve görünür ol", "Express and be visible");
            case 4 -> t(english, "Temelini güçlendir", "Strengthen your foundations");
            case 5 -> t(english, "Değişime alan aç", "Make room for change");
            case 6 -> t(english, "Bağlarını ve sorumluluklarını düzenle", "Align your bonds and responsibilities");
            case 7 -> t(english, "Sakinleş, derinleş", "Slow down and deepen");
            case 8 -> t(english, "Somut sonuç odaklı kal", "Stay focused on concrete results");
            case 9 -> t(english, "Tamamla ve hafifle", "Complete and lighten");
            default -> t(english, "Günün akışını sadeleştir", "Simplify the flow of your day");
        };
    }

    private String angelAction(int digit, boolean english) {
        return switch (digit) {
            case 1 -> t(english, "Bugün tek bir yeni adım başlat.", "Start one new step today.");
            case 2 -> t(english, "Bir konuşmada önce dinleyip sonra cevap ver.", "Listen first, then respond in one conversation.");
            case 3 -> t(english, "Aklındaki fikri kısa bir notla görünür kıl.", "Make one idea visible with a short note.");
            case 4 -> t(english, "Yarım kalan tek bir işi kapat.", "Close one unfinished task.");
            case 5 -> t(english, "Rutinine küçük bir yenilik ekle.", "Add one small novelty to your routine.");
            case 6 -> t(english, "Birine destek olurken sınırını da söyle.", "State your boundary while supporting someone.");
            case 7 -> t(english, "15 dakikalık sessiz bir düşünme alanı aç.", "Create a 15-minute quiet reflection block.");
            case 8 -> t(english, "Ölçülebilir tek bir hedef belirle.", "Set one measurable target.");
            case 9 -> t(english, "Seni yoran bir yükü bugün bırak.", "Release one burden that drains you today.");
            default -> t(english, "Bugünü sade tut.", "Keep today simple.");
        };
    }

    private NumerologyResponse.CoreNumber buildCoreNumber(String id, int value, boolean english) {
        return new NumerologyResponse.CoreNumber(
                id,
                value,
                coreTitle(id, english),
                numberArchetype(value, english),
                numberEssence(value, english),
                numberGifts(value, english),
                numberWatchouts(value, english),
                numberTryThisToday(value, english),
                isMasterNumber(value)
        );
    }

    private String coreTitle(String id, boolean english) {
        return switch (id) {
            case "lifePath" -> t(english, "Yaşam Yolu", "Life Path");
            case "birthday" -> t(english, "Doğum Günü Sayısı", "Birthday Number");
            case "destiny" -> t(english, "Kader Sayısı", "Destiny Number");
            case "soulUrge" -> t(english, "Ruh Güdüsü", "Soul Urge");
            default -> t(english, "Temel Sayı", "Core Number");
        };
    }

    private String numberArchetype(int number, boolean english) {
        return switch (number) {
            case 1 -> t(english, "Başlatan", "Initiator");
            case 2 -> t(english, "Dengeleyen", "Harmonizer");
            case 3 -> t(english, "İfade Eden", "Expressive");
            case 4 -> t(english, "Kurucu", "Builder");
            case 5 -> t(english, "Gezgin", "Explorer");
            case 6 -> t(english, "Koruyucu", "Caretaker");
            case 7 -> t(english, "Derin Gözlemci", "Seeker");
            case 8 -> t(english, "Stratejist", "Strategist");
            case 9 -> t(english, "Tamamlayıcı", "Humanitarian");
            case 11 -> t(english, "Sezgisel Elçi", "Intuitive Messenger");
            case 22 -> t(english, "Usta Kurucu", "Master Builder");
            case 33 -> t(english, "Şifacı Öğretmen", "Healing Teacher");
            default -> t(english, "Ritim Taşıyıcı", "Pattern Carrier");
        };
    }

    private String numberEssence(int number, boolean english) {
        return switch (number) {
            case 1 -> t(english, "Öne çıkıp yön vermek senin doğal ritmin.", "You naturally move by stepping forward and setting direction.");
            case 2 -> t(english, "İnsanları ve duyguları ayarlayan yumuşak bir radarın var.", "You have a soft radar for tuning people and emotions.");
            case 3 -> t(english, "Anlamı görünür kılmak için ifade ve yaratıcılık ararsın.", "You look for expression and creativity to make meaning visible.");
            case 4 -> t(english, "Düzeni, güveni ve sürdürülebilir ilerlemeyi inşa edersin.", "You build order, safety, and sustainable progress.");
            case 5 -> t(english, "Hareket, deneyim ve yenilenme seni canlı tutar.", "Movement, experience, and renewal keep you alive.");
            case 6 -> t(english, "Bakım vermek ve ait hissettirmek merkez enerjindir.", "Care, belonging, and support sit at your center.");
            case 7 -> t(english, "Derinlik, analiz ve sessiz içgörü senin asıl alanın.", "Depth, analysis, and quiet insight are your natural field.");
            case 8 -> t(english, "Sonuç almak, yapı kurmak ve etki yaratmak istersin.", "You want to create results, structure, and visible impact.");
            case 9 -> t(english, "Büyük resmi görmek ve katkı sunmak seni büyütür.", "Seeing the big picture and contributing makes you grow.");
            case 11 -> t(english, "Sezgi ile ilham arasında çalışan yüksek hassasiyetli bir kanalın var.", "You carry a high-sensitivity channel between intuition and inspiration.");
            case 22 -> t(english, "Vizyonu somutlaştırma kapasiten güçlü; büyük resmi dünyaya indirebilirsin.", "You can materialize vision and bring large ideas into the world.");
            case 33 -> t(english, "Şefkat, rehberlik ve iyileştirme eğilimi baskın çalışır.", "Compassion, guidance, and healing are especially strong in you.");
            default -> t(english, "Sayıların karışımı kendi ritmini oluşturuyor.", "Your numbers combine into a distinct personal rhythm.");
        };
    }

    private List<String> numberGifts(int number, boolean english) {
        return switch (number) {
            case 1 -> List.of(
                    t(english, "Başlatıcı cesaret", "Starter courage"),
                    t(english, "Yön verme netliği", "Directional clarity"),
                    t(english, "Bağımsız karar", "Independent decision-making")
            );
            case 2 -> List.of(
                    t(english, "İnce sezgi", "Subtle intuition"),
                    t(english, "Arabuluculuk", "Mediation"),
                    t(english, "Ortak ritim kurma", "Creating shared rhythm")
            );
            case 3 -> List.of(
                    t(english, "Yaratıcı ifade", "Creative expression"),
                    t(english, "Sosyal ısınma", "Social warmth"),
                    t(english, "İlham yayma", "Spreading inspiration")
            );
            case 4 -> List.of(
                    t(english, "Plan kurma", "Planning"),
                    t(english, "Süreklilik", "Consistency"),
                    t(english, "Sistem disiplini", "System discipline")
            );
            case 5 -> List.of(
                    t(english, "Hızlı uyum", "Quick adaptation"),
                    t(english, "Deneyim cesareti", "Courage for experience"),
                    t(english, "Esnek düşünme", "Flexible thinking")
            );
            case 6 -> List.of(
                    t(english, "Koruyucu bağlılık", "Protective devotion"),
                    t(english, "Bakım verme", "Nurturing"),
                    t(english, "İlişki sorumluluğu", "Relational responsibility")
            );
            case 7 -> List.of(
                    t(english, "Analitik derinlik", "Analytical depth"),
                    t(english, "Sessiz sezgi", "Quiet intuition"),
                    t(english, "Anlam çıkarma", "Meaning-making")
            );
            case 8 -> List.of(
                    t(english, "Stratejik bakış", "Strategic perspective"),
                    t(english, "Sonuç odak", "Results focus"),
                    t(english, "Kaynak yönetimi", "Resource management")
            );
            case 9 -> List.of(
                    t(english, "Empati", "Empathy"),
                    t(english, "Büyük resmi görme", "Big-picture vision"),
                    t(english, "İyileştirici etki", "Healing influence")
            );
            case 11 -> List.of(
                    t(english, "Yüksek sezgi", "High intuition"),
                    t(english, "İlham verme", "Inspiring others"),
                    t(english, "İnce farkındalık", "Refined awareness")
            );
            case 22 -> List.of(
                    t(english, "Vizyonu yapılandırma", "Structuring vision"),
                    t(english, "Büyük ölçekli üretim", "Large-scale execution"),
                    t(english, "Pratik liderlik", "Practical leadership")
            );
            case 33 -> List.of(
                    t(english, "Şefkatli rehberlik", "Compassionate guidance"),
                    t(english, "Topluluğu toparlama", "Gathering community"),
                    t(english, "Öğretici sıcaklık", "Teaching warmth")
            );
            default -> List.of(t(english, "Kişisel ritim", "Personal rhythm"));
        };
    }

    private List<String> numberWatchouts(int number, boolean english) {
        return switch (number) {
            case 1 -> List.of(
                    t(english, "Tek başına yük alma", "Taking everything on alone"),
                    t(english, "Sabırsız çıkışlar", "Impatient starts")
            );
            case 2 -> List.of(
                    t(english, "Aşırı uyum", "Over-accommodating"),
                    t(english, "Kararsız kalma", "Getting stuck in indecision")
            );
            case 3 -> List.of(
                    t(english, "Dağınık enerji", "Scattered energy"),
                    t(english, "Yarım bırakma", "Leaving things half-finished")
            );
            case 4 -> List.of(
                    t(english, "Katılaşma", "Becoming rigid"),
                    t(english, "Her şeyi kontrol etme ihtiyacı", "Over-controlling every detail")
            );
            case 5 -> List.of(
                    t(english, "Dikkat dağılması", "Attention drift"),
                    t(english, "Rutinden fazla kaçış", "Escaping structure too quickly")
            );
            case 6 -> List.of(
                    t(english, "Herkesi taşıma", "Carrying everyone"),
                    t(english, "Kendi ihtiyacını erteleme", "Delaying your own needs")
            );
            case 7 -> List.of(
                    t(english, "Aşırı içe kapanma", "Withdrawing too much"),
                    t(english, "Aşırı analiz", "Over-analysis")
            );
            case 8 -> List.of(
                    t(english, "Sertleşen ton", "A hardening tone"),
                    t(english, "Sonuca kilitlenme", "Becoming outcome-locked")
            );
            case 9 -> List.of(
                    t(english, "Sınır erozyonu", "Boundary erosion"),
                    t(english, "Geçmişi taşımaya devam etme", "Holding on too long")
            );
            case 11 -> List.of(
                    t(english, "Duyusal aşırı yük", "Sensory overload"),
                    t(english, "Kaygıyı sezgi sanmak", "Mistaking anxiety for intuition")
            );
            case 22 -> List.of(
                    t(english, "Aşırı sorumluluk", "Excessive responsibility"),
                    t(english, "Mükemmeliyet baskısı", "Pressure for perfection")
            );
            case 33 -> List.of(
                    t(english, "Kurtarıcı rolüne kayma", "Sliding into rescuer mode"),
                    t(english, "Duygusal tükenme", "Emotional depletion")
            );
            default -> List.of(t(english, "Aşırı genelleme", "Over-generalizing"));
        };
    }

    private String numberTryThisToday(int number, boolean english) {
        return switch (number) {
            case 1 -> t(english, "Bugün tek bir konuda ilk adımı sen at.", "Take the first step yourself in one area today.");
            case 2 -> t(english, "Bir konuşmada tempoyu düşür ve önce dinle.", "Slow the pace of one conversation and listen first.");
            case 3 -> t(english, "Aklındaki fikri kısa bir not ya da mesajla görünür kıl.", "Make one idea visible through a short note or message.");
            case 4 -> t(english, "Yarım kalan tek bir işi kapat.", "Close one unfinished task.");
            case 5 -> t(english, "Rutinine küçük ama canlı bir değişiklik ekle.", "Add one small but energizing change to your routine.");
            case 6 -> t(english, "Bugün destek verirken kendi sınırını da cümleye koy.", "When you support someone today, include your own boundary too.");
            case 7 -> t(english, "Cevap aradığın konuyu yalnızca 15 dakika derin düşün.", "Give one important question 15 minutes of quiet thought.");
            case 8 -> t(english, "Tek bir hedef için ölçülebilir bir sonraki adımı yaz.", "Write down the next measurable step for one goal.");
            case 9 -> t(english, "Bugün yük hissettiren bir şeyi bilinçli biçimde bırak.", "Consciously release one thing that feels heavy today.");
            case 11 -> t(english, "Günün en temiz sezgisini yaz ve sakin bir adımla test et.", "Write down your clearest intuition and test it with one calm step.");
            case 22 -> t(english, "Büyük vizyonunu bugün yapılacak tek somut adıma indir.", "Reduce a big vision to one tangible action today.");
            case 33 -> t(english, "Birine destek olurken kendini de duygusal olarak koru.", "Support someone while protecting your own emotional energy.");
            default -> t(english, "Bugün tek bir temaya odaklan.", "Focus on one theme today.");
        };
    }

    private DominantNumber determineDominantNumber(int lifePath, int birthday, int destiny, int soulUrge) {
        List<DominantNumber> candidates = List.of(
                new DominantNumber("lifePath", lifePath, dominanceScore(lifePath, 4)),
                new DominantNumber("birthday", birthday, dominanceScore(birthday, 2)),
                new DominantNumber("destiny", destiny, dominanceScore(destiny, 3)),
                new DominantNumber("soulUrge", soulUrge, dominanceScore(soulUrge, 3))
        );

        DominantNumber winner = candidates.get(0);
        for (DominantNumber candidate : candidates) {
            if (candidate.score() > winner.score()) {
                winner = candidate;
            }
        }
        return winner;
    }

    private int dominanceScore(int value, int baseWeight) {
        int masterBoost = isMasterNumber(value) ? 40 : 0;
        return baseWeight * 10 + masterBoost + Math.min(value, 9);
    }

    private CombinedInsights buildCombinedInsights(
            int lifePath,
            int birthday,
            int destiny,
            int soulUrge,
            int personalYear,
            DominantNumber dominant,
            boolean english
    ) {
        String dominantEnergy = t(
                english,
                "%s baskın çalışıyor; bu yüzden dışarıda %s, içeride ise %s hissi taşıyorsun.",
                "%s is running strongest, so your outer style feels %s while your inner tone stays %s."
        ).formatted(
                coreTitle(dominant.id(), english),
                shortEnergyTag(lifePath, english),
                shortEnergyTag(soulUrge, english)
        );

        String innerConflict = buildInnerConflict(lifePath, soulUrge, english);
        String naturalStyle = t(
                english,
                "Doğal stilin %s ile %s arasında kuruluyor; hem %s hem de %s tarafın görünür.",
                "Your natural style sits between %s and %s; both your %s and %s sides are visible."
        ).formatted(
                coreTitle("lifePath", english),
                coreTitle("destiny", english),
                shortEnergyTag(lifePath, english),
                shortEnergyTag(destiny, english)
        );

        String decisionStyle = t(
                english,
                "Karar verirken önce %s yönünü, sonra %s ihtiyacını tartıyorsun.",
                "When making decisions, you weigh your %s direction first and your %s need right after."
        ).formatted(shortEnergyTag(lifePath, english), shortEnergyTag(soulUrge, english));

        String relationshipStyle = t(
                english,
                "İlişkilerde %s ve %s birlikte çalışıyor; yakınlık isterken kendi ritmini de korumak istiyorsun.",
                "In relationships, %s and %s work together; you want closeness without losing your own rhythm."
        ).formatted(shortEnergyTag(soulUrge, english), shortEnergyTag(destiny, english));

        String growthArc = t(
                english,
                "%s sayın, %d kişisel yılın içinde %s tarafını daha görünür kılmanı istiyor.",
                "Your birthday number asks you to make your %s side more visible inside personal year %d."
        ).formatted(shortEnergyTag(birthday, english), personalYear, shortEnergyTag(birthday, english));

        String compatibilityTeaser = t(
                english,
                "Uyum analizinde seni en iyi dengeleyen enerji, %s hızını yumuşatıp %s ihtiyacını duyan kişiler olur.",
                "In compatibility work, you are usually balanced by people who can soften your %s pace while hearing your %s needs."
        ).formatted(shortEnergyTag(lifePath, english), shortEnergyTag(soulUrge, english));

        return new CombinedInsights(
                dominantEnergy,
                innerConflict,
                naturalStyle,
                decisionStyle,
                relationshipStyle,
                growthArc,
                compatibilityTeaser
        );
    }

    private String buildInnerConflict(int lifePath, int soulUrge, boolean english) {
        EnergyGroup pathGroup = energyGroup(lifePath);
        EnergyGroup soulGroup = energyGroup(soulUrge);

        if (pathGroup == soulGroup) {
            return t(
                    english,
                    "Dış hedeflerin ile iç motivasyonun aynı ritimde çalışıyor; mesele hız değil, bu ritmi sürdürülebilir kılmak.",
                    "Your outer goals and inner motives work in the same rhythm; the work is not speed but sustainability."
            );
        }

        if ((pathGroup == EnergyGroup.INITIATIVE && soulGroup == EnergyGroup.RELATIONAL)
                || (pathGroup == EnergyGroup.RELATIONAL && soulGroup == EnergyGroup.INITIATIVE)) {
            return t(
                    english,
                    "İçeride uyum ararken dışarıda hızlı hareket etme eğilimin var; yakınlık ile bağımsızlık arasında gidip gelmen normal.",
                    "You seek harmony inside while moving fast outside; it is natural to swing between closeness and independence."
            );
        }

        if ((pathGroup == EnergyGroup.STRUCTURE && soulGroup == EnergyGroup.FREEDOM)
                || (pathGroup == EnergyGroup.FREEDOM && soulGroup == EnergyGroup.STRUCTURE)) {
            return t(
                    english,
                    "Bir yanın düzen ve güven isterken diğer yanın alan ve yenilik arıyor; sıkıştığında önce ritmi değil, esnekliği ayarla.",
                    "One side wants order and safety while the other wants space and novelty; when tension rises, adjust flexibility before tempo."
            );
        }

        if ((pathGroup == EnergyGroup.PRIVATE && soulGroup == EnergyGroup.EXPRESSIVE)
                || (pathGroup == EnergyGroup.EXPRESSIVE && soulGroup == EnergyGroup.PRIVATE)) {
            return t(
                    english,
                    "Hem görünmek hem de geri çekilip düşünmek istiyorsun; doğru doz, her şeyi aynı anda değil sırayla açmak.",
                    "You want both visibility and retreat; the right dose comes from opening things in sequence, not all at once."
            );
        }

        return t(
                english,
                "Sayıların arasında yaratıcı bir gerilim var; bu gerilim doğru kullanıldığında seni daha esnek ve daha bilinçli yapar.",
                "There is a creative tension between your numbers; used well, it makes you more flexible and more conscious."
        );
    }

    private EnergyGroup energyGroup(int number) {
        return switch (number) {
            case 1, 8, 22 -> EnergyGroup.INITIATIVE;
            case 2, 6, 9, 33 -> EnergyGroup.RELATIONAL;
            case 3 -> EnergyGroup.EXPRESSIVE;
            case 4 -> EnergyGroup.STRUCTURE;
            case 5 -> EnergyGroup.FREEDOM;
            case 7, 11 -> EnergyGroup.PRIVATE;
            default -> EnergyGroup.RELATIONAL;
        };
    }

    private String shortEnergyTag(int number, boolean english) {
        return switch (number) {
            case 1 -> t(english, "başlatan", "initiating");
            case 2 -> t(english, "dengeleyen", "harmonizing");
            case 3 -> t(english, "ifade eden", "expressive");
            case 4 -> t(english, "yapı kuran", "structuring");
            case 5 -> t(english, "özgürleşen", "liberating");
            case 6 -> t(english, "koruyucu", "protective");
            case 7 -> t(english, "derin düşünen", "reflective");
            case 8 -> t(english, "sonuç alan", "results-driven");
            case 9 -> t(english, "şefkatli", "compassionate");
            case 11 -> t(english, "sezgisel", "intuitive");
            case 22 -> t(english, "inşa eden", "building");
            case 33 -> t(english, "şifalandıran", "healing");
            default -> t(english, "ritimli", "patterned");
        };
    }

    private String buildProfileEssence(int lifePath, int destiny, int soulUrge, int personalYear, boolean english) {
        return t(
                english,
                "Çekirdeğinde %s, görünürde %s, içeride ise %s çalışıyor. %d kişisel yılında bunu daha bilinçli kullanman beklenir.",
                "At your core you are %s, outwardly %s, and inwardly %s. Personal year %d asks you to use that pattern more consciously."
        ).formatted(
                shortEnergyTag(lifePath, english),
                shortEnergyTag(destiny, english),
                shortEnergyTag(soulUrge, english),
                personalYear
        );
    }

    private List<String> buildStrengths(List<NumerologyResponse.CoreNumber> coreNumbers) {
        List<String> strengths = new ArrayList<>();
        for (NumerologyResponse.CoreNumber coreNumber : coreNumbers) {
            if (!coreNumber.gifts().isEmpty()) {
                strengths.add(coreNumber.gifts().get(0));
            }
            if (strengths.size() == 3) {
                break;
            }
        }
        return strengths;
    }

    private List<String> buildGrowthEdges(List<NumerologyResponse.CoreNumber> coreNumbers) {
        List<String> growthEdges = new ArrayList<>();
        for (NumerologyResponse.CoreNumber coreNumber : coreNumbers) {
            if (!coreNumber.watchouts().isEmpty()) {
                growthEdges.add(coreNumber.watchouts().get(0));
            }
            if (growthEdges.size() == 3) {
                break;
            }
        }
        return growthEdges;
    }

    private String buildYearPhase(LocalDate effectiveDate, boolean english) {
        int month = effectiveDate.getMonthValue();
        if (month <= 4) {
            return t(english, "Açılış Fazı", "Opening Phase");
        }
        if (month <= 8) {
            return t(english, "Derinleşme Fazı", "Deepening Phase");
        }
        return t(english, "Toparlama Fazı", "Integration Phase");
    }

    private String describePersonalYearTheme(int personalYear, boolean english) {
        return switch (personalYear) {
            case 1 -> t(english, "Yeni yön ve ilk adım yılı", "A year of new direction and first steps");
            case 2 -> t(english, "İlişki, sabır ve ayar yılı", "A year of relationship, patience, and calibration");
            case 3 -> t(english, "Görünürlük ve ifade yılı", "A year of visibility and expression");
            case 4 -> t(english, "Temel kurma ve disiplin yılı", "A year of foundations and discipline");
            case 5 -> t(english, "Değişim ve yenilenme yılı", "A year of change and renewal");
            case 6 -> t(english, "Bağlılık ve bakım yılı", "A year of devotion and care");
            case 7 -> t(english, "İçe dönüş ve anlam yılı", "A year of introspection and meaning");
            case 8 -> t(english, "Sonuç alma ve güç yılı", "A year of results and power");
            case 9 -> t(english, "Tamamlama ve bırakma yılı", "A year of completion and release");
            case 11 -> t(english, "Sezgi ve hassasiyet yılı", "A year of intuition and heightened sensitivity");
            case 22 -> t(english, "Büyük yapı kurma yılı", "A year of building something substantial");
            case 33 -> t(english, "Şifa ve hizmet yılı", "A year of healing and service");
            default -> t(english, "Kişisel döngü yılı", "A personal cycle year");
        };
    }

    private String buildCurrentPeriodFocus(int personalYear, String yearPhase, boolean english) {
        String phaseKey = yearPhase.toLowerCase(Locale.ROOT);
        if (phaseKey.contains("aç") || phaseKey.contains("opening")) {
            return switch (personalYear) {
                case 1, 5, 8, 22 -> t(english, "Yön seç, alan aç, cesur ama temiz başla.", "Choose direction, open space, and start with clean courage.");
                case 2, 6, 9, 33 -> t(english, "İlişkileri ve sorumlulukları sade biçimde düzenle.", "Reorganize relationships and responsibilities with clarity.");
                default -> t(english, "İç ritmini belirleyip fazla dağılan alanları toparla.", "Set your internal rhythm and gather scattered areas.");
            };
        }

        if (phaseKey.contains("derin") || phaseKey.contains("deep")) {
            return switch (personalYear) {
                case 3, 7, 11 -> t(english, "İçerik, fikir ve içgörüyü derinleştir.", "Deepen content, ideas, and insight.");
                case 4, 6, 8, 22 -> t(english, "Sistemi güçlendir; sürdürülebilir olanı seç.", "Strengthen the system and choose what will sustain.");
                default -> t(english, "Yarım kalanları netleştir ve ritmi bozan kalıpları fark et.", "Clarify loose ends and notice patterns that break rhythm.");
            };
        }

        return switch (personalYear) {
            case 9, 33 -> t(english, "Tamamla, yumuşat ve yükü hafiflet.", "Complete, soften, and lighten the load.");
            case 8, 22 -> t(english, "Sonuçları topla ama yapıyı koru.", "Collect results while protecting the structure.");
            default -> t(english, "Öğrenileni toplula ve bir sonraki döngüye temiz geç.", "Consolidate what you learned and enter the next cycle cleanly.");
        };
    }

    private String buildHeadline(int personalYear, int dominantNumber, String shortTheme, boolean english) {
        return t(
                english,
                "%d kişisel yılında %s tonun öne çıkıyor: %s.",
                "In personal year %d, your %s tone is leading: %s."
        ).formatted(personalYear, shortEnergyTag(dominantNumber, english), shortTheme);
    }

    private String buildDailyFocus(int personalYear, int seed, boolean english, boolean weeklyGuidance) {
        List<String> options = switch (personalYear) {
            case 1 -> List.of(
                    t(english, "Yeni başlangıç", "New beginning"),
                    t(english, "Net seçim", "Clear choice"),
                    t(english, "Kendi yönün", "Your own direction")
            );
            case 2 -> List.of(
                    t(english, "İlişki ayarı", "Relationship calibration"),
                    t(english, "Tempo yavaşlatma", "Slowing the tempo"),
                    t(english, "Sessiz netlik", "Quiet clarity")
            );
            case 3 -> List.of(
                    t(english, "İfade", "Expression"),
                    t(english, "Görünürlük", "Visibility"),
                    t(english, "Yaratıcı akış", "Creative flow")
            );
            case 4 -> List.of(
                    t(english, "Yapı", "Structure"),
                    t(english, "Disiplin", "Discipline"),
                    t(english, "Tek işi bitirme", "Closing one task")
            );
            case 5 -> List.of(
                    t(english, "Esneklik", "Flexibility"),
                    t(english, "Hareket", "Movement"),
                    t(english, "Yeni deneyim", "New experience")
            );
            case 6 -> List.of(
                    t(english, "Bakım ve sınır", "Care and boundaries"),
                    t(english, "Yakın bağlar", "Close bonds"),
                    t(english, "Ev ritmi", "Home rhythm")
            );
            case 7 -> List.of(
                    t(english, "Derin düşünce", "Deep thought"),
                    t(english, "Sessiz alan", "Quiet space"),
                    t(english, "Anlam çıkarma", "Meaning-making")
            );
            case 8 -> List.of(
                    t(english, "Sonuç odak", "Result focus"),
                    t(english, "Kaynak yönetimi", "Resource management"),
                    t(english, "Kararlı adım", "Decisive action")
            );
            case 9 -> List.of(
                    t(english, "Tamamlama", "Completion"),
                    t(english, "Bırakma", "Release"),
                    t(english, "Büyük resim", "Big picture")
            );
            case 11 -> List.of(
                    t(english, "Sezgi", "Intuition"),
                    t(english, "İnce farkındalık", "Refined awareness"),
                    t(english, "İlham", "Inspiration")
            );
            case 22 -> List.of(
                    t(english, "Somutlaştırma", "Materializing"),
                    t(english, "Büyük plan", "Large plan"),
                    t(english, "Pratik liderlik", "Practical leadership")
            );
            case 33 -> List.of(
                    t(english, "Şefkat", "Compassion"),
                    t(english, "Hizmet", "Service"),
                    t(english, "İyileştirici temas", "Healing contact")
            );
            default -> List.of(t(english, "Odak", "Focus"));
        };

        String selected = options.get(Math.floorMod(seed, options.size()));
        if (!weeklyGuidance) {
            return selected;
        }
        return t(english, "%s teması", "%s theme").formatted(selected);
    }

    private String buildMiniGuidance(int personalYear, int dominantNumber, String yearPhase, int seed, boolean english, boolean weeklyGuidance) {
        List<String> options = new ArrayList<>();
        options.add(
                t(
                        english,
                        "%s içinde %s tarafını görünür kıl; küçük ama temiz bir aksiyon yeterli.",
                        "Inside %s, let your %s side become visible; one small clear action is enough."
                ).formatted(yearPhase, shortEnergyTag(dominantNumber, english))
        );
        options.add(
                t(
                        english,
                        "%d yılının ana dersi hız değil, doğru tondur. Bugün ritmi değil önceliği düzelt.",
                        "The key lesson of personal year %d is not speed but tone. Adjust priority before pace today."
                ).formatted(personalYear)
        );
        options.add(
                t(
                        english,
                        "%s ile gelen tema sende zaten var; bugün onu dışarı taşıracak kadar alan açman yeterli.",
                        "The theme of %s already lives in you; today, create enough room for it to come outside."
                ).formatted(describePersonalYearTheme(personalYear, english))
        );

        String selected = options.get(Math.floorMod(seed / 7, options.size()));
        if (weeklyGuidance) {
            return t(
                    english,
                    "Bu hafta: %s",
                    "This week: %s"
            ).formatted(selected);
        }
        return selected;
    }

    private String buildReflectionPromptOfDay(int dominantNumber, int seed, boolean english, boolean weeklyGuidance) {
        List<String> prompts = switch (dominantNumber) {
            case 1, 8, 22 -> List.of(
                    t(english, "Kontrol etmeye çalıştığım şey ile gerçekten yön vermem gereken şey aynı mı?", "Is what I am trying to control the same thing I truly need to lead?"),
                    t(english, "Bugün başlattığım şey bana mı ait, yoksa baskıyla mı doğuyor?", "Does what I am starting today belong to me, or is it being driven by pressure?")
            );
            case 2, 6, 9, 33 -> List.of(
                    t(english, "Uyum adına hangi ihtiyacımı geriye itiyorum?", "Which need am I pushing back in the name of harmony?"),
                    t(english, "Bakım verirken enerjimi nerede geri toplamam gerekiyor?", "Where do I need to gather my energy back while caring for others?")
            );
            case 3, 5 -> List.of(
                    t(english, "Bugün görünür kılmak istediğim tek fikir ne?", "What is the one idea I want to make visible today?"),
                    t(english, "Özgürlük arzum ile dikkat dağınıklığım arasındaki çizgi nerede?", "Where is the line between my desire for freedom and my distraction?")
            );
            case 4, 7, 11 -> List.of(
                    t(english, "Düzen kurma isteğim ile içe çekilme ihtiyacım birbirini nasıl etkiliyor?", "How do my need for order and my need for retreat affect each other?"),
                    t(english, "Bugün sessizlik bana neyi daha temiz gösterebilir?", "What might silence make clearer for me today?")
            );
            default -> List.of(
                    t(english, "Bugün beni en çok sakinleştiren seçim ne olur?", "What choice would steady me most today?")
            );
        };

        String selected = prompts.get(Math.floorMod(seed / 11, prompts.size()));
        if (!weeklyGuidance) {
            return selected;
        }
        return t(english, "Haftalık düşünme sorusu: %s", "Weekly reflection: %s").formatted(selected);
    }

    private String buildReflectionPrompt(int dominantNumber, int personalYear, boolean english) {
        String energyTag = shortEnergyTag(dominantNumber, english);
        if (english) {
            return "While using your %s energy inside personal year %d, what are you forcing too much and what are you not owning enough?"
                    .formatted(energyTag, personalYear);
        }

        return "%d kişisel yılında %s enerjini kullanırken neyi fazla zorluyor, neyi ise gereğinden az sahipleniyor olabilirsin?"
                .formatted(personalYear, energyTag);
    }

    private String buildValidFor(LocalDate effectiveDate, boolean english, boolean weeklyGuidance) {
        if (!weeklyGuidance) {
            return effectiveDate.toString();
        }

        LocalDate weekEnd = effectiveDate.plusDays(6);
        return t(
                english,
                "%s - %s haftası",
                "Week of %s - %s"
        ).formatted(effectiveDate, weekEnd);
    }

    private String buildSummary(
            String headline,
            NumerologyResponse.Timing timing,
            NumerologyResponse.CombinedProfile combinedProfile,
            NumerologyResponse.MiniGuidance miniGuidance,
            NumerologyResponse.AngelSignal angelSignal,
            boolean english
    ) {
        return String.join(
                "\n\n",
                headline,
                t(
                        english,
                        "Bu ay / bugün ritmi: Ay %d, Gün %d",
                        "This month/day rhythm: Month %d, Day %d"
                ).formatted(timing.personalMonth(), timing.personalDay()),
                t(
                        english,
                        "Bu dönem odağı: %s",
                        "Current period focus: %s"
                ).formatted(timing.currentPeriodFocus()),
                combinedProfile.dominantEnergy(),
                t(
                        english,
                        "Melek sinyali %d: %s",
                        "Angel signal %d: %s"
                ).formatted(angelSignal.angelNumber(), angelSignal.meaning()),
                t(
                        english,
                        "Günlük rehber: %s",
                        "Daily guidance: %s"
                ).formatted(miniGuidance.miniGuidance())
        );
    }

    private String buildAnnualSnapshotKey(String normalizedName, String birthDate, int year) {
        return year + "-" + Math.abs(Objects.hash(normalizedName, birthDate));
    }

    private String t(boolean english, String tr, String en) {
        return english ? en : tr;
    }

    private enum EnergyGroup {
        INITIATIVE,
        RELATIONAL,
        EXPRESSIVE,
        STRUCTURE,
        FREEDOM,
        PRIVATE
    }

    private record DominantNumber(String id, int value, int score) {
    }

    private record CombinedInsights(
            String dominantEnergy,
            String innerConflict,
            String naturalStyle,
            String decisionStyle,
            String relationshipStyle,
            String growthArc,
            String compatibilityTeaser
    ) {
    }
}
