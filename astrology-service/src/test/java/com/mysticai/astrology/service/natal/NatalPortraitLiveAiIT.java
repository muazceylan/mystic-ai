package com.mysticai.astrology.service.natal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.NatalPortraitCache;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.NatalPortraitCacheRepository;
import com.mysticai.astrology.service.NatalChartCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Drives the real natal pipeline against a running ai-orchestrator.
 *
 * <p>Everything except the two repositories is the production object graph: the real normalizer,
 * the real HTTP client, the real orchestrator (and therefore the real provider chain), the real
 * sanitizer, the real merge and the real validator. That is the point — the unit tests already
 * prove the pieces behave when handed canned JSON; this proves a live model can actually satisfy
 * the contract on charts it has never seen.</p>
 *
 * <p>Opt-in, because it costs provider tokens and needs a service on :8084:</p>
 *
 * <pre>mvn -pl astrology-service test -Dtest=NatalPortraitLiveAiIT -Dnatal.live=true</pre>
 *
 * <p>Generated portraits are written to {@code target/natal-live/} so the prose can be read and
 * audited rather than only assertion-checked.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@EnabledIfSystemProperty(named = "natal.live", matches = "true")
class NatalPortraitLiveAiIT {

    private static final String ORCHESTRATOR_URL =
            System.getProperty("natal.live.url", "http://localhost:8084");
    private static final String INTERNAL_KEY = System.getProperty(
            "natal.live.key", "local-dev-internal-gateway-key-change-me");
    private static final Path OUT = Path.of("target", "natal-live");

    @Mock private NatalChartRepository natalChartRepository;
    @Mock private NatalPortraitCacheRepository portraitRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ---------------------------------------------------------------- scenarios

    /** A chart scenario, named for what it is meant to stress in the interpreter. */
    private record Scenario(
            String id,
            String description,
            LocalTime birthTime,
            String risingSign,
            Double ascendantDegree,
            List<PlanetPosition> planets,
            List<HousePlacement> houses,
            List<PlanetaryAspect> aspects
    ) {}

    private static List<Scenario> scenarios() {
        return List.of(
                new Scenario("01-stellium-tight-hard-aspect",
                        "Pisces Sun 8th, Virgo Moon 1st, Leo rising; 3 planets in house 6, "
                                + "2 in house 8; Sun square Node at 0.13 orb; Moon trine Venus",
                        LocalTime.of(8, 30), "Leo", 16.0,
                        NatalChartTestFixtures.richChartPlanets(),
                        NatalChartTestFixtures.leoRisingHouses(),
                        NatalChartTestFixtures.richAspects()),

                new Scenario("02-sparse-aspects",
                        "Same placements but only two aspects — nothing for the interpreter to lean on",
                        LocalTime.of(8, 30), "Leo", 16.0,
                        NatalChartTestFixtures.richChartPlanets(),
                        NatalChartTestFixtures.leoRisingHouses(),
                        NatalChartTestFixtures.sparseAspects()),

                new Scenario("03-intercepted-signs",
                        "Unequal cusps leaving Aquarius and Leo intercepted; planets sit in signs "
                                + "that rule no house cusp",
                        LocalTime.of(4, 10), "Capricorn", 5.0,
                        NatalChartTestFixtures.interceptedChartPlanets(),
                        NatalChartTestFixtures.interceptedHouses(),
                        interceptedAspects()),

                new Scenario("04-element-imbalance-no-water",
                        "Seven of ten bodies in fire, zero in water — a missing element is the "
                                + "loudest fact in the chart",
                        LocalTime.of(14, 45), "Sagittarius", 22.0,
                        fireHeavyPlanets(), sagittariusRisingHouses(), fireHeavyAspects()),

                new Scenario("05-cusp-resident-contrast",
                        "Leo 1st-house cusp holding a Virgo Moon — the synthesis the redesign brief "
                                + "calls out by name",
                        LocalTime.of(8, 30), "Leo", 16.0,
                        contrastPlanets(), NatalChartTestFixtures.leoRisingHouses(),
                        contrastAspects()),

                new Scenario("06-unknown-birth-time",
                        "No birth time: houses and rising are untrustworthy and must not be quoted",
                        null, null, null,
                        timeUnknownPlanets(), List.of(), NatalChartTestFixtures.richAspects())
        );
    }

    // ---------------------------------------------------------------- the run

    @Test
    @DisplayName("live provider produces contract-valid Turkish portraits for materially different charts")
    void turkishGenerations() throws Exception {
        runLocale("tr", scenarios());
    }

    @Test
    @DisplayName("live provider produces contract-valid English portraits")
    void englishGenerations() throws Exception {
        runLocale("en", scenarios().subList(0, 2));
    }

