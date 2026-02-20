package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.ZodiacSign;
import com.mysticai.astrology.repository.NatalChartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AstrologyService {

    private final NatalChartRepository natalChartRepository;
    private final NatalChartCalculator natalChartCalculator;
    private final TransitCalculator transitCalculator;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";

    @Transactional
    public NatalChartResponse calculateAndSaveNatalChart(NatalChartRequest request) {
        log.info("Calculating natal chart for user: {}", request.userId());

        LocalTime birthTime = request.birthTime() != null ? request.birthTime() : LocalTime.NOON;
        double[] coords = natalChartCalculator.parseLocation(request.birthLocation());
        double latitude = coords[0];
        double longitude = coords[1];

        // Calculate all positions (SwissEph high-precision)
        List<PlanetPosition> planets = natalChartCalculator.calculatePlanetPositions(
                request.birthDate(), birthTime, latitude, longitude);
        List<HousePlacement> houses = natalChartCalculator.calculateHouses(
                request.birthDate(), birthTime, latitude, longitude);
        String sunSign = natalChartCalculator.calculateSunSign(request.birthDate());
        String moonSign = natalChartCalculator.calculateMoonSign(request.birthDate());
        String risingSign = natalChartCalculator.calculateAscendant(
                request.birthDate(), birthTime, latitude, longitude);

        // Get Ascendant and MC degrees for SWOT aspect calculations
        double ascendantDegree = natalChartCalculator.getAscendantDegree(
                request.birthDate(), birthTime, latitude, longitude);
        double mcDegree = natalChartCalculator.getMcDegree(
                request.birthDate(), birthTime, latitude, longitude);

        // Calculate planetary aspects
        List<PlanetaryAspect> aspects = natalChartCalculator.calculateAspects(planets);

        // Convert to JSON for storage
        String planetJson;
        String houseJson;
        String aspectsJson;
        try {
            planetJson = objectMapper.writeValueAsString(planets);
            houseJson = objectMapper.writeValueAsString(houses);
            aspectsJson = objectMapper.writeValueAsString(aspects);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize chart data", e);
            planetJson = "[]";
            houseJson = "[]";
            aspectsJson = "[]";
        }

        // Build and save natal chart
        NatalChart chart = NatalChart.builder()
                .userId(request.userId() != null ? request.userId().toString() : null)
                .name(request.name())
                .birthDate(request.birthDate())
                .birthTime(birthTime)
                .birthLocation(request.birthLocation())
                .latitude(latitude)
                .longitude(longitude)
                .sunSign(sunSign)
                .moonSign(moonSign)
                .risingSign(risingSign)
                .ascendantDegree(ascendantDegree)
                .mcDegree(mcDegree)
                .utcOffset(natalChartCalculator.getTurkeyUtcOffset(request.birthDate(), birthTime))
                .planetPositionsJson(planetJson)
                .housePlacementsJson(houseJson)
                .aspectsJson(aspectsJson)
                .interpretationStatus("PENDING")
                .build();

        NatalChart savedChart = natalChartRepository.save(chart);
        log.info("Saved natal chart with id: {} for user: {}", savedChart.getId(), request.userId());

        // Send to AI Orchestrator for interpretation
        sendToAiOrchestrator(savedChart, planets, houses, aspects);

        return mapToResponse(savedChart, planets, houses, null);
    }

    private void sendToAiOrchestrator(NatalChart chart, List<PlanetPosition> planets,
                                      List<HousePlacement> houses, List<PlanetaryAspect> aspects) {
        try {
            // Build current transit summary for AI context
            List<PlanetPosition> currentTransits = transitCalculator.calculateTransitPositions(LocalDate.now());
            List<String> transitSummary = currentTransits.stream()
                    .map(t -> t.planet() + " " + t.sign() + " " + t.degree() + "°"
                            + (t.retrograde() ? " (R)" : ""))
                    .toList();

            String payload = objectMapper.writeValueAsString(new NatalChartAiPayload(
                    chart.getId(),
                    chart.getName(),
                    chart.getSunSign(),
                    chart.getMoonSign(),
                    chart.getRisingSign(),
                    chart.getAscendantDegree() != null ? chart.getAscendantDegree() : 0.0,
                    planets,
                    houses,
                    aspects,
                    transitSummary
            ));

            com.mysticai.common.event.AiAnalysisEvent event =
                    new com.mysticai.common.event.AiAnalysisEvent(
                            chart.getUserId() != null ? Long.valueOf(chart.getUserId()) : null,
                            payload,
                            com.mysticai.common.event.AiAnalysisEvent.SourceService.ASTROLOGY,
                            com.mysticai.common.event.AiAnalysisEvent.AnalysisType.NATAL_CHART
                    );

            rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, event);
            log.info("Sent natal chart {} to AI Orchestrator", chart.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to send natal chart to AI Orchestrator", e);
        }
    }

    public NatalChartResponse getNatalChartById(Long id) {
        NatalChart chart = natalChartRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Natal chart not found: " + id));
        return mapToResponse(chart, null, null, chart.getAiInterpretation());
    }

    public List<NatalChartResponse> getNatalChartsByUserId(Long userId) {
        return natalChartRepository.findAllByUserId(userId != null ? userId.toString() : null)
                .stream()
                .map(c -> mapToResponse(c, null, null, c.getAiInterpretation()))
                .toList();
    }

    public NatalChartResponse getLatestNatalChartByUserId(Long userId) {
        NatalChart chart = natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc(
                        userId != null ? userId.toString() : null)
                .orElseThrow(() -> new IllegalArgumentException("No natal chart found for user: " + userId));
        return mapToResponse(chart, null, null, chart.getAiInterpretation());
    }

    public ZodiacSign calculateSunSignOnly(int month, int day) {
        return ZodiacSign.fromDate(month, day);
    }

    private NatalChartResponse mapToResponse(NatalChart chart, List<PlanetPosition> planets,
                                              List<HousePlacement> houses, String interpretation) {
        List<PlanetPosition> planetList = planets;
        List<HousePlacement> houseList = houses;

        if (planetList == null && chart.getPlanetPositionsJson() != null) {
            try {
                planetList = objectMapper.readValue(chart.getPlanetPositionsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class));
            } catch (JsonProcessingException e) {
                planetList = List.of();
            }
        }

        if (houseList == null && chart.getHousePlacementsJson() != null) {
            try {
                houseList = objectMapper.readValue(chart.getHousePlacementsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, HousePlacement.class));
            } catch (JsonProcessingException e) {
                houseList = List.of();
            }
        }

        List<PlanetaryAspect> aspectList = List.of();
        if (chart.getAspectsJson() != null) {
            try {
                aspectList = objectMapper.readValue(chart.getAspectsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetaryAspect.class));
            } catch (JsonProcessingException e) {
                aspectList = List.of();
            }
        }

        return new NatalChartResponse(
                chart.getId(),
                chart.getUserId() != null ? Long.valueOf(chart.getUserId()) : null,
                chart.getName(),
                chart.getBirthDate(),
                chart.getBirthTime() != null ? chart.getBirthTime().toString() : null,
                chart.getBirthLocation(),
                chart.getLatitude(),
                chart.getLongitude(),
                chart.getSunSign(),
                chart.getMoonSign(),
                chart.getRisingSign(),
                planetList != null ? planetList : List.of(),
                houseList != null ? houseList : List.of(),
                aspectList,
                interpretation,
                chart.getInterpretationStatus(),
                chart.getCalculatedAt()
        );
    }

    private record NatalChartAiPayload(
            Long chartId,
            String name,
            String sunSign,
            String moonSign,
            String risingSign,
            double ascendantDegree,
            List<PlanetPosition> planets,
            List<HousePlacement> houses,
            List<PlanetaryAspect> aspects,
            List<String> currentTransitSummary
    ) {}
}
