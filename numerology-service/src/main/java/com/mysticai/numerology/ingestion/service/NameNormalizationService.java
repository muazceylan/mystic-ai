package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.NormalizedCandidateData;
import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NameNormalizationService {

    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_NORMALIZED_NAME_LENGTH = 255;
    private static final int MAX_ORIGIN_LENGTH = 255;

    private static final Pattern TITLE_NAME_PATTERN = Pattern.compile(
            "^\\s*([\\p{L}\\s'’\\-]+?)\\s+isminin",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern UFUK_MEANING_HEADER_PATTERN = Pattern.compile(
            "^\\s*[\\p{L}\\s'’\\-]+\\s+isminin\\s+anlam[ıi](?:\\s+nedir)?\\??\\s*[,;:\\-–]*\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern UFUK_LEADING_NAME_PATTERN = Pattern.compile(
            "^\\s*([\\p{L}'’\\-]+)\\s*[,;:\\-–]+\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern UFUK_LETTER_DISCLAIMER_PATTERN = Pattern.compile(
            "^\\s*[İIıi]simlerin\\s+harf\\s+analizleri\\s+bilimsel\\s+bir\\s+dayanağ[ıi][^:]{0,280}:\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern UFUK_LETTER_ANALYSIS_HEADER_PATTERN = Pattern.compile(
            "^\\s*(?:harf\\s+)?(?:analizi|nalizi|lizi|izi)\\s*[:\\-–]*\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern UFUK_LETTER_ANALYSIS_FRAGMENT_PATTERN = Pattern.compile(
            "^\\s*[\\p{L}]{1,12}(?:analizi|nalizi|lizi|izi)\\s*[:\\-–]*\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern LETTER_MARKER_PATTERN = Pattern.compile("(?U)[A-ZÇĞİÖŞÜ]:\\s*");

    private static final Map<SourceName, Double> SOURCE_BASE_CONFIDENCE = Map.of(
            SourceName.BEBEKISMI, 0.75,
            SourceName.SFK_ISTANBUL_EDU, 0.82,
            SourceName.ALFABETIK, 0.60,
            SourceName.UFUK, 0.78
    );

    public NormalizedCandidateData normalize(ParsedNameCandidateDraft draft, String rawTitle, boolean duplicateContentFlag) {
        String displayName = clampLength(TurkishStringUtil.normalizeDisplay(draft.name()), MAX_NAME_LENGTH);
        String normalizedName = clampLength(TurkishStringUtil.normalizeNameForComparison(displayName), MAX_NORMALIZED_NAME_LENGTH);

        ParsedGender gender = draft.gender() == null ? ParsedGender.UNKNOWN : draft.gender();
        if (gender == ParsedGender.UNKNOWN) {
            gender = inferGenderFromText(draft.meaningLong(), draft.meaningShort());
        }

        String meaningShort = cleanText(draft.meaningShort());
        String meaningLong = cleanText(draft.meaningLong());
        String character = cleanText(draft.characterTraitsText());
        String letter = cleanText(draft.letterAnalysisText());
        if (draft.sourceName() == SourceName.UFUK) {
            meaningLong = cleanUfukMeaningLong(meaningLong, displayName);
            character = cleanUfukMeaningLong(character, displayName);
            letter = cleanUfukLetterAnalysis(letter);
        }
        String origin = normalizeOrigin(draft.origin(), meaningShort, meaningLong);

        Boolean quranFlag = draft.quranFlag();
        if (quranFlag == null) {
            String quranCorpus = String.join(" ",
                    nullToEmpty(meaningShort),
                    nullToEmpty(meaningLong),
                    nullToEmpty(character),
                    nullToEmpty(letter)
            ).toLowerCase(Locale.ROOT);
            quranFlag = quranCorpus.contains("kur'an")
                    || quranCorpus.contains("kuran")
                    || quranCorpus.contains("kuran-ı kerim")
                    || quranCorpus.contains("kuranda");
        }

        ContentQuality quality = resolveQuality(meaningShort, meaningLong, character, letter);
        boolean mismatch = isMismatch(rawTitle, displayName);

        double confidence = SOURCE_BASE_CONFIDENCE.getOrDefault(draft.sourceName(), 0.5);
        confidence += clamp(draft.sourceConfidence(), -0.2, 0.2);
        if (origin == null) {
            confidence -= 0.10;
        }
        if (quality == ContentQuality.LOW) {
            confidence -= 0.15;
        } else if (quality == ContentQuality.MEDIUM) {
            confidence -= 0.05;
        }
        if (mismatch) {
            confidence -= 0.20;
        }
        if (duplicateContentFlag) {
            confidence -= 0.10;
        }

        BigDecimal score = BigDecimal.valueOf(clamp(confidence, 0.10, 0.98))
                .setScale(3, RoundingMode.HALF_UP);

        return new NormalizedCandidateData(
                normalizedName,
                displayName,
                gender,
                meaningShort,
                meaningLong,
                origin,
                character,
                letter,
                quranFlag,
                score,
                mismatch,
                duplicateContentFlag,
                quality
        );
    }

    public ParsedGender inferGenderFromText(String... texts) {
        StringBuilder builder = new StringBuilder();
        if (texts != null) {
            for (String text : texts) {
                if (text == null || text.isBlank()) {
                    continue;
                }
                if (!builder.isEmpty()) {
                    builder.append(' ');
                }
                builder.append(text);
            }
        }
        String corpus = builder.toString().toLowerCase(Locale.ROOT);
        boolean female = corpus.contains("kız") || corpus.contains("kadın") || corpus.contains("female");
        boolean male = corpus.contains("erkek") || corpus.contains("male");
        boolean unisex = corpus.contains("unisex") || corpus.contains("üniseks") || corpus.contains("ikisinde de");

        if (unisex || (female && male)) {
            return ParsedGender.UNISEX;
        }
        if (female) {
            return ParsedGender.FEMALE;
        }
        if (male) {
            return ParsedGender.MALE;
        }
        return ParsedGender.UNKNOWN;
    }

    public String normalizeOrigin(String origin, String... contexts) {
        String rawOrigin = cleanText(origin);
        String raw = rawOrigin;
        if (raw == null) {
            raw = cleanText(String.join(" ", contexts));
        }
        if (raw == null) {
            return null;
        }

        String normalized = TurkishStringUtil.normalizeTextForDiff(raw);
        if (normalized.isBlank()) {
            return null;
        }

        if (normalized.contains("arap")) return "Arapça";
        if (normalized.contains("fars")) return "Farsça";
        if (normalized.contains("turk")) return "Türkçe";
        if (normalized.contains("yunan") || normalized.contains("grek")) return "Yunanca";
        if (normalized.contains("ibrani") || normalized.contains("ivrit") || normalized.contains("hebrew")) return "İbranice";
        if (normalized.contains("latince") || normalized.contains("latin")) return "Latince";
        if (normalized.contains("fransiz")) return "Fransızca";
        if (normalized.contains("ingiliz")) return "İngilizce";

        // Origin field explicitly missingse (sadece bağlamdan infer ediliyorsa) yanlış pozitif üretme.
        if (rawOrigin == null) {
            return null;
        }

        String fallback = clampLength(TurkishStringUtil.normalizeDisplay(rawOrigin), MAX_ORIGIN_LENGTH);
        if (fallback == null) {
            return null;
        }

        // Çok uzun ve cümle formatındaki değerleri origin olarak kaydetme.
        if (fallback.split(" ").length > 8) {
            return null;
        }
        return fallback;
    }

    public ContentQuality resolveQuality(String meaningShort, String meaningLong, String traits, String letterAnalysis) {
        String merged = String.join(" ",
                nullToEmpty(meaningShort),
                nullToEmpty(meaningLong),
                nullToEmpty(traits),
                nullToEmpty(letterAnalysis)
        );
        String normalized = TurkishStringUtil.normalizeTextForDiff(merged);
        int length = normalized.length();

        if (length < 40) {
            return ContentQuality.LOW;
        }
        if (length < 180) {
            return ContentQuality.MEDIUM;
        }
        return ContentQuality.HIGH;
    }

    public boolean isMismatch(String rawTitle, String parsedName) {
        String titleName = extractNameFromTitle(rawTitle);
        if (titleName == null || titleName.isBlank()) {
            return false;
        }
        String titleNorm = TurkishStringUtil.normalizeNameForComparison(titleName);
        String parsedNorm = TurkishStringUtil.normalizeNameForComparison(parsedName);
        return !titleNorm.equals(parsedNorm);
    }

    public String extractNameFromTitle(String title) {
        if (title == null || title.isBlank()) {
            return null;
        }

        Matcher matcher = TITLE_NAME_PATTERN.matcher(title);
        if (matcher.find()) {
            return TurkishStringUtil.normalizeDisplay(matcher.group(1));
        }

        String beforeDash = title.split("-")[0].trim();
        if (beforeDash.toLowerCase(Locale.ROOT).contains("ismin")) {
            beforeDash = beforeDash.substring(0, beforeDash.toLowerCase(Locale.ROOT).indexOf("ismin")).trim();
        }
        return TurkishStringUtil.normalizeDisplay(beforeDash);
    }

    public String cleanText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
        if (trimmed.isBlank()) {
            return null;
        }
        String normalized = TurkishStringUtil.normalizeTextForDiff(trimmed);
        if (normalized.isBlank() || normalized.equals("-")) {
            return null;
        }
        return trimmed;
    }

    public String cleanUfukMeaningLong(String value, String displayName) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return null;
        }

        String normalized = cleaned.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
        normalized = UFUK_MEANING_HEADER_PATTERN.matcher(normalized).replaceFirst("");
        normalized = normalized.replaceFirst("^[,;:\\-–]+\\s*", "");

        String displayNormalized = TurkishStringUtil.normalizeNameForComparison(displayName);
        Matcher leadingNameMatcher = UFUK_LEADING_NAME_PATTERN.matcher(normalized);
        if (leadingNameMatcher.find()) {
            String leadingNameNormalized = TurkishStringUtil.normalizeNameForComparison(leadingNameMatcher.group(1));
            if (!displayNormalized.isBlank() && displayNormalized.equals(leadingNameNormalized)) {
                normalized = normalized.substring(leadingNameMatcher.end()).trim();
            }
        }

        if (displayName != null && !displayName.isBlank()) {
            Pattern leadingNameIsmiPattern = Pattern.compile(
                    "^\\s*" + Pattern.quote(displayName.trim()) + "\\s+[iİıI]smi\\s*[,;:\\-–]*\\s*",
                    Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
            );
            normalized = leadingNameIsmiPattern.matcher(normalized).replaceFirst("");
        }

        normalized = normalized.replaceFirst("^[,;:\\-–]+\\s*", "");
        return cleanText(normalized);
    }

    public String cleanUfukLetterAnalysis(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return null;
        }

        String normalized = cleaned.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();

        normalized = UFUK_LETTER_DISCLAIMER_PATTERN.matcher(normalized).replaceFirst("");
        normalized = UFUK_LETTER_ANALYSIS_HEADER_PATTERN.matcher(normalized).replaceFirst("");
        normalized = UFUK_LETTER_ANALYSIS_FRAGMENT_PATTERN.matcher(normalized).replaceFirst("");

        int markerCount = countLetterMarkers(normalized);
        if (markerCount >= 3) {
            Matcher markerMatcher = LETTER_MARKER_PATTERN.matcher(normalized);
            if (markerMatcher.find() && markerMatcher.start() > 0) {
                normalized = normalized.substring(markerMatcher.start()).trim();
            }
        }

        normalized = normalized.replaceFirst("^[,;:\\-–]+\\s*", "");
        return cleanText(normalized);
    }

    public String normalizedName(String value) {
        return TurkishStringUtil.normalizeNameForComparison(value);
    }

    public String slugify(String value) {
        return TurkishStringUtil.toAsciiSlug(value);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String clampLength(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String normalized = value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
        if (normalized.isBlank()) {
            return null;
        }

        if (normalized.length() <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, maxLength).trim();
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private int countLetterMarkers(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        Matcher matcher = LETTER_MARKER_PATTERN.matcher(value);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }
}
