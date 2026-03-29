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

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
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
    private static final Duration PENDING_REUSE_WINDOW = Duration.ofMinutes(10);

    @Transactional
    public NatalChartResponse calculateAndSaveNatalChart(NatalChartRequest request) {
        log.info("Calculating natal chart for user: {}", request.userId());

        LocalTime birthTime = request.birthTime() != null ? request.birthTime() : LocalTime.NOON;
        String normalizedLocale = normalizeLocale(request.locale());
        String timezone = request.timezone();
        double[] coords = (request.latitude() != null && request.longitude() != null)
                ? new double[]{request.latitude(), request.longitude()}
                : natalChartCalculator.parseLocation(request.birthLocation());
        double latitude = coords[0];
        double longitude = coords[1];
        Double utcOffset = natalChartCalculator.getUtcOffset(request.birthDate(), birthTime, timezone);
        List<NatalChart> matchingCharts = findChartsByBirthSignature(request, birthTime, latitude, longitude, utcOffset);

        NatalChart reusableChart = findReusableChart(
                matchingCharts,
                normalizedLocale
        );
        if (reusableChart != null) {
            ParsedChartData reusableChartData = parseChartData(reusableChart, null, null, null);
            NatalChart preparedChart = ensureInterpretationRequested(reusableChart, reusableChartData, normalizedLocale);
            ensureLocaleVariant(matchingCharts, preparedChart, reusableChartData, otherLocale(normalizedLocale));
            log.info(
                    "Reusing natal chart {} for user {} with locale {} and status {}",
                    preparedChart.getId(),
                    request.userId(),
                    normalizedLocale,
                    preparedChart.getInterpretationStatus()
            );
            return mapToResponse(preparedChart, reusableChartData.planets(), reusableChartData.houses());
        }

        NatalChart seedChart = matchingCharts.stream().findFirst().orElse(null);
        if (seedChart != null) {
            ParsedChartData seedData = parseChartData(seedChart, null, null, null);
            NatalChart clonedChart = natalChartRepository.save(cloneChartForLocale(seedChart, normalizedLocale));
            log.info(
                    "Created natal chart {} for user {} by cloning chart {} into locale {}",
                    clonedChart.getId(),
                    request.userId(),
                    seedChart.getId(),
                    normalizedLocale
            );
            NatalChart preparedChart = ensureInterpretationRequested(clonedChart, seedData, normalizedLocale);
            List<NatalChart> updatedMatches = new ArrayList<>(matchingCharts);
            updatedMatches.add(preparedChart);
            ensureLocaleVariant(updatedMatches, preparedChart, seedData, otherLocale(normalizedLocale));
            return mapToResponse(preparedChart, seedData.planets(), seedData.houses());
        }

        // Calculate all positions (SwissEph high-precision)
        List<PlanetPosition> planets = natalChartCalculator.calculatePlanetPositions(
                request.birthDate(), birthTime, latitude, longitude, timezone);
        List<HousePlacement> houses = natalChartCalculator.calculateHouses(
                request.birthDate(), birthTime, latitude, longitude, timezone);
        String sunSign = natalChartCalculator.calculateSunSign(request.birthDate(), timezone);
        String moonSign = natalChartCalculator.calculateMoonSign(request.birthDate(), timezone);
        String risingSign = natalChartCalculator.calculateAscendant(
                request.birthDate(), birthTime, latitude, longitude, timezone);

        // Get Ascendant and MC degrees for SWOT aspect calculations
        double ascendantDegree = natalChartCalculator.getAscendantDegree(
                request.birthDate(), birthTime, latitude, longitude, timezone);
        double mcDegree = natalChartCalculator.getMcDegree(
                request.birthDate(), birthTime, latitude, longitude, timezone);

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

        ParsedChartData computedChartData = new ParsedChartData(planets, houses, aspects);
        NatalChart chart = buildNatalChartEntity(
                request,
                birthTime,
                latitude,
                longitude,
                utcOffset,
                sunSign,
                moonSign,
                risingSign,
                ascendantDegree,
                mcDegree,
                planetJson,
                houseJson,
                aspectsJson,
                normalizedLocale
        );

        NatalChart savedChart = natalChartRepository.save(chart);
        log.info("Saved natal chart with id: {} for user: {}", savedChart.getId(), request.userId());

        NatalChart preparedChart = ensureInterpretationRequested(savedChart, computedChartData, normalizedLocale);
        ensureLocaleVariant(List.of(preparedChart), preparedChart, computedChartData, otherLocale(normalizedLocale));

        return mapToResponse(preparedChart, planets, houses);
    }

    private void sendToAiOrchestrator(NatalChart chart, List<PlanetPosition> planets,
                                      List<HousePlacement> houses, List<PlanetaryAspect> aspects,
                                      String locale) {
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
                    transitSummary,
                    locale
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
        return mapToResponse(chart, null, null);
    }

    public List<NatalChartResponse> getNatalChartsByUserId(Long userId) {
        return natalChartRepository.findAllByUserId(userId != null ? userId.toString() : null)
                .stream()
                .map(c -> mapToResponse(c, null, null))
                .toList();
    }

    public NatalChartResponse getLatestNatalChartByUserId(Long userId, String locale) {
        String userKey = userId != null ? userId.toString() : null;
        List<NatalChart> charts = natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc(userKey);
        String normalizedLocale = normalizeStoredLocale(locale);
        java.util.Optional<NatalChart> chartCandidate = normalizedLocale != null
                ? resolveLatestChart(
                        charts.stream()
                                .filter(chart -> localeMatches(chart, normalizedLocale))
                                .toList()
                )
                : resolveLatestChart(charts);
        NatalChart chart = chartCandidate
                .orElseThrow(() -> new IllegalArgumentException("Natal chart not found for user: " + userId));
        if (normalizedLocale != null) {
            ParsedChartData chartData = parseChartData(chart, null, null, null);
            NatalChart preparedChart = ensureInterpretationRequested(chart, chartData, normalizedLocale);
            return mapToResponse(preparedChart, chartData.planets(), chartData.houses());
        }
        return mapToResponse(chart, null, null);
    }

    private NatalChart findReusableChart(List<NatalChart> matchingCharts, String locale) {
        return matchingCharts.stream()
                .filter(chart -> localeMatches(chart, locale))
                .findFirst()
                .orElse(null);
    }

    private java.util.Optional<NatalChart> resolveLatestChart(List<NatalChart> charts) {
        if (charts == null || charts.isEmpty()) {
            return java.util.Optional.empty();
        }

        NatalChart latest = charts.getFirst();
        if (!isStalePending(latest)) {
            return java.util.Optional.of(latest);
        }

        return charts.stream()
                .filter(chart -> hasUsableInterpretation(chart, normalizeStoredLocale(chart.getRequestedLocale())))
                .findFirst()
                .or(() -> java.util.Optional.of(latest));
    }

    private boolean isStalePending(NatalChart chart) {
        if (!"PENDING".equalsIgnoreCase(chart.getInterpretationStatus())) {
            return false;
        }

        if (chart.getCalculatedAt() == null) {
            return true;
        }

        return chart.getCalculatedAt().isBefore(LocalDateTime.now().minus(PENDING_REUSE_WINDOW));
    }

    private boolean sameBirthSignature(
            NatalChart chart,
            NatalChartRequest request,
            LocalTime birthTime,
            double latitude,
            double longitude,
            Double utcOffset
    ) {
        return Objects.equals(chart.getBirthDate(), request.birthDate())
                && Objects.equals(chart.getBirthTime(), birthTime)
                && nearlyEqual(chart.getLatitude(), latitude)
                && nearlyEqual(chart.getLongitude(), longitude)
                && nearlyEqual(chart.getUtcOffset(), utcOffset);
    }

    private boolean localeMatches(NatalChart chart, String requestedLocale) {
        String storedLocale = normalizeStoredLocale(chart.getRequestedLocale());
        if (storedLocale != null) {
            return storedLocale.equals(requestedLocale);
        }

        if (!hasUsableInterpretation(chart, requestedLocale)) {
            return false;
        }

        return requestedLocale.equals(inferInterpretationLocale(chart.getAiInterpretation()));
    }

    private String inferInterpretationLocale(String interpretation) {
        if (interpretation == null || interpretation.isBlank()) {
            return null;
        }

        String lower = interpretation.toLowerCase(Locale.ROOT);
        if (containsTurkishSignals(lower)) {
            return "tr";
        }

        if (containsEnglishSignals(lower)) {
            return "en";
        }

        return null;
    }

    private boolean containsTurkishSignals(String lower) {
        return lower.matches(".*[çğıöşü].*")
                || lower.matches(".*\\b(ve|ile|icin|için|dogum|doğum|harita|haritan|yorumu|yorum|yukselen|yükselen|burc|burcu|duygusal|gezegen|koruyucu|sezgileriniz|ruhunuz|gosterir|gösterir|gosteriyor|gösteriyor|yorumlanir|yorumlanır)\\b.*");
    }

    private boolean containsEnglishSignals(String lower) {
        return lower.matches(".*\\b(the|and|your|chart|sun|moon|rising|interpretation|relationship|planet|emotional|energy|house|placement|summary|daily life)\\b.*");
    }

    private List<NatalChart> findChartsByBirthSignature(
            NatalChartRequest request,
            LocalTime birthTime,
            double latitude,
            double longitude,
            Double utcOffset
    ) {
        if (request.userId() == null) {
            return List.of();
        }

        return natalChartRepository.findAllByUserIdOrderByCalculatedAtDescIdDesc(request.userId().toString())
                .stream()
                .filter(chart -> sameBirthSignature(chart, request, birthTime, latitude, longitude, utcOffset))
                .toList();
    }

    private NatalChart ensureInterpretationRequested(NatalChart chart, ParsedChartData chartData, String locale) {
        if (hasUsableInterpretation(chart, locale)) {
            return chart;
        }

        boolean missingInterpretation = chart.getAiInterpretation() == null || chart.getAiInterpretation().isBlank();
        boolean shouldRequest = "COMPLETED".equalsIgnoreCase(chart.getInterpretationStatus())
                || chart.getInterpretationStatus() == null
                || "FAILED".equalsIgnoreCase(chart.getInterpretationStatus())
                || isStalePending(chart)
                || (missingInterpretation && !"PENDING".equalsIgnoreCase(chart.getInterpretationStatus()))
                || looksBrokenInterpretation(chart.getAiInterpretation());

        if (!shouldRequest) {
            return chart;
        }

        chart.setRequestedLocale(locale);
        chart.setAiInterpretation(null);
        chart.setInterpretationStatus("PENDING");
        NatalChart savedChart = natalChartRepository.save(chart);
        sendToAiOrchestrator(savedChart, chartData.planets(), chartData.houses(), chartData.aspects(), locale);
        return savedChart;
    }

    private void ensureLocaleVariant(
            List<NatalChart> matchingCharts,
            NatalChart sourceChart,
            ParsedChartData chartData,
            String locale
    ) {
        NatalChart localeChart = findReusableChart(matchingCharts, locale);
        if (localeChart == null) {
            localeChart = natalChartRepository.save(cloneChartForLocale(sourceChart, locale));
            log.info(
                    "Created sibling natal chart {} from chart {} for locale {}",
                    localeChart.getId(),
                    sourceChart.getId(),
                    locale
            );
        }
        ensureInterpretationRequested(localeChart, chartData, locale);
    }

    private NatalChart cloneChartForLocale(NatalChart sourceChart, String locale) {
        return NatalChart.builder()
                .userId(sourceChart.getUserId())
                .name(sourceChart.getName())
                .birthDate(sourceChart.getBirthDate())
                .birthTime(sourceChart.getBirthTime())
                .birthLocation(sourceChart.getBirthLocation())
                .latitude(sourceChart.getLatitude())
                .longitude(sourceChart.getLongitude())
                .sunSign(sourceChart.getSunSign())
                .moonSign(sourceChart.getMoonSign())
                .risingSign(sourceChart.getRisingSign())
                .ascendantDegree(sourceChart.getAscendantDegree())
                .mcDegree(sourceChart.getMcDegree())
                .utcOffset(sourceChart.getUtcOffset())
                .planetPositionsJson(sourceChart.getPlanetPositionsJson())
                .housePlacementsJson(sourceChart.getHousePlacementsJson())
                .aspectsJson(sourceChart.getAspectsJson())
                .requestedLocale(locale)
                .build();
    }

    private NatalChart buildNatalChartEntity(
            NatalChartRequest request,
            LocalTime birthTime,
            double latitude,
            double longitude,
            Double utcOffset,
            String sunSign,
            String moonSign,
            String risingSign,
            double ascendantDegree,
            double mcDegree,
            String planetJson,
            String houseJson,
            String aspectsJson,
            String locale
    ) {
        return NatalChart.builder()
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
                .utcOffset(utcOffset)
                .planetPositionsJson(planetJson)
                .housePlacementsJson(houseJson)
                .aspectsJson(aspectsJson)
                .requestedLocale(locale)
                .build();
    }

    private boolean hasUsableInterpretation(NatalChart chart, String locale) {
        if (!"COMPLETED".equalsIgnoreCase(chart.getInterpretationStatus()) || chart.getAiInterpretation() == null || chart.getAiInterpretation().isBlank()) {
            return false;
        }
        if (looksBrokenInterpretation(chart.getAiInterpretation())) {
            return false;
        }
        if (locale == null) {
            return true;
        }
        String inferredLocale = inferInterpretationLocale(chart.getAiInterpretation());
        return locale.equals(inferredLocale);
    }

    private boolean looksBrokenInterpretation(String interpretation) {
        if (interpretation == null || interpretation.isBlank()) {
            return false;
        }
        String lower = interpretation.toLowerCase(Locale.ROOT);
        boolean hasFallbackMarkers = lower.contains("temel yorum korunarak başlıklara ayrıştırıldı")
                || lower.contains("yorum bu aşamada sadeleştirilmiş yapıda sunuldu")
                || lower.contains("yeniden üretimde daha zenginleşir");
        int payloadMarkers = 0;
        if (lower.contains("chartid")) payloadMarkers++;
        if (lower.contains("sunsign")) payloadMarkers++;
        if (lower.contains("moonsign")) payloadMarkers++;
        if (lower.contains("risingsign")) payloadMarkers++;
        if (lower.contains("absolutelongitude")) payloadMarkers++;
        if (lower.contains("planets. planet.")) payloadMarkers++;
        return hasFallbackMarkers || payloadMarkers >= 2;
    }

    private String otherLocale(String locale) {
        return "en".equals(locale) ? "tr" : "en";
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            return "tr";
        }
        return locale.toLowerCase(Locale.ROOT).startsWith("en") ? "en" : "tr";
    }

    private String normalizeStoredLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            return null;
        }
        return locale.toLowerCase(Locale.ROOT).startsWith("en") ? "en" : "tr";
    }

    private boolean nearlyEqual(Double left, Double right) {
        if (left == null || right == null) {
            return left == null && right == null;
        }
        return Math.abs(left - right) < 0.000001d;
    }

    public ZodiacSign calculateSunSignOnly(int month, int day) {
        return ZodiacSign.fromDate(month, day);
    }

    private NatalChartResponse mapToResponse(NatalChart chart, List<PlanetPosition> planets,
                                              List<HousePlacement> houses) {
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

        List<PlanetPosition> safePlanetList = planetList != null ? planetList : List.of();
        List<HousePlacement> safeHouseList = houseList != null ? houseList : List.of();
        List<NatalPlanetComboInsight> planetComboInsights = buildPlanetComboInsights(safePlanetList);
        List<NatalHouseComboInsight> houseComboInsights = buildHouseComboInsights(safeHouseList, safePlanetList);

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
                safePlanetList,
                safeHouseList,
                aspectList,
                planetComboInsights,
                houseComboInsights,
                chart.getAiInterpretation(),
                chart.getInterpretationStatus(),
                chart.getCalculatedAt()
        );
    }

    private ParsedChartData parseChartData(
            NatalChart chart,
            List<PlanetPosition> fallbackPlanets,
            List<HousePlacement> fallbackHouses,
            List<PlanetaryAspect> fallbackAspects
    ) {
        List<PlanetPosition> planets = fallbackPlanets != null ? fallbackPlanets : List.of();
        List<HousePlacement> houses = fallbackHouses != null ? fallbackHouses : List.of();
        List<PlanetaryAspect> aspects = fallbackAspects != null ? fallbackAspects : List.of();

        if ((fallbackPlanets == null || fallbackPlanets.isEmpty()) && chart.getPlanetPositionsJson() != null) {
            try {
                planets = objectMapper.readValue(
                        chart.getPlanetPositionsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class)
                );
            } catch (JsonProcessingException e) {
                planets = List.of();
            }
        }

        if ((fallbackHouses == null || fallbackHouses.isEmpty()) && chart.getHousePlacementsJson() != null) {
            try {
                houses = objectMapper.readValue(
                        chart.getHousePlacementsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, HousePlacement.class)
                );
            } catch (JsonProcessingException e) {
                houses = List.of();
            }
        }

        if ((fallbackAspects == null || fallbackAspects.isEmpty()) && chart.getAspectsJson() != null) {
            try {
                aspects = objectMapper.readValue(
                        chart.getAspectsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetaryAspect.class)
                );
            } catch (JsonProcessingException e) {
                aspects = List.of();
            }
        }

        return new ParsedChartData(planets, houses, aspects);
    }

    private List<NatalPlanetComboInsight> buildPlanetComboInsights(List<PlanetPosition> planets) {
        if (planets == null || planets.isEmpty()) {
            return List.of();
        }

        return planets.stream()
                .map(planet -> {
                    String planetName = planetNameTr(planet.planet());
                    String signName = signNameTr(planet.sign());
                    String signTone = signTonePhrase(planet.sign());
                    String signStyle = signDecisionStyle(planet.sign());
                    String houseTheme = houseThemeShort(planet.house());
                    String planetCore = planetCoreMeaning(planet.planet());
                    String tripleLabel = planetName + " + " + signName + " + " + planet.house() + ". Ev";

                    String summary = "Senin " + planetName + "'in " + signName + " burcunda ve " + planet.house()
                            + ". evde. Bu üçlü kombinasyon, " + houseTheme.toLowerCase()
                            + " alanında enerjini daha çok " + signStyle + " çalıştırdığını gösterir.";

                    String characterLine = tripleLabel + " kombinasyonu sende " + signTone
                            + " bir karakter ifadesi oluşturur. " + planetCore;

                    String effectLine = planetName + " yerleşimin " + houseTheme.toLowerCase()
                            + " başlıklarında kararlarını " + signStyle
                            + " şekillendirme eğilimi verir; bu yüzden davranışın çoğu zaman aynı temayı tekrar eder.";

                    String cautionLine = planet.retrograde()
                            ? planetName + " retro olduğu için bu konuda önce içine dönüp sonra hareket etme eğilimin artabilir. Kararı netleştirmeden hızlanmamaya çalış."
                            : "Bu yerleşimde aşırı yük bindiğinde " + houseTheme.toLowerCase()
                            + " alanında tek bakış açısına sıkışabilirsin. Esneklik ve geri bildirim denge sağlar.";

                    List<String> strengths = new ArrayList<>();
                    strengths.add(planetStrengthKeyword(planet.planet()));
                    strengths.add(signStrengthKeyword(planet.sign()));
                    strengths.add(houseStrengthKeyword(planet.house()));

                    return new NatalPlanetComboInsight(
                            planet.planet(),
                            planet.sign(),
                            planet.house(),
                            tripleLabel,
                            summary,
                            characterLine,
                            effectLine,
                            cautionLine,
                            strengths.stream().filter(this::hasText).distinct().toList()
                    );
                })
                .toList();
    }

    private List<NatalHouseComboInsight> buildHouseComboInsights(List<HousePlacement> houses, List<PlanetPosition> planets) {
        if (houses == null || houses.isEmpty()) {
            return List.of();
        }

        List<PlanetPosition> safePlanets = planets != null ? planets : List.of();

        return houses.stream()
                .sorted(Comparator.comparingInt(HousePlacement::houseNumber))
                .map(house -> {
                    String signName = signNameTr(house.sign());
                    String signTone = signTonePhrase(house.sign());
                    String signStyle = signDecisionStyle(house.sign());
                    String houseTheme = houseThemeShort(house.houseNumber());
                    List<PlanetPosition> housePlanets = safePlanets.stream()
                            .filter(p -> p.house() == house.houseNumber())
                            .toList();

                    String introLine = house.houseNumber() + ". Ev: " + houseTheme + ". Burası hayatında bu temaların nasıl çalıştığını anlatır.";
                    String characterLine = "Bu evin " + signName + " ile başlaması, " + houseTheme.toLowerCase()
                            + " alanında yaklaşımının " + signTone.toLowerCase() + " bir ton taşıdığını gösterir.";
                    String effectLine = houseTheme + " konusu günlük seçimlerini doğrudan etkiler; çoğu zaman " + signStyle
                            + " ilerleyerek güven ararsın.";
                    String cautionLine = houseCautionLine(house.houseNumber());
                    List<String> strengths = houseStrengthKeywords(house.houseNumber());
                    String comboSummary = buildHouseComboSummary(house, housePlanets, houseTheme);
                    List<String> residentPlanets = housePlanets.stream().map(PlanetPosition::planet).toList();

                    return new NatalHouseComboInsight(
                            house.houseNumber(),
                            house.sign(),
                            introLine,
                            characterLine,
                            effectLine,
                            cautionLine,
                            strengths,
                            comboSummary,
                            residentPlanets
                    );
                })
                .toList();
    }

    private String buildHouseComboSummary(HousePlacement house, List<PlanetPosition> housePlanets, String houseTheme) {
        if (housePlanets == null || housePlanets.isEmpty()) {
            return "Bu evde görünür gezegen yerleşimi az olabilir; yine de " + signNameTr(house.sign())
                    + " başlangıç tonu, " + houseTheme.toLowerCase() + " temasını nasıl yaşadığını belirler.";
        }

        return housePlanets.stream()
                .limit(3)
                .map(p -> planetNameTr(p.planet()) + " " + signNameTr(p.sign()) + " burcunda " + house.houseNumber()
                        + ". evde: " + houseTheme.toLowerCase() + " temasını " + signDecisionStyle(p.sign()) + " çalıştırır.")
                .reduce((a, b) -> a + " " + b)
                .orElse(houseTheme);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String planetNameTr(String planet) {
        if (planet == null) return "Gezegen";
        return switch (planet) {
            case "Sun" -> "Güneş";
            case "Moon" -> "Ay";
            case "Mercury" -> "Merkür";
            case "Venus" -> "Venüs";
            case "Mars" -> "Mars";
            case "Jupiter" -> "Jüpiter";
            case "Saturn" -> "Satürn";
            case "Uranus" -> "Uranüs";
            case "Neptune" -> "Neptün";
            case "Pluto" -> "Plüton";
            case "Chiron" -> "Chiron";
            case "NorthNode" -> "Kuzey Düğümü";
            default -> planet;
        };
    }

    private String signNameTr(String sign) {
        if (sign == null) return "Bilinmeyen";
        return switch (sign.toUpperCase()) {
            case "ARIES" -> "Koç";
            case "TAURUS" -> "Boğa";
            case "GEMINI" -> "İkizler";
            case "CANCER" -> "Yengeç";
            case "LEO" -> "Aslan";
            case "VIRGO" -> "Başak";
            case "LIBRA" -> "Terazi";
            case "SCORPIO" -> "Akrep";
            case "SAGITTARIUS" -> "Yay";
            case "CAPRICORN" -> "Oğlak";
            case "AQUARIUS" -> "Kova";
            case "PISCES" -> "Balık";
            default -> sign;
        };
    }

    private String signTonePhrase(String sign) {
        if (sign == null) return "dengeli ve gözlemci";
        return switch (sign.toUpperCase()) {
            case "ARIES" -> "hızlı, atak ve doğrudan";
            case "TAURUS" -> "sakin, dayanıklı ve güven odaklı";
            case "GEMINI" -> "meraklı, konuşkan ve değişken";
            case "CANCER" -> "koruyucu, sezgisel ve hassas";
            case "LEO" -> "yaratıcı, görünür ve sıcak";
            case "VIRGO" -> "analitik, düzenli ve fayda odaklı";
            case "LIBRA" -> "uyum arayan, diplomatik ve estetik";
            case "SCORPIO" -> "derin, kontrollü ve sezgisel";
            case "SAGITTARIUS" -> "anlam arayan, açık ve özgür";
            case "CAPRICORN" -> "planlı, sorumlu ve hedef odaklı";
            case "AQUARIUS" -> "özgün, mesafeli ve fikir odaklı";
            case "PISCES" -> "empatik, hayal gücü yüksek ve akışkan";
            default -> "kendine özgü";
        };
    }

    private String signDecisionStyle(String sign) {
        if (sign == null) return "içgüdüsel biçimde";
        return switch (sign.toUpperCase()) {
            case "ARIES" -> "hızlı ve doğrudan";
            case "TAURUS" -> "sabırlı ve güven arayan";
            case "GEMINI" -> "bilgi toplayarak ve konuşarak";
            case "CANCER" -> "duygusal güveni kontrol ederek";
            case "LEO" -> "kalbini ortaya koyarak";
            case "VIRGO" -> "detayları analiz ederek";
            case "LIBRA" -> "denge kurarak";
            case "SCORPIO" -> "derin gözlem yaparak";
            case "SAGITTARIUS" -> "anlam ve vizyon arayarak";
            case "CAPRICORN" -> "plan kurarak";
            case "AQUARIUS" -> "mesafe alıp objektif bakarak";
            case "PISCES" -> "sezgiyi dinleyerek";
            default -> "kendine göre";
        };
    }

    private String planetCoreMeaning(String planet) {
        if (planet == null) return "Bu yerleşim kişisel enerjinin önemli bir kanalını anlatır.";
        return switch (planet) {
            case "Sun" -> "Güneş yaşam kıvılcımını ve görünür olma tarzını anlatır.";
            case "Moon" -> "Ay duygusal güvenini ve iç ritmini gösterir.";
            case "Mercury" -> "Merkür düşünme, konuşma ve öğrenme biçimini yönetir.";
            case "Venus" -> "Venüs ilişki kurma, zevk alma ve değer verme biçimini anlatır.";
            case "Mars" -> "Mars hareket etme, mücadele etme ve sınır koyma enerjisini taşır.";
            case "Jupiter" -> "Jüpiter büyüme, anlam ve fırsat alanını genişletir.";
            case "Saturn" -> "Satürn sorumluluk, yapı ve sabır derslerini güçlendirir.";
            case "Uranus" -> "Uranüs özgürleşme ve farklı düşünme ihtiyacını tetikler.";
            case "Neptune" -> "Neptün sezgi, ilham ve idealizasyon alanını artırır.";
            case "Pluto" -> "Plüton dönüşüm, güç ve derinleşme temasını yoğunlaştırır.";
            case "Chiron" -> "Chiron hassasiyetin üzerinden gelişen şifa bilgisini işaret eder.";
            case "NorthNode" -> "Kuzey Düğümü gelişim yönünü ve öğrenme çağrını vurgular.";
            default -> "Bu yerleşim kişisel enerjinin önemli bir kanalını anlatır.";
        };
    }

    private String planetStrengthKeyword(String planet) {
        if (planet == null) return "Farkındalık";
        return switch (planet) {
            case "Sun" -> "öz ifade";
            case "Moon" -> "duygusal sezgi";
            case "Mercury" -> "analiz ve iletişim";
            case "Venus" -> "ilişki uyumu";
            case "Mars" -> "aksiyon alma";
            case "Jupiter" -> "vizyon ve genişleme";
            case "Saturn" -> "disiplin";
            case "Uranus" -> "yenilikçilik";
            case "Neptune" -> "yaratıcı sezgi";
            case "Pluto" -> "kriz dönüşümü";
            case "Chiron" -> "şifalandırıcı farkındalık";
            case "NorthNode" -> "gelişim cesareti";
            default -> "farkındalık";
        };
    }

    private String signStrengthKeyword(String sign) {
        if (sign == null) return "esneklik";
        return switch (sign.toUpperCase()) {
            case "ARIES" -> "inisiyatif";
            case "TAURUS" -> "istikrar";
            case "GEMINI" -> "iletişim çevikliği";
            case "CANCER" -> "duygusal koruma";
            case "LEO" -> "yaratıcı görünürlük";
            case "VIRGO" -> "düzen kurma";
            case "LIBRA" -> "denge ve diplomasi";
            case "SCORPIO" -> "derin odak";
            case "SAGITTARIUS" -> "vizyon";
            case "CAPRICORN" -> "strateji";
            case "AQUARIUS" -> "özgün bakış";
            case "PISCES" -> "empati";
            default -> "uyum";
        };
    }

    private String houseThemeShort(int houseNumber) {
        return switch (houseNumber) {
            case 1 -> "Kimlik, beden ve kendini ortaya koyuş";
            case 2 -> "Maddi kaynaklar ve öz değer";
            case 3 -> "İletişim, yakın çevre ve öğrenme";
            case 4 -> "Kökler, aile ve iç güven";
            case 5 -> "Yaratıcılık, aşk ve ifade";
            case 6 -> "Günlük düzen, çalışma ve bakım";
            case 7 -> "İlişkiler ve ortaklıklar";
            case 8 -> "Paylaşılan kaynaklar ve dönüşüm";
            case 9 -> "İnançlar, eğitim ve ufuk genişletme";
            case 10 -> "Kariyer, statü ve görünür hedefler";
            case 11 -> "Sosyal çevre, ekipler ve gelecek planları";
            case 12 -> "Bilinçdışı, kapanışlar ve içe dönüş";
            default -> houseNumber + ". ev teması";
        };
    }

    private String houseStrengthKeyword(int houseNumber) {
        return switch (houseNumber) {
            case 1 -> "öz güven inşası";
            case 2 -> "kaynak yönetimi";
            case 3 -> "bağlantı kurma";
            case 4 -> "aidiyet geliştirme";
            case 5 -> "yaratıcı akış";
            case 6 -> "ritim kurma";
            case 7 -> "ilişki dengesi";
            case 8 -> "kriz yönetimi";
            case 9 -> "anlam arayışı";
            case 10 -> "sorumluluk alma";
            case 11 -> "network kurma";
            case 12 -> "iç gözlem";
            default -> "denge kurma";
        };
    }

    private List<String> houseStrengthKeywords(int houseNumber) {
        List<String> items = new ArrayList<>();
        items.add(houseStrengthKeyword(houseNumber));
        items.add(switch (houseNumber) {
            case 2, 8 -> "değer farkındalığı";
            case 3, 9 -> "öğrenme kapasitesi";
            case 4, 10 -> "temel ve hedef dengesi";
            case 5, 11 -> "yaratıcı sosyal ifade";
            case 6, 12 -> "ritim ve dinlenme dengesi";
            case 1, 7 -> "ben-sen dengesi";
            default -> "farkındalık";
        });
        items.add("esnek yorumlama");
        return items;
    }

    private String houseCautionLine(int houseNumber) {
        return switch (houseNumber) {
            case 2 -> "Öz değerini sadece maddi sonuçlara bağlamamaya dikkat et.";
            case 6 -> "Verimlilik ararken bedenini ve dinlenme ihtiyacını ihmal etmemeye çalış.";
            case 7 -> "Uyum ararken kendi sınırlarını geri plana itmemek ilişkiyi daha sağlıklı yapar.";
            case 8 -> "Kontrol ihtiyacı yükseldiğinde güveni adım adım kurmak daha kalıcı sonuç verir.";
            case 10 -> "Başarı baskısı arttığında iç ritmini ve özel hayatını tamamen ikinci plana atma.";
            case 12 -> "İçe çekilme ihtiyacı uzadığında destek istemek veya paylaşmak denge sağlar.";
            default -> "Bu ev temasında tek bir doğruya sıkışmak yerine ritmini gözlemlemek daha sağlıklıdır.";
        };
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
            List<String> currentTransitSummary,
            String locale
    ) {}

    private record ParsedChartData(
            List<PlanetPosition> planets,
            List<HousePlacement> houses,
            List<PlanetaryAspect> aspects
    ) {}
}
