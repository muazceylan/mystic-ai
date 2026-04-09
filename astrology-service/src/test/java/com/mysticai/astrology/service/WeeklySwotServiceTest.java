package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.WeeklySwotResponse;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.NatalChartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeeklySwotServiceTest {

    @Mock
    private TransitCalculator transitCalculator;
    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private WeeklySwotService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new WeeklySwotService(transitCalculator, natalChartRepository, redisTemplate, objectMapper);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.get(anyString())).thenReturn(null);
        lenient().when(transitCalculator.getMoonPhase(any(LocalDate.class))).thenReturn("İlk Dördün");
    }

    @Test
    void shouldKeepQuietWeeksLowIntensityAndUserSpecific() throws Exception {
        NatalChart chart = baseChart(List.of(), List.of());
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(chart));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class)))
                .thenReturn(List.of(
                        planet("Sun", false),
                        planet("Venus", false),
                        planet("Mercury", false)
                ));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of());

        WeeklySwotResponse response = service.getWeeklySwot(42L);

        assertEquals(5, response.strength().intensity());
        assertEquals(5, response.opportunity().intensity());
        assertTrue(response.strength().headline().contains("Oğlak"));
        assertTrue(response.weakness().headline().contains("Yengeç"));
        assertTrue(response.flashInsight().headline().contains("Oğlak"));
    }

    @Test
    void shouldDescribeVenusHouseOpportunityWithoutInflatingAcrossWeek() throws Exception {
        NatalChart chart = baseChart(
                List.of(),
                List.of(new HousePlacement(7, "Aries", 0, "Mars"))
        );
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(chart));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class)))
                .thenReturn(List.of(planet("Venus", false), planet("Mercury", false)));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of());
        when(transitCalculator.getTransitHouse(any(PlanetPosition.class), anyList())).thenReturn(7);

        WeeklySwotResponse response = service.getWeeklySwot(42L);

        assertEquals(12, response.opportunity().intensity());
        assertTrue(response.opportunity().headline().contains("Venüs 7. ev"));
        assertTrue(response.opportunity().subtext().contains("İlişkiler"));
    }

    @Test
    void shouldDetectMercuryRetroByPlanetNameInsteadOfListIndex() throws Exception {
        NatalChart chart = baseChart(List.of(), List.of());
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(chart));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class)))
                .thenReturn(List.of(planet("Mercury", true)));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of());

        WeeklySwotResponse response = service.getWeeklySwot(42L);

        assertEquals(8, response.threat().intensity());
        assertTrue(response.threat().headline().contains("Merkür retrosu"));
    }

    @Test
    void shouldKeepMcInTenthHouseWhenAriesDegreeIsUsedForVirtualPoint() throws Exception {
        NatalChart chart = baseChart(List.of(), List.of());
        chart.setMcDegree(0.5);
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(chart));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class)))
                .thenReturn(List.of(planet("Jupiter", false)));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList()))
                .thenReturn(List.of(new PlanetaryAspect("T-Jupiter", "N-MC", PlanetaryAspect.AspectType.TRINE, 120.0, 0.8)));

        WeeklySwotResponse response = service.getWeeklySwot(42L);

        assertTrue(response.strength().subtext().contains("kariyer ve hedefler"));
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
                .build();
    }

    private PlanetPosition planet(String name, boolean retrograde) {
        return new PlanetPosition(name, "Aries", 10, 0, 0, retrograde, 1, 10.0);
    }
}
