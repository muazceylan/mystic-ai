package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.DailyLifeGuideActivity;
import com.mysticai.astrology.dto.DailyLifeGuideRequest;
import com.mysticai.astrology.dto.DailyLifeGuideResponse;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
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
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyLifeGuideServiceTest {

    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private TransitCalculator transitCalculator;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private DailyLifeGuideService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        service = new DailyLifeGuideService(natalChartRepository, transitCalculator, redisTemplate, objectMapper);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.get(anyString())).thenReturn(null);
        lenient().when(transitCalculator.getMoonPhase(any(LocalDate.class))).thenReturn("Hilal (Büyüyen)");
        lenient().when(transitCalculator.getTransitHouse(any(PlanetPosition.class), anyList()))
                .thenAnswer(invocation -> ((PlanetPosition) invocation.getArgument(0)).house());
    }

    @Test
    void shouldProduceMarriageSpecificActivitiesSeparateFromSocial() throws Exception {
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(baseChart()));
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class))).thenReturn(List.of(
                planet("Moon", "Libra", false, 7),
                planet("Venus", "Taurus", false, 7),
                planet("Jupiter", "Gemini", false, 11),
                planet("Mercury", "Aries", false, 10),
                planet("Saturn", "Pisces", false, 6),
                planet("Uranus", "Taurus", false, 8),
                planet("Pluto", "Aquarius", false, 5),
                planet("Mars", "Cancer", false, 10)
        ));
        when(transitCalculator.calculateTransitAspects(anyList(), anyList())).thenReturn(List.of());

        DailyLifeGuideResponse response = service.getDailyGuide(
                new DailyLifeGuideRequest(42L, "tr", "female", "engaged", LocalDate.of(2026, 4, 16))
        );

        Set<String> marriageKeys = response.activities().stream()
                .filter(item -> "marriage".equals(item.groupKey()))
                .map(DailyLifeGuideActivity::activityKey)
                .collect(Collectors.toSet());
        Set<String> socialKeys = response.activities().stream()
                .filter(item -> "social".equals(item.groupKey()))
                .map(DailyLifeGuideActivity::activityKey)
                .collect(Collectors.toSet());

        assertTrue(response.groups().stream().anyMatch(group -> "marriage".equals(group.groupKey())));
        assertTrue(marriageKeys.containsAll(Set.of("MARRIAGE", "ENGAGEMENT", "PROPOSAL", "DIVORCE")));
        assertTrue(socialKeys.containsAll(Set.of("FIRST_DATE", "FLIRT", "SOCIAL_INVITE")));
        assertTrue(marriageKeys.stream().noneMatch(socialKeys::contains));
    }

    private NatalChart baseChart() throws Exception {
        return NatalChart.builder()
                .id(10L)
                .userId("42")
                .name("Demo")
                .birthDate(LocalDate.of(1995, 1, 10))
                .birthLocation("Istanbul")
                .sunSign("Capricorn")
                .moonSign("Cancer")
                .risingSign("Libra")
                .planetPositionsJson(objectMapper.writeValueAsString(List.of(
                        planet("Sun", "Capricorn", false, 10),
                        planet("Moon", "Cancer", false, 4),
                        planet("Venus", "Scorpio", false, 7)
                )))
                .housePlacementsJson(objectMapper.writeValueAsString(List.of(
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
                )))
                .build();
    }

    private PlanetPosition planet(String name, String sign, boolean retrograde, int house) {
        return new PlanetPosition(name, sign, 10, 0, 0, retrograde, house, 10.0);
    }
}
