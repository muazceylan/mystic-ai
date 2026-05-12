package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocationCatalogServiceTest {

    @Test
    void listsSeededCitiesForCountry() {
        LocationCatalogService service = new LocationCatalogService(new ObjectMapper());
        service.init();

        assertFalse(service.listCities("FR").isEmpty());
        assertTrue(service.listCities("FR").stream().anyMatch(city -> "Paris".equals(city.name())));
        assertTrue(service.listCities("TR").size() >= 81);
        assertTrue(service.listCities("TR").stream().anyMatch(city -> "İstanbul".equals(city.name())));
    }

    @Test
    void resolvesCoordinatesFromSeededLocation() {
        LocationCatalogService service = new LocationCatalogService(new ObjectMapper());
        service.init();

        LocationCatalogService.ResolvedLocation resolved = service.resolveCoordinates("Paris, France")
                .orElseThrow();

        assertEquals("FR", resolved.countryCode());
        assertEquals("Paris", resolved.cityName());
        assertEquals("Europe/Paris", resolved.timezone());
    }

    @Test
    void resolvesTurkishAsciiLocationFromSeed() {
        LocationCatalogService service = new LocationCatalogService(new ObjectMapper());
        service.init();

        LocationCatalogService.ResolvedLocation resolved = service.resolveCoordinates("Sanliurfa, Turkiye")
                .orElseThrow();

        assertEquals("TR", resolved.countryCode());
        assertEquals("Şanlıurfa", resolved.cityName());
        assertEquals("Europe/Istanbul", resolved.timezone());
    }
}
