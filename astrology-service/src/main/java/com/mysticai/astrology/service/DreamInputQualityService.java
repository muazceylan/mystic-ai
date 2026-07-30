package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.DreamAnalysisQuality;
import com.mysticai.astrology.dto.DreamAnalysisResult;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class DreamInputQualityService {

    private static final Set<String> DREAM_CONTEXT_WORDS = Set.of(
            "gördüm", "gordum", "rüyamda", "ruyamda", "uyandım", "uyandim",
            "hissettim", "kaçtım", "kactim", "gittim", "geldim", "vardı", "vardi",
            "saw", "dreamed", "felt", "woke", "was", "were"
    );
    private static final Set<String> EMOTION_WORDS = Set.of(
            "korku", "korktum", "kaygı", "kaygi", "üzgün", "uzgun", "utandım", "utandim",
            "rahat", "mutlu", "öfke", "ofke", "şaşkın", "saskin", "yalnız", "yalniz",
            "afraid", "anxious", "sad", "relieved", "happy", "angry", "ashamed", "alone"
    );

    public DreamAnalysisResult.InputQuality evaluate(String rawText) {
        String text = rawText == null ? "" : rawText.trim();
        List<String> words = Arrays.stream(text.toLowerCase(Locale.ROOT).split("\\s+"))
                .filter(word -> !word.isBlank())
                .toList();
        long distinctWords = words.stream().distinct().count();
        boolean hasNarrativeSignal = words.stream().anyMatch(DREAM_CONTEXT_WORDS::contains);
        boolean hasEmotion = words.stream().anyMatch(EMOTION_WORDS::contains);
        boolean hasSentence = text.matches("(?s).*[.!?].*");

        if (words.size() < 5 || distinctWords < 3) {
            return quality(DreamAnalysisQuality.INSUFFICIENT,
                    "Analiz için yeterli olay, bağlam veya duygu bulunmuyor.");
        }
        if (words.size() < 9 || (!hasNarrativeSignal && !hasSentence)) {
            return quality(DreamAnalysisQuality.LIMITED,
                    "Rüyada bir görüntü var, ancak olayın bağlamı ve duygusal tonu sınırlı.");
        }
        if (words.size() >= 35 && (hasNarrativeSignal || hasSentence) && hasEmotion) {
            return quality(DreamAnalysisQuality.RICH,
                    "Rüya; olay sırası, somut ayrıntılar ve duygu açısından zengin.");
        }
        return quality(DreamAnalysisQuality.GOOD,
                hasEmotion
                        ? "Rüya, bağlamsal ve duygusal analiz için yeterli ayrıntı içeriyor."
                        : "Rüya analiz edilebilir; belirtilen bir duygu yorumun güvenini artırabilirdi.");
    }

    public DreamAnalysisResult insufficientResult(
            DreamAnalysisResult.InputQuality quality,
            String locale,
            String dreamText
    ) {
        boolean english = locale != null && locale.toLowerCase(Locale.ROOT).startsWith("en");
        String normalizedDream = dreamText == null ? "" : dreamText.toLowerCase(Locale.ROOT);
        boolean containsDeathImage = normalizedDream.contains("öld")
                || normalizedDream.contains("ölüm")
                || normalizedDream.contains("died")
                || normalizedDream.contains("death");
        String essence = containsDeathImage
                ? english
                    ? "Seeing death in a dream is not a death notice or prediction."
                    : "Rüyada ölüm görmek gerçek bir ölüm haberi veya kehanet değildir."
                : english
                    ? "There is not enough context yet for a reliable interpretation."
                    : "Güvenilir bir yorum için rüyada henüz yeterli bağlam yok.";
        String interpretation = containsDeathImage
                ? english
                    ? "With so little context, this image may cautiously relate to fear of loss, distance, or a changing bond; it cannot establish that any of these is happening."
                    : "Bağlam çok kısa olduğu için bu görüntü; kaybetme korkusu, uzaklaşma endişesi veya değişen bir bağla temkinli biçimde ilişkili olabilir; bunlardan birinin yaşandığını kesinleştirmez."
                : english
                    ? "A longer interpretation could add details that were not in your dream, so the analysis stops here."
                    : "Daha uzun bir yorum rüyanda olmayan ayrıntılar ekleyebileceği için analiz burada temkinli kalıyor.";
        return new DreamAnalysisResult(
                quality,
                new DreamAnalysisResult.ExtractedElements(
                        "", List.of(), List.of(), List.of(), List.of(), List.of(), "", List.of()
                ),
                new DreamAnalysisResult.EmotionalCore("", "", "", 0.1),
                essence,
                List.of(),
                interpretation,
                null,
                english
                        ? "What was happening around the image you remember?"
                        : "Hatırladığın görüntünün çevresinde ne oluyordu?",
                english
                        ? "If this image returns, note what changed and how you felt."
                        : "Bu görüntü tekrar ederse neyin değiştiğini ve ne hissettiğini not et.",
                null,
                english
                        ? List.of(
                                "What was the strongest emotion in the dream?",
                                "Which image or event stayed with you most?"
                        )
                        : List.of(
                                "Rüyada en yoğun hissettiğin duygu neydi?",
                                "Seni en çok etkileyen görüntü veya olay hangisiydi?"
                        ),
                null,
                new DreamAnalysisResult.Safety(false, false, false)
        );
    }

    private DreamAnalysisResult.InputQuality quality(DreamAnalysisQuality level, String reason) {
        return new DreamAnalysisResult.InputQuality(level, reason);
    }
}
