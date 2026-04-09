package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.DailyActionStateRepository;
import com.mysticai.astrology.repository.DailyTransitsCacheRepository;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.UserFeedbackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyTransitsServiceTest {

    @Mock
    private TransitCalculator transitCalculator;
    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private DailyTransitsCacheRepository dailyTransitsCacheRepository;
    @Mock
    private DailyActionStateRepository dailyActionStateRepository;
    @Mock
    private UserFeedbackRepository userFeedbackRepository;

    private DailyTransitsService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new DailyTransitsService(
                transitCalculator,
                natalChartRepository,
                dailyTransitsCacheRepository,
                dailyActionStateRepository,
                userFeedbackRepository,
                objectMapper
        );

        lenient().when(dailyTransitsCacheRepository.findFirstByUserIdAndTransitDateAndTimezoneAndLocationVersionOrderByCreatedAtDesc(
                any(Long.class), any(LocalDate.class), anyString(), anyString()
        )).thenReturn(Optional.empty());
        lenient().when(dailyTransitsCacheRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(userFeedbackRepository.findTop120ByUserIdOrderByCreatedAtDesc(any(Long.class))).thenReturn(List.of());
        lenient().when(userFeedbackRepository.findFirstByUserIdOrderByCreatedAtDesc(any(Long.class))).thenReturn(Optional.empty());
        lenient().when(transitCalculator.getMoonPhase(any(LocalDate.class))).thenReturn("İlk Dördün");
        lenient().when(transitCalculator.getTransitHouse(any(PlanetPosition.class), anyList()))
                .thenAnswer(invocation -> ((PlanetPosition) invocation.getArgument(0)).house());
    }

    @Test
    void shouldUseRealHouseTransitsInsteadOfSyntheticFillersWhenAspectListIsEmpty() throws Exception {
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(baseChart(baseNatalPlanets(), baseHouses())));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class))).thenReturn(List.of(
                planet("Mercury", false, 3),
                planet("Venus", false, 7),
                planet("Mars", false, 10)
        ));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of());

        DailyTransitsDTO response = service.getDailyTransits(42L, LocalDate.of(2026, 4, 9), "Europe/Istanbul");

        assertEquals(3, response.transits().size());
        assertTrue(response.transits().stream().anyMatch(item -> item.technical() != null && "Ev Geçişi".equals(item.technical().aspect())));
        assertTrue(response.transits().stream().allMatch(item -> item.timeWindow() == null));
        assertTrue(response.transits().stream().allMatch(item -> item.technical() == null || item.technical().exactAt() == null));
        assertFalse(response.transits().stream().anyMatch(item -> item.technical() != null && "Genel Akış".equals(item.technical().natalPoint())));
        assertFalse(response.transits().stream().anyMatch(item -> item.technical() != null && "FLOW".equals(item.technical().aspect())));
        assertFalse(response.transits().stream().anyMatch(item -> item.technical() != null && "PRESSURE".equals(item.technical().aspect())));
    }

    @Test
    void shouldNotInventExactTimesForTransitAspectCards() throws Exception {
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(baseChart(baseNatalPlanets(), baseHouses())));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class))).thenReturn(List.of(
                planet("Mercury", false, 3),
                planet("Venus", false, 7),
                planet("Mars", false, 10)
        ));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of(
                new PlanetaryAspect("T-Mercury", "N-Sun", PlanetaryAspect.AspectType.CONJUNCTION, 0.0, 0.4)
        ));

        DailyTransitsDTO response = service.getDailyTransits(42L, LocalDate.of(2026, 4, 9), "Europe/Istanbul");

        DailyTransitsDTO.TransitItem aspectItem = response.transits().stream()
                .filter(item -> item.technical() != null && "Kavuşum".equals(item.technical().aspect()))
                .findFirst()
                .orElseThrow();

        assertNull(aspectItem.timeWindow());
        assertNotNull(aspectItem.technical());
        assertNull(aspectItem.technical().exactAt());
    }

    @Test
    void shouldRankTighterLuminaryAspectAboveLooserSecondaryAspect() throws Exception {
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(baseChart(baseNatalPlanets(), baseHouses())));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class))).thenReturn(List.of(
                planet("Mercury", false, 10),
                planet("Venus", false, 2),
                planet("Mars", false, 6)
        ));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of(
                new PlanetaryAspect("T-Mercury", "N-Sun", PlanetaryAspect.AspectType.CONJUNCTION, 0.0, 0.3),
                new PlanetaryAspect("T-Venus", "N-Saturn", PlanetaryAspect.AspectType.SEXTILE, 60.0, 4.5)
        ));

        DailyTransitsDTO response = service.getDailyTransits(42L, LocalDate.of(2026, 4, 9), "Europe/Istanbul");

        assertTrue(response.transits().size() >= 2);
        DailyTransitsDTO.TransitItem first = response.transits().get(0);
        DailyTransitsDTO.TransitItem second = response.transits().get(1);
        assertEquals("Merkür", first.technical().transitPlanet());
        assertTrue(first.importance() > second.importance());
    }

    @Test
    void shouldDescribeRetrogradesWithHouseContext() throws Exception {
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(baseChart(baseNatalPlanets(), baseHouses())));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class))).thenReturn(List.of(
                planet("Mercury", true, 3),
                planet("Venus", false, 7)
        ));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of());

        DailyTransitsDTO response = service.getDailyTransits(42L, LocalDate.of(2026, 4, 9), "Europe/Istanbul");

        assertEquals(1, response.retrogrades().size());
        DailyTransitsDTO.RetrogradeItem retro = response.retrogrades().get(0);
        assertEquals("High", retro.riskLevel());
        assertTrue(retro.meaningPlain().contains("yakın çevre") || retro.meaningPlain().contains("iletişim"));
    }

    private NatalChart baseChart(List<PlanetPosition> planets, List<HousePlacement> houses) throws Exception {
        return NatalChart.builder()
                .id(10L)
                .userId("42")
                .name("Demo")
                .birthDate(LocalDate.of(1995, 1, 10))
                .birthLocation("Istanbul")
                .sunSign("Capricorn")
                .moonSign("Cancer")
                .risingSign("Libra")
                .planetPositionsJson(objectMapper.writeValueAsString(planets))
                .housePlacementsJson(objectMapper.writeValueAsString(houses))
                .calculatedAt(LocalDateTime.of(2026, 4, 1, 12, 0))
                .build();
    }

    private List<PlanetPosition> baseNatalPlanets() {
        return List.of(
                new PlanetPosition("Sun", "Capricorn", 10, 0, 0, false, 9, 280.0),
                new PlanetPosition("Moon", "Cancer", 9, 0, 0, false, 4, 99.0),
                new PlanetPosition("Saturn", "Pisces", 18, 0, 0, false, 6, 348.0)
        );
    }

    private List<HousePlacement> baseHouses() {
        return List.of(
                new HousePlacement(1, "Libra", 0, "Venus"),
                new HousePlacement(2, "Scorpio", 0, "Mars"),
                new HousePlacement(3, "Sagittarius", 0, "Jupiter"),
                new HousePlacement(4, "Capricorn", 0, "Saturn"),
                new HousePlacement(5, "Aquarius", 0, "Saturn"),
                new HousePlacement(6, "Pisces", 0, "Jupiter"),
                new HousePlacement(7, "Aries", 0, "Mars"),
                new HousePlacement(8, "Taurus", 0, "Venus"),
                new HousePlacement(9, "Gemini", 0, "Mercury"),
                new HousePlacement(10, "Cancer", 0, "Moon"),
                new HousePlacement(11, "Leo", 0, "Sun"),
                new HousePlacement(12, "Virgo", 0, "Mercury")
        );
    }

    private PlanetPosition planet(String name, boolean retrograde, int house) {
        return new PlanetPosition(name, "Aries", 10, 0, 0, retrograde, house, 10.0);
    }
}
