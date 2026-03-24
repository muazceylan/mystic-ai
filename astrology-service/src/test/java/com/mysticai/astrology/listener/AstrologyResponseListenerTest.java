package com.mysticai.astrology.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.entity.DreamEntry;
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
}
