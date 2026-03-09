package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Component
public class NameEnrichmentRuleEngine {

    private static final BigDecimal LOW_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.55);

    public List<TagRecommendation> recommend(NameEntity name, long aliasCount, long candidateCount) {
        String normalizedName = TurkishStringUtil.normalizeNameForComparison(name.getName());
        String textCorpus = TurkishStringUtil.normalizeTextForDiff(String.join(" ",
                safe(name.getMeaningShort()),
                safe(name.getMeaningLong()),
                safe(name.getCharacterTraitsText()),
                safe(name.getLetterAnalysisText())
        ));
        String origin = TurkishStringUtil.normalizeTextForDiff(name.getOrigin());

        double completeness = completenessScore(name);
        double confidencePenalty = completeness < 0.40 ? 0.15 : (completeness < 0.55 ? 0.08 : 0.0);

        Map<String, TagRecommendation> dedupe = new LinkedHashMap<>();

        deriveCulture(origin).forEach(rec -> upsert(dedupe, penalize(rec, confidencePenalty)));
        deriveReligion(name.getQuranFlag(), textCorpus).forEach(rec -> upsert(dedupe, penalize(rec, confidencePenalty)));
        deriveThemes(textCorpus).forEach(rec -> upsert(dedupe, penalize(rec, confidencePenalty)));
        deriveVibe(normalizedName, textCorpus).forEach(rec -> upsert(dedupe, penalize(rec, confidencePenalty)));
        deriveStyle(normalizedName, origin, textCorpus, name.getQuranFlag(), candidateCount).forEach(rec -> upsert(dedupe, penalize(rec, confidencePenalty)));
        deriveUsage(aliasCount, candidateCount).forEach(rec -> upsert(dedupe, penalize(rec, confidencePenalty)));

        return dedupe.values().stream()
                .sorted(Comparator.comparing(TagRecommendation::confidence).reversed())
                .toList();
    }

    public BigDecimal lowConfidenceThreshold() {
        return LOW_CONFIDENCE_THRESHOLD;
    }

    private List<TagRecommendation> deriveCulture(String origin) {
        List<TagRecommendation> out = new ArrayList<>();
        if (origin == null || origin.isBlank()) {
            return out;
        }

        if (origin.contains("turk")) {
            out.add(rec(NameTagGroup.CULTURE, "turkish", 0.94, "origin contains 'turk'"));
        }
        if (origin.contains("arap") || origin.contains("arab")) {
            out.add(rec(NameTagGroup.CULTURE, "arabic", 0.94, "origin contains 'arap/arab'"));
        }
        if (origin.contains("fars") || origin.contains("pers")) {
            out.add(rec(NameTagGroup.CULTURE, "persian", 0.92, "origin contains 'fars/pers'"));
        }

        if (out.isEmpty() && (origin.contains("/") || origin.contains(",") || origin.contains(" ve ") || origin.contains("karisik"))) {
            out.add(rec(NameTagGroup.CULTURE, "mixed_usage", 0.66, "origin indicates mixed usage"));
        }
        return out;
    }

    private List<TagRecommendation> deriveReligion(Boolean quranFlag, String corpus) {
        List<TagRecommendation> out = new ArrayList<>();
        if (Boolean.TRUE.equals(quranFlag)) {
            out.add(rec(NameTagGroup.RELIGION, "quranic", 0.96, "quranFlag=true"));
            out.add(rec(NameTagGroup.RELIGION, "islamic", 0.88, "quranFlag=true"));
            return out;
        }

        if (Boolean.FALSE.equals(quranFlag)) {
            out.add(rec(NameTagGroup.RELIGION, "neutral", 0.74, "quranFlag=false"));
            return out;
        }

        if (corpus.contains("kuran") || corpus.contains("kuran i kerim") || corpus.contains("islam") || corpus.contains("allah")) {
            out.add(rec(NameTagGroup.RELIGION, "islamic", 0.61, "meaning text contains islamic keywords"));
        }

        return out;
    }

    private List<TagRecommendation> deriveThemes(String corpus) {
        List<TagRecommendation> out = new ArrayList<>();

        if (containsAny(corpus, "nur", "isik", "parlak", "gunes", "aydin")) {
            out.add(rec(NameTagGroup.THEME, "light", 0.86, "meaning contains light keywords"));
        }
        if (containsAny(corpus, "ay", "hilal", "kamer")) {
            out.add(rec(NameTagGroup.THEME, "moon", 0.78, "meaning contains moon keywords"));
        }
        if (containsAny(corpus, "su", "deniz", "irmak", "nehir", "darya")) {
            out.add(rec(NameTagGroup.THEME, "water", 0.82, "meaning contains water keywords"));
        }
        if (containsAny(corpus, "guc", "kuvvet", "kudret", "lider", "hukum")) {
            out.add(rec(NameTagGroup.THEME, "power", 0.83, "meaning contains power keywords"));
        }
        if (containsAny(corpus, "sevgi", "ask", "muhabbet", "gonul")) {
            out.add(rec(NameTagGroup.THEME, "love", 0.81, "meaning contains love keywords"));
        }
        if (containsAny(corpus, "bilgelik", "hikmet", "ilim", "irfan", "akil")) {
            out.add(rec(NameTagGroup.THEME, "wisdom", 0.84, "meaning contains wisdom keywords"));
        }
        if (containsAny(corpus, "doga", "cicek", "agac", "yaprak", "bahar", "gok")) {
            out.add(rec(NameTagGroup.THEME, "nature", 0.79, "meaning contains nature keywords"));
        }

        return out;
    }

    private List<TagRecommendation> deriveVibe(String normalizedName, String corpus) {
        List<TagRecommendation> out = new ArrayList<>();

        int compactLength = normalizedName.replace(" ", "").length();
        double hardRatio = ratio(normalizedName, "kgtdrbcp");
        double softRatio = ratio(normalizedName, "lmnsyzaeiou");

        if (compactLength <= 5 || hardRatio >= 0.35) {
            out.add(rec(NameTagGroup.VIBE, "strong", 0.64, "phonetic profile is short/hard"));
        }
        if (softRatio >= 0.58) {
            out.add(rec(NameTagGroup.VIBE, "soft", 0.66, "phonetic profile is soft/flowing"));
        }
        if (normalizedName.endsWith("a") || normalizedName.endsWith("e")) {
            out.add(rec(NameTagGroup.VIBE, "elegant", 0.60, "name ends with vowel"));
        }
        if (containsAny(corpus, "lider", "guc", "karizmatik", "otorite")) {
            out.add(rec(NameTagGroup.VIBE, "charismatic", 0.67, "meaning indicates charisma/leadership"));
        }
        if (containsAny(corpus, "nur", "hikmet", "ruh", "manevi", "dua")) {
            out.add(rec(NameTagGroup.VIBE, "spiritual", 0.63, "meaning indicates spiritual context"));
        }

        return out;
    }

    private List<TagRecommendation> deriveStyle(
            String normalizedName,
            String origin,
            String corpus,
            Boolean quranFlag,
            long candidateCount
    ) {
        List<TagRecommendation> out = new ArrayList<>();
        int compactLength = normalizedName.replace(" ", "").length();

        if (Boolean.TRUE.equals(quranFlag)
                || origin.contains("arab")
                || origin.contains("arap")
                || origin.contains("fars")
                || corpus.contains("kadim")) {
            out.add(rec(NameTagGroup.STYLE, "classic", 0.76, "origin/religion indicates classic usage"));
        }

        if (containsAny(corpus, "ebedi", "sonsuz", "kalici", "zamansiz")) {
            out.add(rec(NameTagGroup.STYLE, "timeless", 0.73, "meaning indicates timelessness"));
        }

        if (compactLength <= 5) {
            out.add(rec(NameTagGroup.STYLE, "minimalist", 0.68, "name form is short/minimal"));
        }

        if (candidateCount >= 10 && !Boolean.TRUE.equals(quranFlag) && compactLength <= 8) {
            out.add(rec(NameTagGroup.STYLE, "modern", 0.62, "usage signal indicates modern pattern"));
        }

        return out;
    }

    private List<TagRecommendation> deriveUsage(long aliasCount, long candidateCount) {
        List<TagRecommendation> out = new ArrayList<>();
        long signal = Math.max(aliasCount, candidateCount);

        if (signal >= 20) {
            out.add(rec(NameTagGroup.USAGE, "popular", 0.82, "candidate/alias signal >= 20"));
        } else if (signal >= 8) {
            out.add(rec(NameTagGroup.USAGE, "balanced", 0.68, "candidate/alias signal between 8-19"));
        } else if (signal > 0) {
            out.add(rec(NameTagGroup.USAGE, "niche", 0.56, "candidate/alias signal <= 7"));
        }

        return out;
    }

    private TagRecommendation rec(NameTagGroup group, String value, double confidence, String evidence) {
        BigDecimal score = BigDecimal.valueOf(confidence).setScale(3, RoundingMode.HALF_UP);
        return new TagRecommendation(group, value, score, evidence);
    }

    private TagRecommendation penalize(TagRecommendation recommendation, double penalty) {
        if (penalty <= 0.0) {
            return recommendation;
        }
        BigDecimal adjusted = recommendation.confidence().subtract(BigDecimal.valueOf(penalty));
        if (adjusted.compareTo(BigDecimal.valueOf(0.10)) < 0) {
            adjusted = BigDecimal.valueOf(0.10);
        }
        adjusted = adjusted.setScale(3, RoundingMode.HALF_UP);
        return new TagRecommendation(
                recommendation.group(),
                recommendation.value(),
                adjusted,
                recommendation.evidence()
        );
    }

    private void upsert(Map<String, TagRecommendation> map, TagRecommendation recommendation) {
        String key = recommendation.group().name() + ':' + recommendation.value();
        TagRecommendation existing = map.get(key);
        if (existing == null || recommendation.confidence().compareTo(existing.confidence()) > 0) {
            map.put(key, recommendation);
        }
    }

    private boolean containsAny(String haystack, String... keywords) {
        if (haystack == null || haystack.isBlank()) {
            return false;
        }
        for (String keyword : keywords) {
            if (keyword == null || keyword.isBlank()) {
                continue;
            }
            if (haystack.contains(keyword.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private double ratio(String value, String characterSet) {
        if (value == null || value.isBlank()) {
            return 0.0;
        }
        int totalLetters = 0;
        int hits = 0;
        String compact = value.replace(" ", "").toLowerCase(Locale.ROOT);
        for (char c : compact.toCharArray()) {
            if (!Character.isLetter(c)) {
                continue;
            }
            totalLetters++;
            if (characterSet.indexOf(c) >= 0) {
                hits++;
            }
        }
        if (totalLetters == 0) {
            return 0.0;
        }
        return hits / (double) totalLetters;
    }

    private double completenessScore(NameEntity name) {
        int total = 8;
        int filled = 0;

        if (name.getGender() != null && name.getGender() != ParsedGender.UNKNOWN) {
            filled++;
        }
        if (notBlank(name.getOrigin())) {
            filled++;
        }
        if (notBlank(name.getMeaningShort())) {
            filled++;
        }
        if (notBlank(name.getMeaningLong())) {
            filled++;
        }
        if (notBlank(name.getCharacterTraitsText())) {
            filled++;
        }
        if (notBlank(name.getLetterAnalysisText())) {
            filled++;
        }
        if (name.getQuranFlag() != null) {
            filled++;
        }
        if (notBlank(name.getName()) && name.getName().trim().length() >= 2) {
            filled++;
        }

        return filled / (double) total;
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String safe(String value) {
        return Objects.toString(value, "");
    }

    public record TagRecommendation(
            NameTagGroup group,
            String value,
            BigDecimal confidence,
            String evidence
    ) {
    }
}
