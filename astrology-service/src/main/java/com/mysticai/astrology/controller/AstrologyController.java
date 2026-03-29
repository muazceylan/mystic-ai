package com.mysticai.astrology.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.ZodiacSign;
import com.mysticai.astrology.service.AstrologyService;
import com.mysticai.astrology.service.DailyLifeGuideService;
import com.mysticai.astrology.service.LuckyDatesService;
import com.mysticai.astrology.service.NightSkyPosterService;
import com.mysticai.astrology.service.PosterEndpointGuardService;
import com.mysticai.astrology.service.SkyPulseService;
import com.mysticai.astrology.service.WeeklySwotService;
import com.mysticai.common.event.AiAnalysisEvent;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/astrology")
@RequiredArgsConstructor
public class AstrologyController {

    private final AstrologyService astrologyService;
    private final LuckyDatesService luckyDatesService;
    private final DailyLifeGuideService dailyLifeGuideService;
    private final NightSkyPosterService nightSkyPosterService;
    private final PosterEndpointGuardService posterEndpointGuardService;
    private final SkyPulseService skyPulseService;
    private final WeeklySwotService weeklySwotService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";

    /**
     * Calculate natal chart from birth information
     */
    @PostMapping("/calculate")
    public ResponseEntity<NatalChartResponse> calculateNatalChart(
            @Valid @RequestBody NatalChartRequest request
    ) {
        NatalChartResponse response = astrologyService.calculateAndSaveNatalChart(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get natal chart by ID
     */
    @GetMapping("/natal-chart/{id}")
    public ResponseEntity<NatalChartResponse> getNatalChartById(@PathVariable Long id) {
        return ResponseEntity.ok(astrologyService.getNatalChartById(id));
    }

    /**
     * Get all natal charts for a user
     */
    @GetMapping("/natal-charts/user/{userId}")
    public ResponseEntity<List<NatalChartResponse>> getNatalChartsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(astrologyService.getNatalChartsByUserId(userId));
    }

    /**
     * Get latest natal chart for a user
     */
    @GetMapping("/natal-charts/user/{userId}/latest")
    public ResponseEntity<NatalChartResponse> getLatestNatalChart(
            @PathVariable Long userId,
            @RequestParam(required = false) String locale
    ) {
        return ResponseEntity.ok(astrologyService.getLatestNatalChartByUserId(userId, locale));
    }

    /**
     * Quick sun sign calculation without saving
     */
    @GetMapping("/sun-sign")
    public ResponseEntity<Map<String, Object>> getSunSign(
            @RequestParam int month,
            @RequestParam int day
    ) {
        ZodiacSign sign = astrologyService.calculateSunSignOnly(month, day);
        return ResponseEntity.ok(Map.of(
                "sign", sign.name(),
                "turkishName", sign.getTurkishName(),
                "symbol", sign.getSymbol(),
                "element", sign.getElement(),
                "dateRange", sign.getDateRange()
        ));
    }

    /**
     * Get all zodiac signs information
     */
    @GetMapping("/zodiac-signs")
    public ResponseEntity<List<Map<String, String>>> getAllZodiacSigns() {
        List<Map<String, String>> signs = Arrays.stream(ZodiacSign.values())
                .filter(sign -> sign != ZodiacSign.UNKNOWN)
                .map(sign -> Map.of(
                        "name", sign.name(),
                        "turkishName", sign.getTurkishName(),
                        "symbol", sign.getSymbol(),
                        "element", sign.getElement(),
                        "dateRange", sign.getDateRange()
                ))
                .toList();
        return ResponseEntity.ok(signs);
    }

    /**
     * Request periodic (daily/weekly/monthly) astrological analysis
     */
    @PostMapping("/periodic-analysis")
    public ResponseEntity<Map<String, Object>> requestPeriodicAnalysis(
            @Valid @RequestBody PeriodicAnalysisRequest request
    ) throws JsonProcessingException {
        String payload = objectMapper.writeValueAsString(Map.of(
                "sunSign", request.sunSign(),
                "moonSign", request.moonSign(),
                "period", request.period(),
                "natalChart", request.natalChartSummary()
        ));
        
        AiAnalysisEvent event = new AiAnalysisEvent(
                UUID.randomUUID(),
                request.userId(),
                payload,
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.PERIODIC,
                LocalDateTime.now()
        );
        
        rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, event);
        
        return ResponseEntity.accepted().body(Map.of(
                "message", "Periodic analysis request submitted",
                "correlationId", event.correlationId(),
                "status", "PROCESSING"
        ));
    }

