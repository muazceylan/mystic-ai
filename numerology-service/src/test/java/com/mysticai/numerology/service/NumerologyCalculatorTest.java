package com.mysticai.numerology.service;

import com.mysticai.numerology.dto.NumerologyResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NumerologyCalculatorTest {

    private final NumerologyCalculator calculator = new NumerologyCalculator();

    @Test
    void calculate_returnsStructuredResponseV2() {
        NumerologyResponse response = calculator.calculate(
                "Alice Johnson",
                "1990-05-15",
                "2026-03-08",
                "en",
                "day"
        );

        assertEquals("numerology_v2", response.version());
        assertNotNull(response.headline());
        assertEquals(4, response.coreNumbers().size());
        assertNotNull(response.timing());
        assertNotNull(response.profile());
        assertNotNull(response.combinedProfile());
        assertNotNull(response.miniGuidance());
        assertNotNull(response.shareCardPayload());
        assertNotNull(response.calculationMeta());
        assertNotNull(response.sectionLockState());
        assertFalse(response.summary().isBlank());
        assertNotNull(response.contentVersion());
        assertNotNull(response.calculationVersion());
        assertNotNull(response.locale());
        assertEquals(response.combinedProfile().dominantNumber(), response.shareCardPayload().mainNumber());
        assertTrue(response.sectionLockState().premiumSections().isEmpty());
        assertTrue(response.sectionLockState().previewSections().isEmpty());
        assertEquals(response.generatedAt(), response.shareCardPayload().generatedAt());
    }

    @Test
    void calculate_normalizesTurkishCharactersAndPreservesBirthdayMasterNumber() {
        NumerologyResponse response = calculator.calculate(
                "Çağrı Işık",
                "1992-06-11",
                "2026-03-08",
                "tr",
                "day"
        );

        int destinyNumber = response.coreNumbers().stream()
                .filter(item -> item.id().equals("destiny"))
                .findFirst()
                .orElseThrow()
                .value();

        int soulUrgeNumber = response.coreNumbers().stream()
                .filter(item -> item.id().equals("soulUrge"))
                .findFirst()
                .orElseThrow()
                .value();

        int birthdayNumber = response.coreNumbers().stream()
                .filter(item -> item.id().equals("birthday"))
                .findFirst()
                .orElseThrow()
                .value();

        assertTrue(destinyNumber > 0);
        assertTrue(soulUrgeNumber > 0);
        assertEquals(11, birthdayNumber);
    }

    @Test
    void calculate_updatesPersonalYearAcrossEffectiveDates() {
        NumerologyResponse response2026 = calculator.calculate(
                "Alice Johnson",
                "1990-05-15",
                "2026-03-08",
                "tr",
                "day"
        );

        NumerologyResponse response2027 = calculator.calculate(
                "Alice Johnson",
                "1990-05-15",
                "2027-03-08",
                "tr",
                "week"
        );

        assertNotEquals(response2026.timing().personalYear(), response2027.timing().personalYear());
        assertTrue(response2027.miniGuidance().validFor().contains("haft"));
    }
}
