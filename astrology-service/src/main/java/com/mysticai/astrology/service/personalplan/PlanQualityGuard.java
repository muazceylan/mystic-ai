package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Rejects the two failure modes that made the old plan feel machine-written:
 *
 * <ol>
 *   <li>generic motivational filler ("sezgini dinle", "küçük bir adım at", "tek işe odaklan"),</li>
 *   <li>the same advice re-worded — inside one response and across the last few days.</li>
 * </ol>
 *
 * Similarity is token-set Jaccard over Turkish/English-normalised stems. It has no
 * dependency on an embedding service; if one is introduced later only
 * {@link #similarity(String, String)} needs to change.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PlanQualityGuard {

    private final PersonalPlanProperties properties;

    /**
     * Phrases that carry no information on their own. A suggestion is rejected when a banned
     * phrase is essentially the whole sentence; the same words inside a longer, concrete
     * sentence are allowed (e.g. "acele karar verme" alone is rejected, but
     * "…aynı konuşmada cevap vermeyin, önce şartların yazılı halini isteyin" is fine).
     */
    private static final List<String> BANNED_PHRASES = List.of(
            // Turkish
            "sezgini dinle",
            "sezgine guven",
            "ic sesini dinle",
            "ic sesine guven",
            "kucuk bir adim at",
            "ufak bir adim at",
            "kucuk adim at",
            "kendine guven",
            "enerjini koru",
            "enerjini dogru kullan",
            "akista kal",
            "pozitif dusun",
            "bugunu degerlendir",
            "tek ise odaklan",
            "tek ise odaklanip bitirmeden yeni is acma",
            "bir isi bitirmeden yenisini acma",
            "yeni is acma",
            "acele karar verme",
            "iletisimde dikkatli ol",
            "kendine zaman ayir",
            "gecmisi birak",
            "evrene guven",
            "kalbinin sesini dinle",
            "konfor alanindan cik",
            "dengede kal",
            "kendine sefkat goster",
            "kendine odaklan",
            // English
            "listen to your intuition",
            "listen to intuition",
            "trust your intuition",
            "take a small step",
            "take one small step",
            "trust yourself",
            "protect your energy",
            "use your energy well",
            "stay in the flow",
            "think positive",
            "make the most of today",
            "focus on one task",
            "do not open a new task before finishing",
            "do not start something new",
            "do not rush decisions",
            "be careful in communication",
            "make time for yourself",
            "let go of the past",
            "trust the universe",
            "listen to your heart",
            "step out of your comfort zone",
            "stay balanced",
            "be kind to yourself"
    );

    /**
     * Words that carry no discriminating meaning when comparing two suggestions, so they are
     * dropped before similarity is measured.
     */
    private static final Set<String> STOP_TOKENS = new HashSet<>(Arrays.asList(
            "ve", "veya", "ile", "bir", "bu", "su", "o", "icin", "gibi", "daha", "cok", "az",
            "ama", "fakat", "ancak", "de", "da", "ki", "mi", "sonra", "once", "kadar", "her",
            "bugun", "gun", "gunun", "sizin", "senin", "sen", "siz", "olan", "olarak", "yerine",
            "the", "a", "an", "and", "or", "with", "for", "to", "of", "in", "on", "at", "is",
            "are", "be", "your", "you", "today", "day", "this", "that", "it", "as", "than",
            "instead", "before", "after", "more", "less", "very"
    ));

    /** Minimum informative token count for an advice body; anything shorter is filler. */
    private static final int MIN_CONTENT_TOKENS = 5;

    /** Headlines are legitimately terse ("Yarım kalan bir konuşmanın sınırlarını belirleme"). */
    private static final int MIN_HEADLINE_TOKENS = 3;

    /**
     * @return true when the text is concrete enough to show a paying user.
     */
    public boolean isAcceptable(String text) {
        return rejectionReason(text) == null;
    }

    /**
     * @return null when acceptable, otherwise a short machine-readable reason for logs/tests.
     */
    public String rejectionReason(String text) {
        return rejectionReason(text, false);
    }

    /**
     * @param headline true for titles and theme names, which are held to a shorter length floor
     *                 but to the same ban on generic filler
     */
    public String rejectionReason(String text, boolean headline) {
        String normalized = normalize(text);
        if (normalized.isBlank()) {
            return "empty";
        }

        List<String> tokens = contentTokens(normalized);
        int floor = headline ? MIN_HEADLINE_TOKENS : MIN_CONTENT_TOKENS;
        if (tokens.size() < floor) {
            return "too_short";
        }

        for (String banned : BANNED_PHRASES) {
            if (!normalized.contains(banned)) {
                continue;
            }
            // Banned phrase is acceptable only as a clause inside a materially longer sentence.
            int bannedTokens = contentTokens(banned).size();
            if (tokens.size() < bannedTokens + floor) {
                return "generic_phrase:" + banned.replace(' ', '_');
            }
        }
        return null;
    }

    /**
     * Token-set Jaccard similarity in [0,1]. Two sentences that say the same thing with
     * different words still share most of their content stems, which is what we want to catch.
     */
    public double similarity(String left, String right) {
        Set<String> leftTokens = new LinkedHashSet<>(contentTokens(normalize(left)));
        Set<String> rightTokens = new LinkedHashSet<>(contentTokens(normalize(right)));
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return 0d;
        }
        Set<String> intersection = new LinkedHashSet<>(leftTokens);
        intersection.retainAll(rightTokens);
        Set<String> union = new LinkedHashSet<>(leftTokens);
        union.addAll(rightTokens);
        return (double) intersection.size() / (double) union.size();
    }

    public boolean isDuplicate(String candidate, String existing) {
        return similarity(candidate, existing) >= properties.getSemanticSimilarityThreshold();
    }

    public boolean isDuplicateOfAny(String candidate, Iterable<String> existing) {
        if (existing == null) {
            return false;
        }
        for (String item : existing) {
            if (isDuplicate(candidate, item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lowercases, folds Turkish diacritics and strips punctuation so "İç sesine güvenip" and
     * "ic sesine guvenip" compare equal.
     */
    public String normalize(String value) {
        if (value == null) {
            return "";
        }
        String lower = value
                .replace('İ', 'i')
                .replace('I', 'i')
                .toLowerCase(new Locale("tr", "TR"))
                .replace("ı", "i")
                .replace("ç", "c")
                .replace("ş", "s")
                .replace("ğ", "g")
                .replace("ö", "o")
                .replace("ü", "u")
                .replace("â", "a")
                .replace("î", "i")
                .replace("û", "u");
        return lower.replaceAll("[^a-z0-9]+", " ").trim();
    }

    /**
     * Splits into meaning-bearing stems. Turkish is agglutinative, so long words are cut to a
     * 6-character stem: "konusmada" and "konusmayi" both reduce to "konusm".
     */
    private List<String> contentTokens(String normalizedText) {
        return Arrays.stream(normalizedText.split(" "))
                .filter(token -> !token.isBlank())
                .filter(token -> token.length() > 2)
                .filter(token -> !STOP_TOKENS.contains(token))
                .map(token -> token.length() > 6 ? token.substring(0, 6) : token)
                .distinct()
                .toList();
    }
}
