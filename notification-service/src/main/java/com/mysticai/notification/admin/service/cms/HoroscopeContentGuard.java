package com.mysticai.notification.admin.service.cms;

import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public final class HoroscopeContentGuard {

    private static final String TURKISH_SIGN_ALTERNATION =
            "koç|boğa|ikizler|yengeç|aslan|başak|terazi|akrep|yay|oğlak|kova|balık";
    private static final String ENGLISH_SIGN_ALTERNATION =
            "aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces";

    private static final Pattern TURKISH_DIRECT_SALUTATION = Pattern.compile(
            "\\bsevgili\\s+(" + TURKISH_SIGN_ALTERNATION + ")(?:\\s+burcu)?\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern ENGLISH_DIRECT_SALUTATION = Pattern.compile(
            "\\bdear\\s+(" + ENGLISH_SIGN_ALTERNATION + ")(?:\\s+sign)?\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TURKISH_DIRECT_SUBJECT = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + TURKISH_SIGN_ALTERNATION + ")\\s+burcu"
                    + "(?=\\s*(?:,|için\\b|olarak\\b|bugün\\b|bu\\s+(?:hafta|dönem)\\b))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TURKISH_DIRECT_PLURAL = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + TURKISH_SIGN_ALTERNATION + ")(?:lar|ler)"
                    + "(?=\\s+(?:bugün|bu\\s+(?:hafta|dönem)|için|olarak)\\b|[,.;:])",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TURKISH_DIRECT_SIGN_SUBJECT = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + TURKISH_SIGN_ALTERNATION + ")"
                    + "(?=\\s+(?:için\\b|bugün\\b|bu\\s+(?:hafta|dönem)\\b|olarak\\b))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern ENGLISH_DIRECT_SUBJECT = Pattern.compile(
            "(^|(?<=[.!?…])\\s+)(" + ENGLISH_SIGN_ALTERNATION + ")(?:\\s+sign)?"
                    + "(?=\\s*(?:,|today\\b|this\\s+(?:week|period)\\b|for\\b|as\\b))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private HoroscopeContentGuard() {}

    public static boolean isContentComplete(String content) {
        if (content == null || content.isBlank()) return false;
        String trimmed = content.trim();
        if (trimmed.length() < 50) return false;
        char last = trimmed.charAt(trimmed.length() - 1);
        return last == '.' || last == '!' || last == '?' || last == '…';
    }

    public static boolean isContentUsableForSign(String content, WeeklyHoroscopeCms.ZodiacSign expectedSign, String locale) {
        return isContentComplete(content)
                && findWrongDirectSignReference(content, expectedSign, locale).isEmpty();
    }

    public static Optional<String> findWrongDirectSignReference(
            String content,
            WeeklyHoroscopeCms.ZodiacSign expectedSign,
            String locale
    ) {
        String expectedKey = normalizeSignKey(expectedSign);
        if (content == null || content.isBlank() || expectedKey == null) {
            return Optional.empty();
        }

        return firstWrongMatch(content, expectedKey, TURKISH_DIRECT_SALUTATION, 1)
                .or(() -> firstWrongMatch(content, expectedKey, TURKISH_DIRECT_SUBJECT, 2))
                .or(() -> firstWrongMatch(content, expectedKey, TURKISH_DIRECT_PLURAL, 2))
                .or(() -> firstWrongMatch(content, expectedKey, TURKISH_DIRECT_SIGN_SUBJECT, 2))
                .or(() -> firstWrongMatch(content, expectedKey, ENGLISH_DIRECT_SALUTATION, 1))
                .or(() -> firstWrongMatch(content, expectedKey, ENGLISH_DIRECT_SUBJECT, 2));
    }

    public static boolean responseSignMatches(String responseSign, WeeklyHoroscopeCms.ZodiacSign expectedSign) {
        String responseKey = normalizeSignKey(responseSign);
        String expectedKey = normalizeSignKey(expectedSign);
        return responseKey == null || expectedKey == null || responseKey.equals(expectedKey);
    }

    private static Optional<String> firstWrongMatch(String content, String expectedKey, Pattern pattern, int signGroup) {
        var matcher = pattern.matcher(content);
        while (matcher.find()) {
            String matched = matcher.group(signGroup);
            String matchedKey = normalizeSignKey(matched);
            if (matchedKey != null && !matchedKey.equals(expectedKey)) {
                return Optional.of(matched);
            }
        }
        return Optional.empty();
    }

    private static String normalizeSignKey(WeeklyHoroscopeCms.ZodiacSign sign) {
        return sign == null ? null : sign.name().toLowerCase(Locale.ROOT);
    }

    private static String normalizeSignKey(String sign) {
        if (sign == null || sign.isBlank()) {
            return null;
        }
        String normalized = sign.trim().toLowerCase(Locale.ROOT)
                .replace("\u0307", "")
                .replace("ğ", "g")
                .replace("ü", "u")
                .replace("ş", "s")
                .replace("ı", "i")
                .replace("ö", "o")
                .replace("ç", "c")
                .replaceAll("[^a-z]", "");
        return switch (normalized) {
            case "aries", "koc" -> "aries";
            case "taurus", "boga" -> "taurus";
            case "gemini", "ikizler" -> "gemini";
            case "cancer", "yengec" -> "cancer";
            case "leo", "aslan" -> "leo";
            case "virgo", "basak" -> "virgo";
            case "libra", "terazi" -> "libra";
            case "scorpio", "akrep" -> "scorpio";
            case "sagittarius", "yay" -> "sagittarius";
            case "capricorn", "oglak" -> "capricorn";
            case "aquarius", "kova" -> "aquarius";
            case "pisces", "balik" -> "pisces";
            default -> null;
        };
    }
}
