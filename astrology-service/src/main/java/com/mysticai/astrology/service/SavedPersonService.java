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
import java.util.List;

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

        // Resolve coordinates
        double lat, lon;
        if (req.latitude() != null && req.longitude() != null) {
            lat = req.latitude();
            lon = req.longitude();
        } else {
            double[] coords = calculator.parseLocation(req.birthLocation());
            lat = coords[0];
            lon = coords[1];
        }

        // High-precision chart calculation
        List<PlanetPosition> planets = calculator.calculatePlanetPositions(req.birthDate(), birthTime, lat, lon);
        List<HousePlacement> houses  = calculator.calculateHouses(req.birthDate(), birthTime, lat, lon);
        List<PlanetaryAspect> aspects = calculator.calculateAspects(planets);

        String sunSign    = calculator.calculateSunSign(req.birthDate());
        String moonSign   = calculator.calculateMoonSign(req.birthDate());
        String risingSign = calculator.calculateAscendant(req.birthDate(), birthTime, lat, lon);
        double ascDeg     = calculator.getAscendantDegree(req.birthDate(), birthTime, lat, lon);
        double mcDeg      = calculator.getMcDegree(req.birthDate(), birthTime, lat, lon);

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
                .relationshipCategory(req.relationshipCategory())
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
        return mapToResponse(saved, planets);
    }

    @Transactional
    public SavedPersonResponse updatePerson(Long personId, SavedPersonRequest req) {
        SavedPerson person = savedPersonRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Saved person not found: " + personId));

        if (!person.getUserId().equals(req.userId())) {
            throw new IllegalArgumentException("Access denied");
        }

        person.setName(req.name());
        person.setRelationshipCategory(req.relationshipCategory());

        // Recalculate if birth data changed
        boolean birthChanged = !person.getBirthDate().equals(req.birthDate())
                || (req.birthTime() != null && !person.getBirthTime().equals(req.birthTime()))
                || !person.getBirthLocation().equals(req.birthLocation());

        if (birthChanged) {
            LocalTime birthTime = req.birthTime() != null ? req.birthTime() : LocalTime.NOON;
            double[] coords = calculator.parseLocation(req.birthLocation());

            List<PlanetPosition> planets  = calculator.calculatePlanetPositions(req.birthDate(), birthTime, coords[0], coords[1]);
            List<HousePlacement> houses   = calculator.calculateHouses(req.birthDate(), birthTime, coords[0], coords[1]);
            List<PlanetaryAspect> aspects = calculator.calculateAspects(planets);

            try {
                person.setPlanetPositionsJson(objectMapper.writeValueAsString(planets));
                person.setHousePlacementsJson(objectMapper.writeValueAsString(houses));
                person.setAspectsJson(objectMapper.writeValueAsString(aspects));
            } catch (JsonProcessingException e) {
                log.error("Recalculation serialization error", e);
            }

            person.setBirthDate(req.birthDate());
            person.setBirthTime(req.birthTime() != null ? req.birthTime() : LocalTime.NOON);
            person.setBirthLocation(req.birthLocation());
            person.setLatitude(coords[0]);
            person.setLongitude(coords[1]);
            person.setSunSign(calculator.calculateSunSign(req.birthDate()));
            person.setMoonSign(calculator.calculateMoonSign(req.birthDate()));
            person.setRisingSign(calculator.calculateAscendant(req.birthDate(), birthTime, coords[0], coords[1]));
        }

        return mapToResponse(savedPersonRepository.save(person), null);
    }

    public SavedPersonResponse getById(Long personId) {
        SavedPerson p = savedPersonRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Saved person not found: " + personId));
        return mapToResponse(p, null);
    }

    public List<SavedPersonResponse> getByUser(Long userId) {
        return savedPersonRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(p -> mapToResponse(p, null))
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

    private SavedPersonResponse mapToResponse(SavedPerson p, List<PlanetPosition> preloaded) {
        List<PlanetPosition> planets = preloaded;
        if (planets == null && p.getPlanetPositionsJson() != null) {
            try {
                planets = objectMapper.readValue(p.getPlanetPositionsJson(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class));
            } catch (JsonProcessingException e) {
                planets = List.of();
            }
        }
        return new SavedPersonResponse(
                p.getId(), p.getUserId(), p.getName(),
                p.getBirthDate(),
                p.getBirthTime() != null ? p.getBirthTime().toString() : null,
                p.getBirthLocation(), p.getLatitude(), p.getLongitude(),
                p.getRelationshipCategory(),
                p.getSunSign(), p.getMoonSign(), p.getRisingSign(),
                planets != null ? planets : List.of(),
                p.getCreatedAt()
        );
    }
}
