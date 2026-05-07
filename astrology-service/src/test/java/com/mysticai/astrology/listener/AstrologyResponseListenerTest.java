package com.mysticai.astrology.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.entity.DreamEntry;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.DreamEntryRepository;
import com.mysticai.astrology.repository.LuckyDatesResultRepository;
import com.mysticai.astrology.repository.MonthlyDreamStoryRepository;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AstrologyResponseListenerTest {

    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private LuckyDatesResultRepository luckyDatesResultRepository;
    @Mock
    private DreamEntryRepository dreamEntryRepository;
    @Mock
    private MonthlyDreamStoryRepository monthlyDreamStoryRepository;
    @Mock
    private SynastryRepository synastryRepository;

    private AstrologyResponseListener listener;

    @BeforeEach
    void setUp() {
        listener = new AstrologyResponseListener(
                natalChartRepository,
                luckyDatesResultRepository,
                dreamEntryRepository,
                monthlyDreamStoryRepository,
                synastryRepository,
                new ObjectMapper()
        );
    }

    @Test
    void shouldNormalizeDreamSynthesisResponseWithAliasFieldsAndStringifiedArrays() {
        UUID correlationId = UUID.randomUUID();
        DreamEntry entry = DreamEntry.builder()
                .id(77L)
                .userId(11L)
                .correlationId(correlationId)
                .interpretationStatus("PENDING")
                .build();

        when(dreamEntryRepository.findByCorrelationId(correlationId)).thenReturn(Optional.of(entry));
        when(dreamEntryRepository.save(any(DreamEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String aiPayload = """
                ```json
                {
                  yorum: "Kapali kapi, erteledigin bir duygunun yeniden gorulmek istedigini soyluyor.",
                  firsatlar: "[\\"Bugun sembolleri not al\\", \\"Aksam sakin bir rutin kur\\"]",
                  uyarilar: ["Acele karar verme", "Eski korkuyu bugune tasima",],
                }
                ```
                """;

        AiAnalysisResponseEvent event = new AiAnalysisResponseEvent(
                correlationId,
                11L,
                "{}",
                AiAnalysisEvent.SourceService.DREAM,
                AiAnalysisEvent.AnalysisType.DREAM_SYNTHESIS,
                aiPayload,
                true,
                null,
                LocalDateTime.now()
        );

        listener.handleAiResponse(event);

        ArgumentCaptor<DreamEntry> captor = ArgumentCaptor.forClass(DreamEntry.class);
        verify(dreamEntryRepository).save(captor.capture());

        DreamEntry saved = captor.getValue();
        assertEquals("COMPLETED", saved.getInterpretationStatus());
        assertEquals("Kapali kapi, erteledigin bir duygunun yeniden gorulmek istedigini soyluyor.", saved.getInterpretation());
        assertEquals("[\"Bugun sembolleri not al\",\"Aksam sakin bir rutin kur\"]", saved.getOpportunitiesJson());
        assertEquals("[\"Acele karar verme\",\"Eski korkuyu bugune tasima\"]", saved.getWarningsJson());
    }

    @Test
    void shouldFallbackWhenRelationshipInsightMentionsDifferentScore() {
        UUID correlationId = UUID.randomUUID();
        Synastry synastry = Synastry.builder()
                .id(91L)
                .userId(11L)
                .relationshipType("LOVE")
                .harmonyScore(79)
                .baseHarmonyScore(84)
                .personAType("USER")
                .personBType("SAVED_PERSON")
                .correlationId(correlationId)
                .status("PENDING")
                .build();

        when(synastryRepository.findByCorrelationId(correlationId)).thenReturn(Optional.of(synastry));
        when(synastryRepository.save(any(Synastry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String aiPayload = """
                {
                  "harmonyScore": 79,
                  "harmonyInsight": "Sen ve karşı taraf arasında aşk odağında 84 puanlık, yüksek bir uyum görünüyor.",
                  "strengths": ["Destek var.", "Çekim akıyor.", "İletişim toparlıyor."],
                  "challenges": ["Tempo farkı olabilir.", "Beklenti dili ayrışabilir."],
                  "keyWarning": "Varsayım risklidir.",
                  "cosmicAdvice": "Önce duyguyu, sonra ihtiyacı konuşun."
                }
                """;

        AiAnalysisResponseEvent event = new AiAnalysisResponseEvent(
                correlationId,
                11L,
                "{}",
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS,
                aiPayload,
                true,
                null,
                LocalDateTime.now()
        );

        listener.handleAiResponse(event);

        ArgumentCaptor<Synastry> captor = ArgumentCaptor.forClass(Synastry.class);
        verify(synastryRepository).save(captor.capture());

        Synastry saved = captor.getValue();
        assertEquals("COMPLETED", saved.getStatus());
        assertEquals(79, saved.getHarmonyScore());
        assertFalse(saved.getHarmonyInsight().contains("84 puanlık"));
        assertEquals(
                "Sen ve Kişi B arasında aşk odağında 79 puanlık, orta-yüksek bir uyum görülüyor. Güçlü alanlarda akış doğal olabilir; zorlayıcı alanlarda tempo farkını konuşmak belirleyici olur. Düzenli ve kısa check-in konuşmaları bu bağı daha dengeli hale getirebilir.",
                saved.getHarmonyInsight()
        );
    }
}
