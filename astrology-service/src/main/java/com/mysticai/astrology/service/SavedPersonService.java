package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.SavedPerson;
import com.mysticai.astrology.repository.SavedPersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.Locale;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class SavedPersonService {

    private final SavedPersonRepository savedPersonRepository;
    private final NatalChartCalculator calculator;
    private final ObjectMapper objectMapper;

    @Transactional
    public SavedPersonResponse addPerson(SavedPersonRequest req) {
        log.info("Adding saved person '{}' for userId={}", req.name(), req.userId());

        LocalTime birthTime = req.birthTime() != null ? req.birthTime() : LocalTime.NOON;
        String timezone = normalizeTimezone(req.timezone());

        // Resolve coordinates
        double[] coords = resolveCoordinates(req);
        double lat = coords[0];
        double lon = coords[1];

        // High-precision chart calculation
        List<PlanetPosition> planets = calculator.calculatePlanetPositions(req.birthDate(), birthTime, lat, lon, timezone);
        List<HousePlacement> houses  = calculator.calculateHouses(req.birthDate(), birthTime, lat, lon, timezone);
        List<PlanetaryAspect> aspects = calculator.calculateAspects(planets);

        String sunSign    = calculator.calculateSunSign(req.birthDate(), timezone);
        String moonSign   = calculator.calculateMoonSign(req.birthDate(), timezone);
        String risingSign = calculator.calculateAscendant(req.birthDate(), birthTime, lat, lon, timezone);
        double ascDeg     = calculator.getAscendantDegree(req.birthDate(), birthTime, lat, lon, timezone);
        double mcDeg      = calculator.getMcDegree(req.birthDate(), birthTime, lat, lon, timezone);

        String planetsJson, housesJson, aspectsJson;
        try {
            planetsJson  = objectMapper.writeValueAsString(planets);
            housesJson   = objectMapper.writeValueAsString(houses);
            aspectsJson  = objectMapper.writeValueAsString(aspects);
        } catch (JsonProcessingException e) {
            log.error("Serialization error for saved person", e);
            planetsJson = "[]"; housesJson = "[]"; aspectsJson = "[]";
        }

        SavedPerson person = SavedPerson.builder()
                .userId(req.userId())
                .name(req.name())
                .birthDate(req.birthDate())
                .birthTime(birthTime)
                .birthLocation(req.birthLocation())
                .latitude(lat)
                .longitude(lon)
                .timezone(timezone)
                .gender(normalizeGender(req.gender()))
                .relationshipCategory(normalizeRelationship(req))
                .sunSign(sunSign)
                .moonSign(moonSign)
                .risingSign(risingSign)
                .ascendantDegree(ascDeg)
                .mcDegree(mcDeg)
                .planetPositionsJson(planetsJson)
                .housePlacementsJson(housesJson)
                .aspectsJson(aspectsJson)
                .build();

        SavedPerson saved = savedPersonRepository.save(person);
        log.info("Saved person id={} for userId={}", saved.getId(), req.userId());
        return mapToResponse(saved, planets, houses, aspects);
    }

    @Transactional
    public SavedPersonResponse updatePerson(Long personId, SavedPersonRequest req) {
        SavedPerson person = savedPersonRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Saved person not found: " + personId));

        if (!person.getUserId().equals(req.userId())) {
            throw new IllegalArgumentException("Access denied");
        }

        person.setName(req.name());
        person.setGender(normalizeGender(req.gender()));
        person.setRelationshipCategory(normalizeRelationship(req));

        LocalTime birthTime = req.birthTime() != null ? req.birthTime() : LocalTime.NOON;
        String timezone = normalizeTimezone(req.timezone());
        double[] coords = resolveCoordinates(req);

        // Recalculate if birth data changed
        boolean birthChanged = !person.getBirthDate().equals(req.birthDate())
                || !Objects.equals(person.getBirthTime(), birthTime)
                || !Objects.equals(person.getBirthLocation(), req.birthLocation())
                || !Objects.equals(person.getLatitude(), coords[0])
                || !Objects.equals(person.getLongitude(), coords[1])
                || !Objects.equals(person.getTimezone(), timezone);

        if (birthChanged) {
            List<PlanetPosition> planets  = calculator.calculatePlanetPositions(req.birthDate(), birthTime, coords[0], coords[1], timezone);
            List<HousePlacement> houses   = calculator.calculateHouses(req.birthDate(), birthTime, coords[0], coords[1], timezone);
            List<PlanetaryAspect> aspects = calculator.calculateAspects(planets);

            try {
                person.setPlanetPositionsJson(objectMapper.writeValueAsString(planets));
                person.setHousePlacementsJson(objectMapper.writeValueAsString(houses));
                person.setAspectsJson(objectMapper.writeValueAsString(aspects));
            } catch (JsonProcessingException e) {
                log.error("Recalculation serialization error", e);
            }

            person.setBirthDate(req.birthDate());
            person.setBirthTime(birthTime);
            person.setBirthLocation(req.birthLocation());
            person.setLatitude(coords[0]);
            person.setLongitude(coords[1]);
            person.setTimezone(timezone);
            person.setSunSign(calculator.calculateSunSign(req.birthDate(), timezone));
            person.setMoonSign(calculator.calculateMoonSign(req.birthDate(), timezone));
            person.setRisingSign(calculator.calculateAscendant(req.birthDate(), birthTime, coords[0], coords[1], timezone));
            person.setAscendantDegree(calculator.getAscendantDegree(req.birthDate(), birthTime, coords[0], coords[1], timezone));
            person.setMcDegree(calculator.getMcDegree(req.birthDate(), birthTime, coords[0], coords[1], timezone));
        } else {
            person.setTimezone(timezone);
        }

        return mapToResponse(savedPersonRepository.save(person), null, null, null);
    }

    public SavedPersonResponse getById(Long personId) {
        SavedPerson p = savedPersonRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Saved person not found: " + personId));
        return mapToResponse(p, null, null, null);
    }

    public List<SavedPersonResponse> getByUser(Long userId) {
        return savedPersonRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(p -> mapToResponse(p, null, null, null))
                .toList();
    }

    @Transactional
    public void deletePerson(Long personId, Long userId) {
        SavedPerson p = savedPersonRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Saved person not found: " + personId));
        if (!p.getUserId().equals(userId)) throw new IllegalArgumentException("Access denied");
        savedPersonRepository.delete(p);
        log.info("Deleted saved person id={} for userId={}", personId, userId);
    }

    private SavedPersonResponse mapToResponse(
            SavedPerson p,
            List<PlanetPosition> preloadedPlanets,
            List<HousePlacement> preloadedHouses,
            List<PlanetaryAspect> preloadedAspects
    ) {
        List<PlanetPosition> planets = preloadedPlanets != null
                ? preloadedPlanets
                : readList(p.getPlanetPositionsJson(), PlanetPosition.class);
        List<HousePlacement> houses = preloadedHouses != null
                ? preloadedHouses
                : readList(p.getHousePlacementsJson(), HousePlacement.class);
        List<PlanetaryAspect> aspects = preloadedAspects != null
                ? preloadedAspects
                : readList(p.getAspectsJson(), PlanetaryAspect.class);
        return new SavedPersonResponse(
                p.getId(), p.getUserId(), p.getName(),
                p.getBirthDate(),
                p.getBirthTime() != null ? p.getBirthTime().toString() : null,
                p.getBirthLocation(), p.getLatitude(), p.getLongitude(),
                p.getTimezone(),
                p.getGender(),
                p.getRelationshipCategory(),
                p.getRelationshipCategory(),
                p.getSunSign(), p.getMoonSign(), p.getRisingSign(),
                planets != null ? planets : List.of(),
                houses != null ? houses : List.of(),
                aspects != null ? aspects : List.of(),
                p.getCreatedAt()
        );
    }

    private double[] resolveCoordinates(SavedPersonRequest req) {
        if (req.latitude() != null && req.longitude() != null) {
            return new double[]{req.latitude(), req.longitude()};
        }
        return calculator.parseLocation(req.birthLocation());
    }

    private String normalizeTimezone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return "Europe/Istanbul";
        }
        return timezone.trim();
    }

    private String normalizeRelationship(SavedPersonRequest req) {
        String raw = req.relationshipType() != null && !req.relationshipType().isBlank()
                ? req.relationshipType()
                : req.relationshipCategory();
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeGender(String gender) {
        if (gender == null || gender.isBlank()) {
            return null;
        }
        return gender.trim().toUpperCase(Locale.ROOT);
    }

    private <T> List<T> readList(String json, Class<T> itemType) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, itemType)
            );
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
