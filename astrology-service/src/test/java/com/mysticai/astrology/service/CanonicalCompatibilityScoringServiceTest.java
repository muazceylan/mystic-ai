package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.CrossAspect;
import com.mysticai.astrology.dto.SynastryModuleScore;
import com.mysticai.astrology.dto.SynastryScoreSnapshot;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CanonicalCompatibilityScoringServiceTest {

    private final CanonicalCompatibilityScoringService service = new CanonicalCompatibilityScoringService();

    @Test
    void shouldReachHighScoresForStrongSupportiveLovePatterns() {
        SynastryScoreSnapshot snapshot = service.buildSnapshot(
                sampleAspectsSupportiveDense(),
                CanonicalCompatibilityScoringService.PartySignal.empty(),
                CanonicalCompatibilityScoringService.PartySignal.empty()
        );

        SynastryModuleScore love = snapshot.moduleScores().get("LOVE");
        assertNotNull(love);
        assertNotNull(snapshot.baseHarmonyScore());
        assertTrue(snapshot.baseHarmonyScore() >= 86, "base score should reach the upper band for exact supportive clusters");
        assertTrue(love.overall() >= 90, "love module should cross 90 for classic high-synergy synastry signatures");
    }

    @Test
    void shouldReachLowScoresForStronglyChallengingPatterns() {
        SynastryScoreSnapshot snapshot = service.buildSnapshot(
                sampleAspectsChallenging(),
                CanonicalCompatibilityScoringService.PartySignal.empty(),
                CanonicalCompatibilityScoringService.PartySignal.empty()
        );

        SynastryModuleScore love = snapshot.moduleScores().get("LOVE");
        assertNotNull(love);
        assertTrue(snapshot.baseHarmonyScore() <= 34, "base score should drop deep into the low band for highly challenging aspect clusters");
        assertTrue(love.overall() <= 32, "love module should not stay mid-band when the signals are strongly difficult");
    }

    @Test
    void shouldDifferentiateLoveAndWorkModulesForMixedPairs() {
        SynastryScoreSnapshot snapshot = service.buildSnapshot(
                sampleAspectsLoveHighWorkLow(),
                CanonicalCompatibilityScoringService.PartySignal.empty(),
                CanonicalCompatibilityScoringService.PartySignal.empty()
        );

        int love = snapshot.moduleScores().get("LOVE").overall();
        int work = snapshot.moduleScores().get("WORK").overall();

        assertTrue(love >= 88, "romantic signatures should reach the high band when the chart pair is exceptionally resonant");
        assertTrue(work <= 62, "work score should remain notably lower when friction clusters concentrate in communication/execution");
        assertTrue(love - work >= 22, "module scores should clearly separate romantic and work compatibility");
    }

    private List<CrossAspect> sampleAspectsSupportiveDense() {
        return List.of(
                new CrossAspect("Venus", "Mars", "TRINE", "△", "Üçgen", 120.0, 0.8, true),
                new CrossAspect("Moon", "Venus", "SEXTILE", "✶", "Altmışlık", 60.0, 1.1, true),
                new CrossAspect("Sun", "Moon", "CONJUNCTION", "☌", "Kavuşum", 0.0, 0.7, true),
                new CrossAspect("Mercury", "Saturn", "TRINE", "△", "Üçgen", 120.0, 0.9, true),
                new CrossAspect("Mars", "Jupiter", "SEXTILE", "✶", "Altmışlık", 60.0, 1.2, true),
                new CrossAspect("Saturn", "Sun", "TRINE", "△", "Üçgen", 120.0, 1.0, true),
                new CrossAspect("Moon", "Jupiter", "SEXTILE", "✶", "Altmışlık", 60.0, 0.9, true),
                new CrossAspect("Venus", "Moon", "TRINE", "△", "Üçgen", 120.0, 1.3, true)
        );
    }

    private List<CrossAspect> sampleAspectsChallenging() {
        return List.of(
                new CrossAspect("Mars", "Saturn", "SQUARE", "□", "Kare", 90.0, 1.1, false),
                new CrossAspect("Moon", "Pluto", "OPPOSITION", "☍", "Karşıt", 180.0, 0.9, false),
                new CrossAspect("Mercury", "Mars", "SQUARE", "□", "Kare", 90.0, 1.3, false),
                new CrossAspect("Sun", "Saturn", "OPPOSITION", "☍", "Karşıt", 180.0, 1.0, false),
                new CrossAspect("Venus", "Uranus", "SQUARE", "□", "Kare", 90.0, 1.4, false)
        );
    }

    private List<CrossAspect> sampleAspectsLoveHighWorkLow() {
        return List.of(
                new CrossAspect("Venus", "Mars", "TRINE", "△", "Üçgen", 120.0, 0.4, true),
                new CrossAspect("Moon", "Venus", "TRINE", "△", "Üçgen", 120.0, 0.6, true),
                new CrossAspect("Sun", "Moon", "CONJUNCTION", "☌", "Kavuşum", 0.0, 0.5, true),
                new CrossAspect("Venus", "Venus", "CONJUNCTION", "☌", "Kavuşum", 0.0, 0.4, true),
                new CrossAspect("Moon", "Moon", "TRINE", "△", "Üçgen", 120.0, 0.5, true),
                new CrossAspect("Sun", "Venus", "SEXTILE", "✶", "Altmışlık", 60.0, 0.8, true),
                new CrossAspect("Venus", "Neptune", "SEXTILE", "✶", "Altmışlık", 60.0, 0.9, true),
                new CrossAspect("Moon", "Jupiter", "TRINE", "△", "Üçgen", 120.0, 1.0, true),
                new CrossAspect("Venus", "Jupiter", "TRINE", "△", "Üçgen", 120.0, 0.7, true),
                new CrossAspect("Mercury", "Mars", "SQUARE", "□", "Kare", 90.0, 0.6, false),
                new CrossAspect("Mercury", "Saturn", "OPPOSITION", "☍", "Karşıt", 180.0, 0.8, false),
                new CrossAspect("Sun", "Mercury", "SQUARE", "□", "Kare", 90.0, 1.0, false),
                new CrossAspect("Mars", "Saturn", "SQUARE", "□", "Kare", 90.0, 0.7, false),
                new CrossAspect("Mercury", "Pluto", "SQUARE", "□", "Kare", 90.0, 1.1, false)
        );
    }
}
