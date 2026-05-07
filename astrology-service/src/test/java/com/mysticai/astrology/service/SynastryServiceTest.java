package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.SynastryDisplayMetric;
import com.mysticai.astrology.dto.SynastryModuleScore;
import com.mysticai.astrology.dto.SynastryResponse;
import com.mysticai.astrology.dto.SynastryScoreSnapshot;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SavedPersonRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SynastryServiceTest {

    @Mock
    private SynastryRepository synastryRepository;
    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private SavedPersonRepository savedPersonRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;

    private ObjectMapper objectMapper;
    private CanonicalCompatibilityScoringService canonicalCompatibilityScoringService;
    private SynastryService service;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        canonicalCompatibilityScoringService = new CanonicalCompatibilityScoringService();
        service = new SynastryService(
                synastryRepository,
                natalChartRepository,
                savedPersonRepository,
                rabbitTemplate,
                objectMapper,
                canonicalCompatibilityScoringService
        );

        when(savedPersonRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void shouldReplacePersistedHarmonyInsightWhenReferencedScoreMismatchesResponseScore() throws Exception {
        SynastryScoreSnapshot snapshot = new SynastryScoreSnapshot(
                84,
                Map.of(
                        "LOVE",
                        new SynastryModuleScore(
                                79,
                                List.of(new SynastryDisplayMetric("love.attraction", "Çekim", 79))
                        )
                ),
                0.92,
                "Yüksek",
                "high",
                null,
                null,
                "synastry-v4.1.0"
        );

        Synastry synastry = Synastry.builder()
                .id(240L)
                .userId(182L)
                .relationshipType("LOVE")
                .harmonyScore(79)
                .baseHarmonyScore(84)
                .scoreSnapshotJson(objectMapper.writeValueAsString(snapshot))
                .scoringVersion("synastry-v4.1.0")
                .harmonyInsight("Aylin ve Bora arasında aşk odağında 84 puanlık, yüksek bir uyum görünüyor.")
                .crossAspectsJson("[]")
                .status("COMPLETED")
                .personAType("USER")
                .personBType("SAVED_PERSON")
                .build();

        when(synastryRepository.findById(240L)).thenReturn(Optional.of(synastry));

        SynastryResponse response = service.getById(240L);

        assertEquals(79, response.harmonyScore());
        assertFalse(response.harmonyInsight().contains("84 puanlık"));
        assertEquals(
                "Sen ve Kişi B arasında aşk odağında 79 puanlık bir uyum görünüyor. Güçlü başlıkları koruyup zorlayıcı alanlarda iletişim ritmini netleştirmek ilişkiyi dengeler.",
                response.harmonyInsight()
        );
    }
}