    private void runLocale(String locale, List<Scenario> chartScenarios) throws Exception {
        Files.createDirectories(OUT);
        NatalPortraitValidator validator = new NatalPortraitValidator();
        List<String> failures = new ArrayList<>();
        Map<String, String> sources = new LinkedHashMap<>();

        for (Scenario scenario : chartScenarios) {
            AtomicReference<NatalPortraitCache> saved = new AtomicReference<>();
            NatalPortraitService service = serviceFor(scenario, saved);

            NormalizedNatalChart chart = service.getNormalizedChart("42", locale);
            NatalPortraitService.PortraitResult result = service.getPortrait("42", locale, false);
            NatalPortrait portrait = result.portrait();

            String tag = scenario.id() + "-" + locale;
            Files.writeString(OUT.resolve(tag + ".json"),
                    objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(portrait));
            Files.writeString(OUT.resolve(tag + "-chart.json"),
                    objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(chart));
            sources.put(tag, portrait.source());

            // The portrait the user would see must satisfy the same guard in the live path.
            NatalPortraitValidator.Result verdict = validator.validate(portrait, chart);
            if (!verdict.valid()) {
                failures.add(tag + " -> " + verdict.correctionSummary());
            }

            assertFalse(result.fromCache(), tag + ": first call must not be a cache hit");
            assertNotNull(saved.get(), tag + ": portrait was not persisted");
            assertEquals("READY", saved.get().getStatus(), tag + ": persisted with non-READY status");

            // Every planet and every house must carry a reading, whoever wrote it.
            assertEquals(chart.planets().size(), portrait.planetReadings().size(),
                    tag + ": planet readings do not cover every calculated planet");
            assertEquals(chart.houses().size(), portrait.houseReadings().size(),
                    tag + ": house readings do not cover every calculated house");

            // Second read must be served from the persisted row without touching the provider.
            when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                    any(), any(), any(), any()))
                    .thenReturn(Optional.of(saved.get()));
            NatalPortraitService.PortraitResult second = service.getPortrait("42", locale, false);
            assertTrue(second.fromCache(), tag + ": second call did not hit cache");
        }

        Files.writeString(OUT.resolve("sources-" + locale + ".txt"), sources.toString());
        assertTrue(failures.isEmpty(), "live generations rejected by validator: " + failures);
    }

    // ---------------------------------------------------------------- wiring

    private NatalPortraitService serviceFor(Scenario scenario, AtomicReference<NatalPortraitCache> saved) {
        NatalChartNormalizer normalizer = new NatalChartNormalizer(new NatalChartCalculator(null));
        NatalPortraitService service = new NatalPortraitService(
                natalChartRepository,
                portraitRepository,
                normalizer,
                new NatalPortraitAiClient(ORCHESTRATOR_URL, INTERNAL_KEY),
                new NatalPortraitValidator(),
                new NatalPortraitSanitizer(),
                new NatalPortraitFallbackComposer(new NatalVocabulary()),
                objectMapper);

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(storedChart(scenario)));
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(portraitRepository.save(any(NatalPortraitCache.class))).thenAnswer(inv -> {
            NatalPortraitCache row = inv.getArgument(0);
            saved.set(row);
            return row;
        });
        return service;
    }

    private NatalChart storedChart(Scenario scenario) {
        try {
            NatalChart chart = new NatalChart();
            chart.setId(7L);
            chart.setUserId("42");
            chart.setBirthDate(LocalDate.of(1990, 3, 7));
            chart.setBirthTime(scenario.birthTime());
            chart.setBirthLocation("Istanbul, Turkey");
            chart.setLatitude(41.0082);
            chart.setLongitude(28.9784);
            chart.setRisingSign(scenario.risingSign());
            chart.setAscendantDegree(scenario.ascendantDegree());
            chart.setPlanetPositionsJson(objectMapper.writeValueAsString(scenario.planets()));
            chart.setHousePlacementsJson(objectMapper.writeValueAsString(scenario.houses()));
            chart.setAspectsJson(objectMapper.writeValueAsString(scenario.aspects()));
            return chart;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // ---------------------------------------------------------------- extra fixtures

    private static List<PlanetaryAspect> interceptedAspects() {
        return List.of(
                new PlanetaryAspect("Sun", "Mars", PlanetaryAspect.AspectType.OPPOSITION, 187.0, 7.0),
                new PlanetaryAspect("Moon", "Mercury", PlanetaryAspect.AspectType.OPPOSITION, 195.0, 15.0),
                new PlanetaryAspect("Venus", "Neptune", PlanetaryAspect.AspectType.CONJUNCTION, 8.0, 8.0),
                new PlanetaryAspect("Saturn", "Pluto", PlanetaryAspect.AspectType.SQUARE, 78.0, 12.0)
        );
    }

    /** Seven bodies in fire, none in water. */
    private static List<PlanetPosition> fireHeavyPlanets() {
        List<PlanetPosition> planets = new ArrayList<>();
        planets.add(planet("Sun", "Aries", 8.0, 5, 8.0, false));
        planets.add(planet("Moon", "Leo", 21.0, 9, 141.0, false));
        planets.add(planet("Mercury", "Aries", 2.0, 4, 2.0, false));
        planets.add(planet("Venus", "Sagittarius", 29.4, 12, 269.4, false));
        planets.add(planet("Mars", "Leo", 14.0, 9, 134.0, false));
        planets.add(planet("Jupiter", "Sagittarius", 5.0, 1, 245.0, false));
        planets.add(planet("Saturn", "Aquarius", 17.0, 3, 317.0, true));
        planets.add(planet("Uranus", "Aries", 25.0, 5, 25.0, false));
        planets.add(planet("Neptune", "Capricorn", 12.0, 2, 282.0, false));
        planets.add(planet("Pluto", "Taurus", 3.0, 6, 33.0, false));
        return planets;
    }

    private static List<HousePlacement> sagittariusRisingHouses() {
        String[] signs = {
                "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus",
                "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio"
        };
        String[] rulers = {
                "Jupiter", "Saturn", "Uranus", "Neptune", "Mars", "Venus",
                "Mercury", "Moon", "Sun", "Mercury", "Venus", "Pluto"
        };
        List<HousePlacement> houses = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            houses.add(new HousePlacement(i + 1, signs[i], 22.0, rulers[i]));
        }
        return houses;
    }

    private static List<PlanetaryAspect> fireHeavyAspects() {
        return List.of(
                new PlanetaryAspect("Sun", "Moon", PlanetaryAspect.AspectType.TRINE, 121.0, 1.0),
                new PlanetaryAspect("Sun", "Mars", PlanetaryAspect.AspectType.TRINE, 119.0, 1.0),
                new PlanetaryAspect("Moon", "Mars", PlanetaryAspect.AspectType.CONJUNCTION, 7.0, 7.0),
                new PlanetaryAspect("Mercury", "Saturn", PlanetaryAspect.AspectType.SEXTILE, 58.4, 1.6),
                new PlanetaryAspect("Venus", "Jupiter", PlanetaryAspect.AspectType.CONJUNCTION, 24.4, 5.6)
        );
    }

    /** Leo rising with a Virgo Moon in the 1st: cusp and resident pull in opposite directions. */
    private static List<PlanetPosition> contrastPlanets() {
        List<PlanetPosition> planets = new ArrayList<>();
        planets.add(planet("Sun", "Cancer", 3.0, 12, 93.0, false));
        planets.add(planet("Moon", "Virgo", 8.0, 1, 158.0, false));
        planets.add(planet("Mercury", "Leo", 27.0, 1, 147.0, false));
        planets.add(planet("Venus", "Gemini", 11.0, 11, 71.0, false));
        planets.add(planet("Mars", "Scorpio", 19.0, 4, 229.0, false));
        planets.add(planet("Jupiter", "Aquarius", 6.0, 7, 306.0, true));
        planets.add(planet("Saturn", "Taurus", 23.0, 10, 53.0, false));
        planets.add(planet("Uranus", "Sagittarius", 14.0, 5, 254.0, false));
        planets.add(planet("Neptune", "Capricorn", 20.0, 6, 290.0, false));
        planets.add(planet("Pluto", "Scorpio", 26.0, 4, 236.0, true));
        return planets;
    }

    private static List<PlanetaryAspect> contrastAspects() {
        return List.of(
                new PlanetaryAspect("Moon", "Mars", PlanetaryAspect.AspectType.TRINE, 118.6, 1.4),
                new PlanetaryAspect("Sun", "Saturn", PlanetaryAspect.AspectType.SEXTILE, 59.2, 0.8),
                new PlanetaryAspect("Mercury", "Jupiter", PlanetaryAspect.AspectType.OPPOSITION, 179.0, 1.0),
                new PlanetaryAspect("Venus", "Uranus", PlanetaryAspect.AspectType.OPPOSITION, 177.0, 3.0),
                new PlanetaryAspect("Moon", "Pluto", PlanetaryAspect.AspectType.TRINE, 122.0, 2.0)
        );
    }

    /**
     * Same bodies with house 0 — the sentinel the normalizer reads as "no trustworthy house",
     * which is what an unknown birth time actually produces upstream.
     */
    private static List<PlanetPosition> timeUnknownPlanets() {
        List<PlanetPosition> planets = new ArrayList<>();
        for (PlanetPosition p : NatalChartTestFixtures.richChartPlanets()) {
            planets.add(new PlanetPosition(p.planet(), p.sign(), p.degree(), p.minutes(),
                    p.seconds(), p.retrograde(), 0, p.absoluteLongitude()));
        }
        return planets;
    }

    private static PlanetPosition planet(
            String name, String sign, double degree, int house, double absolute, boolean retrograde) {
        int minutes = (int) ((degree - Math.floor(degree)) * 60);
        return new PlanetPosition(name, sign, degree, minutes, 0, retrograde, house, absolute);
    }
}
