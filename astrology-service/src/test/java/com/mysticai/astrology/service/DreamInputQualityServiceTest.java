package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.DreamAnalysisQuality;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class DreamInputQualityServiceTest {

    private final DreamInputQualityService service = new DreamInputQualityService();

    @Test
    void shouldRejectVeryShortDreamWithoutInventingAnalysis() {
        var quality = service.evaluate("Bir kapı gördüm.");
        var result = service.insufficientResult(quality, "tr", "Bir kapı gördüm.");

        assertEquals(DreamAnalysisQuality.INSUFFICIENT, quality.level());
        assertEquals(2, result.followUpQuestions().size());
        assertFalse(result.deepInterpretation().isBlank());
        assertEquals(null, result.astrologyNote());
    }

    @Test
    void shouldExplicitlyRejectPredictionForShortDeathDream() {
        var quality = service.evaluate("Kardeşimin öldüğünü gördüm.");
        var result = service.insufficientResult(quality, "tr", "Kardeşimin öldüğünü gördüm.");

        assertEquals(DreamAnalysisQuality.INSUFFICIENT, quality.level());
        assertEquals(
                "Rüyada ölüm görmek gerçek bir ölüm haberi veya kehanet değildir.",
                result.essence()
        );
    }

    @Test
    void shouldMarkDetailedEmotionalNarrativeAsRich() {
        String dream = """
                Eski okulumdaydım. Sınava geç kalmıştım ama hangi sınıfa gideceğimi
                bilmiyordum. Koridorda herkes beni tanıyor gibiydi fakat ben kimseyi
                tanımıyordum. Telefonumdan annemi aramaya çalıştım ama ekran sürekli
                kararıyordu. En sonunda bahçeye çıktım ve sınavın ertelendiğini öğrendim.
                Uyandığımda hem rahat hem de utanmış hissettim.
                """;

        assertEquals(DreamAnalysisQuality.RICH, service.evaluate(dream).level());
    }

    @Test
    void shouldTreatRandomWordsAsLimited() {
        assertEquals(
                DreamAnalysisQuality.LIMITED,
                service.evaluate("Kedi mavi masa uçtu sonra sonra.").level()
        );
    }
}
