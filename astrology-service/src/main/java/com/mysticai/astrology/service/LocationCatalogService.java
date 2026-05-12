package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.LocationCityResponse;
import com.mysticai.astrology.dto.LocationCountryResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LocationCatalogService {

    private static final String CATALOG_RESOURCE = "seed/location-catalog.json";

    private final ObjectMapper objectMapper;

    private CatalogData catalogData;

    @PostConstruct
    void init() {
        this.catalogData = loadCatalog();
    }

    public List<LocationCountryResponse> listCountries() {
        return catalogData.countries();
    }

    public List<LocationCityResponse> listCities(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            return List.of();
        }
        return catalogData.citiesByCountry()
                .getOrDefault(countryCode.trim().toUpperCase(Locale.ROOT), List.of());
    }

    public Optional<ResolvedLocation> resolveCoordinates(String location) {
        if (location == null || location.isBlank()) {
            return Optional.empty();
        }

        List<String> parts = Arrays.stream(location.split(","))
                .map(LocationCatalogService::normalizeKey)
                .filter(part -> !part.isBlank())
                .toList();
        if (parts.isEmpty()) {
            return Optional.empty();
        }

        String countryCode = detectCountryCode(parts);
        String normalizedLocation = normalizeKey(location);

        IndexedCity exactInCountry = matchByExactPart(parts, countryCode);
        if (exactInCountry != null) {
            return Optional.of(exactInCountry.toResolvedLocation());
        }

        IndexedCity exactGlobal = matchByExactPart(parts, null);
        if (exactGlobal != null) {
            return Optional.of(exactGlobal.toResolvedLocation());
        }

        IndexedCity partialInCountry = matchByContains(normalizedLocation, countryCode);
        if (partialInCountry != null) {
            return Optional.of(partialInCountry.toResolvedLocation());
        }

        IndexedCity partialGlobal = matchByContains(normalizedLocation, null);
        if (partialGlobal != null) {
            return Optional.of(partialGlobal.toResolvedLocation());
        }

        return Optional.empty();
    }

    private String detectCountryCode(List<String> parts) {
        for (String part : parts) {
            String detected = catalogData.countryCodeByToken().get(part);
            if (detected != null) {
                return detected;
            }
        }
        return null;
    }

    private IndexedCity matchByExactPart(List<String> parts, String countryCode) {
        IndexedCity best = null;
        int bestScore = -1;
        for (IndexedCity city : catalogData.indexedCities()) {
            if (countryCode != null && !countryCode.equals(city.countryCode())) {
                continue;
            }
            for (String key : city.matchKeys()) {
                if (!parts.contains(key)) {
                    continue;
                }
                if (key.length() > bestScore) {
                    best = city;
                    bestScore = key.length();
                }
            }
        }
        return best;
    }

    private IndexedCity matchByContains(String normalizedLocation, String countryCode) {
        IndexedCity best = null;
        int bestScore = -1;
        for (IndexedCity city : catalogData.indexedCities()) {
            if (countryCode != null && !countryCode.equals(city.countryCode())) {
                continue;
            }
            for (String key : city.matchKeys()) {
                if (!normalizedLocation.contains(key)) {
                    continue;
                }
                if (key.length() > bestScore) {
                    best = city;
                    bestScore = key.length();
                }
            }
        }
        return best;
    }

    private CatalogData loadCatalog() {
        try (InputStream inputStream = new ClassPathResource(CATALOG_RESOURCE).getInputStream()) {
            CatalogSeed seed = objectMapper.readValue(inputStream, CatalogSeed.class);
            if (seed.countries() == null) {
                return new CatalogData(List.of(), Map.of(), List.of(), Map.of());
            }

            List<LocationCountryResponse> countries = new ArrayList<>();
            Map<String, List<LocationCityResponse>> citiesByCountry = new LinkedHashMap<>();
            List<IndexedCity> indexedCities = new ArrayList<>();
            Map<String, String> countryCodeByToken = new LinkedHashMap<>();

            for (CountrySeed country : seed.countries()) {
                if (country.code() == null || country.code().isBlank()) {
                    continue;
                }

                String code = country.code().trim().toUpperCase(Locale.ROOT);
                String name = country.name() == null || country.name().isBlank()
                        ? code
                        : country.name().trim();
                List<CitySeed> rawCities = country.cities() == null ? List.of() : country.cities();

                List<LocationCityResponse> cityResponses = rawCities.stream()
                        .filter(city -> city.name() != null && !city.name().isBlank())
                        .map(city -> new LocationCityResponse(
                                city.name().trim(),
                                city.timezone() == null || city.timezone().isBlank() ? null : city.timezone().trim(),
                                city.latitude(),
                                city.longitude()
                        ))
                        .sorted(Comparator.comparing(LocationCityResponse::name, String.CASE_INSENSITIVE_ORDER))
                        .toList();

                countries.add(new LocationCountryResponse(code, name, cityResponses.size()));
                citiesByCountry.put(code, cityResponses);
                countryCodeByToken.put(normalizeKey(code), code);
                countryCodeByToken.put(normalizeKey(name), code);

                for (CitySeed city : rawCities) {
                    if (city.name() == null || city.name().isBlank()) {
                        continue;
                    }
                    indexedCities.add(new IndexedCity(
                            code,
                            name,
                            city.name().trim(),
                            city.latitude(),
                            city.longitude(),
                            city.timezone(),
                            buildMatchKeys(city)
                    ));
                }
            }

            List<LocationCountryResponse> sortedCountries = countries.stream()
                    .sorted(Comparator.comparing(LocationCountryResponse::name, String.CASE_INSENSITIVE_ORDER))
                    .toList();

            return new CatalogData(
                    sortedCountries,
                    Map.copyOf(citiesByCountry),
                    List.copyOf(indexedCities),
                    Map.copyOf(countryCodeByToken)
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load location catalog seed: " + CATALOG_RESOURCE, exception);
        }
    }

    private Set<String> buildMatchKeys(CitySeed city) {
        LinkedHashSet<String> keys = new LinkedHashSet<>();
        addMatchKey(keys, city.name());
        if (city.aliases() != null) {
            city.aliases().forEach(alias -> addMatchKey(keys, alias));
        }
        return Set.copyOf(keys);
    }

    private void addMatchKey(Set<String> keys, String value) {
        String normalized = normalizeKey(value);
        if (!normalized.isBlank()) {
            keys.add(normalized);
        }
    }

    private static String normalizeKey(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim()
                .replace('ı', 'i')
                .replace('İ', 'i')
                .replace('ş', 's')
                .replace('Ş', 's')
                .replace('ğ', 'g')
                .replace('Ğ', 'g')
                .replace('ü', 'u')
                .replace('Ü', 'u')
                .replace('ö', 'o')
                .replace('Ö', 'o')
                .replace('ç', 'c')
                .replace('Ç', 'c');
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
        return normalized;
    }

    private record CatalogData(
            List<LocationCountryResponse> countries,
            Map<String, List<LocationCityResponse>> citiesByCountry,
            List<IndexedCity> indexedCities,
            Map<String, String> countryCodeByToken
    ) {
    }

    private record CatalogSeed(List<CountrySeed> countries) {
    }

    private record CountrySeed(
            String code,
            String name,
            List<CitySeed> cities
    ) {
    }

    private record CitySeed(
            String name,
            Double latitude,
            Double longitude,
            String timezone,
            List<String> aliases
    ) {
    }

    private record IndexedCity(
            String countryCode,
            String countryName,
            String cityName,
            Double latitude,
            Double longitude,
            String timezone,
            Set<String> matchKeys
    ) {
        private ResolvedLocation toResolvedLocation() {
            return new ResolvedLocation(countryCode, countryName, cityName, latitude, longitude, timezone);
        }
    }

    public record ResolvedLocation(
            String countryCode,
            String countryName,
            String cityName,
            Double latitude,
            Double longitude,
            String timezone
    ) {
    }
}