    /**
     * Request SWOT astrological analysis
     */
    @PostMapping("/swot-analysis")
    public ResponseEntity<Map<String, Object>> requestSwotAnalysis(
            @Valid @RequestBody SwotAnalysisRequest request
    ) throws JsonProcessingException {
        String payload = objectMapper.writeValueAsString(Map.of(
                "birthChart", request.birthChart(),
                "currentTransits", request.currentTransits(),
                "question", request.question()
        ));
        
        AiAnalysisEvent event = new AiAnalysisEvent(
                request.userId(),
                payload,
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.SWOT
        );
        
        rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, event);
        
        return ResponseEntity.accepted().body(Map.of(
                "message", "SWOT analysis request submitted",
                "correlationId", event.correlationId(),
                "status", "PROCESSING"
        ));
    }

    /**
     * Calculate lucky dates for a goal category based on natal chart and transits
     */
    @PostMapping("/lucky-dates")
    public ResponseEntity<LuckyDatesResponse> calculateLuckyDates(
            @Valid @RequestBody LuckyDatesRequest request
    ) {
        LuckyDatesResponse response = luckyDatesService.calculateLuckyDates(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Full daily planner distribution for all planner categories.
     */
    @PostMapping("/planner/full-distribution")
    public ResponseEntity<PlannerFullDistributionResponse> getPlannerFullDistribution(
            @Valid @RequestBody PlannerFullDistributionRequest request
    ) {
        PlannerFullDistributionResponse response = luckyDatesService.calculatePlannerFullDistribution(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Daily activity-level life guide (Kozmik Yaşam Rehberi) for home dashboard.
     */
    @PostMapping("/life-guide/daily")
    public ResponseEntity<DailyLifeGuideResponse> getDailyLifeGuide(
            @Valid @RequestBody DailyLifeGuideRequest request
    ) {
        return ResponseEntity.ok(dailyLifeGuideService.getDailyGuide(request));
    }

    /**
     * Get all lucky dates results for a user
     */
    @GetMapping("/lucky-dates/user/{userId}")
    public ResponseEntity<List<LuckyDatesResponse>> getLuckyDatesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(luckyDatesService.getLuckyDatesByUser(userId));
    }

    /**
     * Poll for lucky dates AI completion by correlationId
     */
    @GetMapping("/lucky-dates/{correlationId}")
    public ResponseEntity<LuckyDatesResponse> getLuckyDatesByCorrelationId(
            @PathVariable UUID correlationId
    ) {
        return ResponseEntity.ok(luckyDatesService.getLuckyDatesByCorrelationId(correlationId));
    }

    /**
     * Get weekly SWOT analysis based on user's natal chart and current transits
     */
    @GetMapping("/weekly-swot")
    public ResponseEntity<WeeklySwotResponse> getWeeklySwot(@RequestParam Long userId) {
        return ResponseEntity.ok(weeklySwotService.getWeeklySwot(userId));
    }

    /**
     * Get today's Sky Pulse - moon sign, phase, retrogrades, and daily vibe
     */
    @GetMapping("/sky-pulse")
    public ResponseEntity<SkyPulseResponse> getSkyPulse() {
        return ResponseEntity.ok(skyPulseService.getSkyPulse());
    }

    /**
     * Real birth-night sky projection using Swiss Ephemeris horizontal coordinates (azimuth/altitude).
     */
    @PostMapping("/posters/night-sky/projection")
    public ResponseEntity<NightSkyProjectionResponse> projectNightSky(
            HttpServletRequest httpRequest,
            @RequestBody NightSkyProjectionRequest request
    ) {
        posterEndpointGuardService.checkProjection(httpRequest, request);
        return ResponseEntity.ok(nightSkyPosterService.projectNightSky(request));
    }

    /**
     * Creates a personalized short-lived share token/link for the night-sky poster.
     */
    @PostMapping("/posters/night-sky/share-link")
    public ResponseEntity<NightSkyPosterShareLinkResponse> createNightSkyPosterShareLink(
            HttpServletRequest httpRequest,
            @RequestBody NightSkyPosterShareLinkRequest request
    ) {
        posterEndpointGuardService.checkShareLink(httpRequest, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(nightSkyPosterService.createNightSkyShareLink(request));
    }

    /**
     * Resolves public poster share token payload (for web share landing page / mobile preview restore).
     */
    @GetMapping("/posters/night-sky/share/{token}")
    public ResponseEntity<NightSkyPosterShareTokenResolveResponse> resolveNightSkyPosterShareToken(
            HttpServletRequest httpRequest,
            @PathVariable String token
    ) {
        posterEndpointGuardService.checkShareResolve(httpRequest, token);
        try {
            return ResponseEntity.ok(nightSkyPosterService.resolveNightSkyShareToken(token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Health check
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Astrology Service is running");
    }
}
