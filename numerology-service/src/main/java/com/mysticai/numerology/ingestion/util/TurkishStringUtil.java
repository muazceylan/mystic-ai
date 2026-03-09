package com.mysticai.numerology.ingestion.util;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public final class TurkishStringUtil {

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");
    private static final Pattern NON_WORD_KEEP_SPACE = Pattern.compile("[^\\p{L}\\p{Nd}\\s]");
    private static final Pattern DASHES = Pattern.compile("[\\-‐‑‒–—―]");

    private TurkishStringUtil() {
    }

    public static String normalizeDisplay(String value) {
        if (value == null) {
            return "";
        }
        String normalized = normalizeNameForComparison(value);
        if (normalized.isBlank()) {
            return "";
        }

        String[] parts = normalized.split(" ");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            String titled = part.substring(0, 1).toUpperCase(TR) + part.substring(1);
            if (!out.isEmpty()) {
                out.append(' ');
            }
            out.append(titled);
        }
        return out.toString();
    }

    public static String normalizeNameForComparison(String value) {
        return normalizeNameBase(value, false);
    }

    public static String normalizeNameAsciiForComparison(String value) {
        return normalizeNameBase(value, true);
    }

    public static String normalizeNameCompact(String value) {
        return normalizeNameForComparison(value).replace(" ", "");
    }

    public static String normalizeNameAsciiCompact(String value) {
        return normalizeNameAsciiForComparison(value).replace(" ", "");
    }

    public static List<String> nameTokens(String value) {
        String normalized = normalizeNameForComparison(value);
        if (normalized.isBlank()) {
            return List.of();
        }
        return List.of(normalized.split(" "));
    }

    public static boolean looksCompoundName(String value) {
        return nameTokens(value).size() > 1;
    }

    public static String normalizeTextForDiff(String value) {
        if (value == null) {
            return "";
        }
        String lowered = value.toLowerCase(TR);
        String withoutMarks = Normalizer.normalize(lowered, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        String cleaned = NON_WORD_KEEP_SPACE.matcher(withoutMarks).replaceAll(" ");
        return MULTI_SPACE.matcher(cleaned.trim()).replaceAll(" ");
    }

    public static String toAsciiSlug(String value) {
        if (value == null) {
            return "";
        }
        String lower = value.toLowerCase(TR)
                .replace('ç', 'c')
                .replace('ğ', 'g')
                .replace('ı', 'i')
                .replace('ö', 'o')
                .replace('ş', 's')
                .replace('ü', 'u');
        String normalized = Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        String slug = normalized
                .replaceAll("[^a-z0-9\\s-]", " ")
                .trim()
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
        return slug;
    }

    public static boolean isBlankish(String value) {
        return value == null || normalizeTextForDiff(value).isBlank();
    }

    private static String normalizeNameBase(String value, boolean asciiFold) {
        if (value == null) {
            return "";
        }

        String lowered = value.toLowerCase(TR)
                .replace('\u00A0', ' ');

        lowered = DASHES.matcher(lowered).replaceAll(" ");
        lowered = lowered
                .replace('\'', ' ')
                .replace('’', ' ')
                .replace('.', ' ')
                .replace('/', ' ')
                .replace('(', ' ')
                .replace(')', ' ')
                .replace(',', ' ')
                .replace(';', ' ')
                .replace(':', ' ');

        if (asciiFold) {
            lowered = lowered
                    .replace('ç', 'c')
                    .replace('ğ', 'g')
                    .replace('ı', 'i')
                    .replace('ö', 'o')
                    .replace('ş', 's')
                    .replace('ü', 'u');

            lowered = Normalizer.normalize(lowered, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "");
        }

        String cleaned = NON_WORD_KEEP_SPACE.matcher(lowered).replaceAll(" ");
        return MULTI_SPACE.matcher(cleaned.trim()).replaceAll(" ");
    }
}
