package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.TraitAxis;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class LlmNotesService {

    /**
     * NOTE: Kept as a backend prompt template for future orchestrator integration.
     * Current implementation uses deterministic local micro-copy when feature flag is enabled.
     */
    public static final String TRAIT_NOTES_PROMPT_TEMPLATE = """
            SİSTEM: Sen bir ilişki uyumu uygulaması için mikro açıklamalar üreten asistansın. Kesin hüküm verme. Kısa, Türkçe, yumuşak dil.
            KULLANICI:
            Elimde iki kişinin uyum karşılaştırması var. Aşağıdaki trait skorlarına göre her trait için en fazla 80 karakterlik “note” üret ve ayrıca tek cümlelik (<=90 karakter) genel bir “cardSummary” üret.
            Kurallar:
            - Skorları ASLA değiştirme.
            - Notlar “eğilim” dili kullansın (örn. “bazen”, “çoğu zaman”, “genelde”).
            - Olumsuz yargı yok, yapıcı ifade.
            - Her note, axis etiketleriyle uyumlu olsun.
            - ÇIKTI SADECE JSON: { "cardSummary": "...", "notes": { "<axisId>": "..." ... } }
            """;

    @Value("${features.enableTraitNotesFromLLM:false}")
    private boolean enableTraitNotesFromLLM;

    public NotesResult generateNotes(List<TraitAxis> axes, Integer compatibilityScore) {
        if (!enableTraitNotesFromLLM || axes == null || axes.isEmpty()) {
            return new NotesResult(null, Map.of());
        }

        // Deterministic fallback micro-copy (keeps strict consistency until remote LLM pipeline is wired).
        Map<String, String> notes = new HashMap<>();
        for (TraitAxis axis : axes) {
            notes.put(axis.id(), buildAxisNote(axis));
        }
        String summary = buildCardSummary(axes, compatibilityScore);
        return new NotesResult(summary, notes);
    }

    private String buildAxisNote(TraitAxis axis) {
        int score = axis.score0to100() == null ? 50 : axis.score0to100();
        int delta = score - 50;
        String left = axis.leftLabel();
        String right = axis.rightLabel();

        if (Math.abs(delta) <= 8) {
            return clip("Genelde " + left.toLowerCase(Locale.forLanguageTag("tr")) + " ve " +
                    right.toLowerCase(Locale.forLanguageTag("tr")) + " arasında denge kurabilirler.", 80);
        }
        if (delta < 0) {
            return clip("Çoğu zaman " + left.toLowerCase(Locale.forLanguageTag("tr")) +
                    " tarafı daha rahat akabilir.", 80);
        }
        return clip("Genelde " + right.toLowerCase(Locale.forLanguageTag("tr")) +
                " tarafı daha belirgin hissedilebilir.", 80);
    }

    private String buildCardSummary(List<TraitAxis> axes, Integer compatibilityScore) {
        TraitAxis strongest = axes.stream()
                .max(Comparator.<TraitAxis>comparingInt(a -> Math.abs((a.score0to100() == null ? 50 : a.score0to100()) - 50))
                        .thenComparing(TraitAxis::id))
                .orElse(null);

        String base = compatibilityScore == null
                ? "Bu eşleşmede dengeli ve dikkat çekici bir enerji akışı görülüyor."
                : compatibilityScore >= 80
                ? "Uyum yüksek; birlikte akış yakalamaları çoğu alanda kolaylaşabilir."
                : compatibilityScore >= 60
                ? "Uyum orta-yüksek; doğru dengeyle güçlü bir ritim kurulabilir."
                : compatibilityScore >= 40
                ? "Uyum dalgalı; açık iletişimle denge alanları büyütülebilir."
                : "Uyum zorlayıcı olabilir; yumuşak iletişim büyük fark yaratabilir.";

        if (strongest == null) {
            return clip(base, 90);
        }

        int score = strongest.score0to100() == null ? 50 : strongest.score0to100();
        String emphasis = Math.abs(score - 50) <= 8
                ? strongest.leftLabel() + "–" + strongest.rightLabel() + " ekseninde denge öne çıkıyor."
                : (score < 50 ? strongest.leftLabel() : strongest.rightLabel()) + " eğilimi daha görünür.";

        return clip(base + " " + emphasis, 90);
    }

    private String clip(String text, int maxLen) {
        if (text == null) return null;
        if (text.length() <= maxLen) return text;
        return text.substring(0, Math.max(0, maxLen - 3)).trim() + "...";
    }

    public record NotesResult(
            String cardSummary,
            Map<String, String> notesByAxisId
    ) {}
}
