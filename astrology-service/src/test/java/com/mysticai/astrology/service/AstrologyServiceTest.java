package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.NatalChartRequest;
import com.mysticai.astrology.dto.NatalChartResponse;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.NatalChartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AstrologyServiceTest {

    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private NatalChartCalculator natalChartCalculator;
    @Mock
    private TransitCalculator transitCalculator;
    @Mock
    private RabbitTemplate rabbitTemplate;

    private AstrologyService service;

    @BeforeEach
    void setUp() {
        service = new AstrologyService(
                natalChartRepository,
                natalChartCalculator,
                transitCalculator,
                rabbitTemplate,
                new ObjectMapper()
        );
        lenient().when(natalChartRepository.save(any())).thenAnswer(invocation -> {
            NatalChart saved = invocation.getArgument(0);
            if (saved == null) {
                return null;
            }
            if (saved.getId() == null) {
                saved.setId(1000L + System.nanoTime());
            }
            if (saved.getCalculatedAt() == null) {
                saved.setCalculatedAt(LocalDateTime.now());
            }
            return saved;
        });
    }

    @Test
    void shouldReuseCompletedChartWhenLocaleMatches() {
        NatalChart existing = baseChart(11L, "COMPLETED", "en", "Your chart highlights emotional clarity.");
        when(natalChartCalculator.getUtcOffset(any(), any(), any())).thenReturn(3.0);
        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(existing));

        NatalChartResponse response = service.calculateAndSaveNatalChart(baseRequest("en"));

        assertEquals(11L, response.id());
        verify(natalChartRepository, times(2)).save(any());
        verify(rabbitTemplate, times(1)).convertAndSend(eq("ai.exchange"), eq("ai.request"), any(Object.class));
    }

    @Test
    void shouldReuseLegacyCompletedEnglishChartWhenStoredLocaleMissing() {
        NatalChart existing = baseChart(12L, "COMPLETED", null, "Your birth chart reveals emotional intelligence.");
        when(natalChartCalculator.getUtcOffset(any(), any(), any())).thenReturn(3.0);
        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(existing));

        NatalChartResponse response = service.calculateAndSaveNatalChart(baseRequest("en"));

        assertEquals(12L, response.id());
        verify(natalChartRepository, times(2)).save(any());
        verify(rabbitTemplate, times(1)).convertAndSend(eq("ai.exchange"), eq("ai.request"), any(Object.class));
    }

    @Test
    void shouldIgnoreStalePendingChartAndCreateFreshRequest() {
        NatalChart stalePending = baseChart(13L, "PENDING", "en", null);
        stalePending.setCalculatedAt(LocalDateTime.now().minusMinutes(30));

        when(natalChartCalculator.getUtcOffset(any(), any(), any())).thenReturn(3.0);
        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(stalePending));
        when(transitCalculator.calculateTransitPositions(any())).thenReturn(List.of());
        when(natalChartRepository.save(any())).thenAnswer(new org.mockito.stubbing.Answer<NatalChart>() {
            private long nextId = 99L;

            @Override
            public NatalChart answer(org.mockito.invocation.InvocationOnMock invocation) {
                NatalChart saved = invocation.getArgument(0);
                if (saved.getId() == null) {
                    saved.setId(nextId++);
                }
                saved.setCalculatedAt(LocalDateTime.now());
                return saved;
            }
        });

        NatalChartResponse response = service.calculateAndSaveNatalChart(baseRequest("en"));

        assertEquals(13L, response.id());
        verify(natalChartRepository, times(3)).save(any());
        verify(rabbitTemplate, times(2)).convertAndSend(eq("ai.exchange"), eq("ai.request"), any(Object.class));
    }

    @Test
    void shouldReturnCompletedChartWhenLatestRecordIsStalePending() {
        NatalChart stalePending = baseChart(20L, "PENDING", "en", null);
        stalePending.setCalculatedAt(LocalDateTime.now().minusMinutes(45));
        NatalChart completed = baseChart(19L, "COMPLETED", "en", "Your chart reflects resilient focus.");

        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(stalePending, completed));

        NatalChartResponse response = service.getLatestNatalChartByUserId(42L, "en");

        assertEquals(19L, response.id());
    }

    @Test
    void shouldPreferLocaleMatchedChartWhenLatestDifferentLocaleExists() {
        NatalChart latestTurkish = baseChart(30L, "COMPLETED", "tr", "Doğum haritan duygusal ritmini gösteriyor.");
        NatalChart english = baseChart(29L, "COMPLETED", "en", "Your chart reveals a resilient emotional rhythm.");
        latestTurkish.setCalculatedAt(LocalDateTime.now().minusMinutes(1));
        english.setCalculatedAt(LocalDateTime.now().minusMinutes(3));

        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(latestTurkish, english));

        NatalChartResponse response = service.getLatestNatalChartByUserId(42L, "en");

        assertEquals(29L, response.id());
    }

    @Test
    void shouldNotFallbackToWrongLocaleWhenRequestedLocaleMissingInHistory() {
        NatalChart latestTurkish = baseChart(31L, "COMPLETED", "tr", "Doğum haritan duygusal ritmini gösteriyor.");

        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(latestTurkish));

        assertThrows(IllegalArgumentException.class, () -> service.getLatestNatalChartByUserId(42L, "en"));
    }

    @Test
    void shouldNotReuseStoredEnglishChartWhenInterpretationStillLooksTurkish() {
        NatalChart existing = baseChart(32L, "COMPLETED", "en", "Moon'ın nazik ışığıyla yıkanan Yengeç enerjisi ruhunu gösteriyor.");
        when(natalChartCalculator.getUtcOffset(any(), any(), any())).thenReturn(3.0);
        when(natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(List.of(existing));
        when(transitCalculator.calculateTransitPositions(any())).thenReturn(List.of());
        when(natalChartRepository.save(any())).thenAnswer(new org.mockito.stubbing.Answer<NatalChart>() {
            private long nextId = 100L;

            @Override
            public NatalChart answer(org.mockito.invocation.InvocationOnMock invocation) {
                NatalChart saved = invocation.getArgument(0);
                if (saved.getId() == null) {
                    saved.setId(nextId++);
                }
                saved.setCalculatedAt(LocalDateTime.now());
                return saved;
            }
        });

        NatalChartResponse response = service.calculateAndSaveNatalChart(baseRequest("en"));

        assertEquals(32L, response.id());
        verify(natalChartRepository, times(3)).save(any());
        verify(rabbitTemplate, times(2)).convertAndSend(eq("ai.exchange"), eq("ai.request"), any(Object.class));
    }

    private NatalChartRequest baseRequest(String locale) {
        return new NatalChartRequest(
                42L,
                "Taylor",
                LocalDate.of(1990, 8, 18),
                LocalTime.of(9, 30),
                "Istanbul, Turkey",
                41.0082,
                28.9784,
                "Europe/Istanbul",
                locale
        );
    }

    private NatalChart baseChart(Long id, String status, String requestedLocale, String interpretation) {
        return NatalChart.builder()
                .id(id)
                .userId("42")
                .name("Taylor")
                .birthDate(LocalDate.of(1990, 8, 18))
                .birthTime(LocalTime.of(9, 30))
                .birthLocation("Istanbul, Turkey")
                .latitude(41.0082)
                .longitude(28.9784)
                .utcOffset(3.0)
                .sunSign("VIRGO")
                .moonSign("PISCES")
                .risingSign("LIBRA")
                .interpretationStatus(status)
                .requestedLocale(requestedLocale)
                .aiInterpretation(interpretation)
                .calculatedAt(LocalDateTime.now().minusMinutes(2))
                .build();
    }
}
