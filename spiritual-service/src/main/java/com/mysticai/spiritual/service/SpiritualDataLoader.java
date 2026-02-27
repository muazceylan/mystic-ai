package com.mysticai.spiritual.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.spiritual.entity.AsmaulHusna;
import com.mysticai.spiritual.entity.MeditationExercise;
import com.mysticai.spiritual.entity.Prayer;
import com.mysticai.spiritual.repository.AsmaulHusnaRepository;
import com.mysticai.spiritual.repository.MeditationExerciseRepository;
import com.mysticai.spiritual.repository.PrayerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SpiritualDataLoader implements CommandLineRunner {

    private final AsmaulHusnaRepository asmaulHusnaRepository;
    private final PrayerRepository prayerRepository;
    private final MeditationExerciseRepository meditationExerciseRepository;
    private final ObjectMapper objectMapper;

    @Value("${spiritual.data.auto-load:true}")
    private boolean autoLoad;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!autoLoad) {
            log.info("Spiritual data auto-load is disabled");
            return;
        }

        log.info("Starting spiritual data import...");

        loadAsmaulHusna();
        loadPrayers();
        loadMeditationExercises();

        log.info("Spiritual data import completed");
    }

    private void loadAsmaulHusna() throws IOException {
        if (asmaulHusnaRepository.count() > 0) {
            log.info("AsmaulHusna data already exists, skipping import");
            return;
        }

        log.info("Loading AsmaulHusna data from JSON...");
        ClassPathResource resource = new ClassPathResource("data/esma.tr.json");
        List<Map<String, Object>> jsonData = objectMapper.readValue(
                resource.getInputStream(),
                new TypeReference<List<Map<String, Object>>>() {}
        );

        for (Map<String, Object> item : jsonData) {
            AsmaulHusna entity = AsmaulHusna.builder()
                    .orderNo(getInteger(item, "order"))
                    .arabicName(getString(item, "nameAr"))
                    .nameTr(getString(item, "nameTr"))
                    .transliterationTr(getString(item, "transliteration"))
                    .meaningTr(getString(item, "meaningTr"))
                    .reflectionTextTr(getString(item, "meaningTr"))
                    .shortBenefitTr(getString(item, "shortBenefit"))
                    .theme(extractFirstTag(item))
                    .tagsJson(serializeList(item, "tags"))
                    .recommendedDhikrCount(getInteger(item, "defaultTargetCount"))
                    .sourceProvider(extractSourceProvider(item))
                    .sourceNote(extractSourceNote(item))
                    .active(true)
                    .build();

          asmaulHusnaRepository.save(entity);
        }

        log.info("Loaded {} AsmaulHusna entries", jsonData.size());
    }

    private void loadPrayers() throws IOException {
        if (prayerRepository.count() > 0) {
            log.info("Prayer data already exists, skipping import");
            return;
        }

        log.info("Loading Prayer data from JSON...");
        ClassPathResource resource = new ClassPathResource("data/dua.tr.json");
        List<Map<String, Object>> jsonData = objectMapper.readValue(
                resource.getInputStream(),
                new TypeReference<List<Map<String, Object>>>() {}
        );

        for (Map<String, Object> item : jsonData) {
            String slug = "prayer-" + item.get("id");
            String category = getString(item, "category");
            if (category != null) {
                category = category.toUpperCase();
            }

            Map<String, Object> sourceInfo = extractSource(item);
            String provider = sourceInfo.get("provider") != null ? sourceInfo.get("provider").toString() : "Diyanet";
            String ref = sourceInfo.get("ref") != null ? sourceInfo.get("ref").toString() : "";
            String sourceNote = ref.isEmpty() ? null : ref;

            Map<String, Object> relatedAyahRef = getMap(item, "relatedAyahRef");
            String ayahRef = null;
            if (relatedAyahRef != null && relatedAyahRef.get("surah") != null) {
                ayahRef = relatedAyahRef.get("surah") + ":" + relatedAyahRef.get("ayah");
            }

            Prayer entity = Prayer.builder()
                    .slug(slug)
                    .title(getString(item, "title"))
                    .category(category)
                    .sourceLabel(provider)
                    .sourceNote(sourceNote)
                    .arabicText(getString(item, "arabic"))
                    .transliterationTr(getString(item, "transliteration"))
                    .meaningTr(getString(item, "meaningTr"))
                    .shortBenefitTr(getString(item, "shortBenefit"))
                    .tagsJson(serializeList(item, "tags"))
                    .relatedAyahRef(ayahRef)
                    .recommendedRepeatCount(getInteger(item, "defaultTargetCount"))
                    .estimatedReadSeconds(estimateReadTime(getString(item, "arabic")))
                    .isFavoritable(true)
                    .difficultyLevel(estimateDifficulty(category))
                    .active(true)
                    .build();

            prayerRepository.save(entity);
        }

        log.info("Loaded {} Prayer entries", jsonData.size());
    }

    private void loadMeditationExercises() throws IOException {
        if (meditationExerciseRepository.count() > 0) {
            log.info("MeditationExercise data already exists, skipping import");
            return;
        }

        log.info("Loading MeditationExercise data from JSON...");
        ClassPathResource resource = new ClassPathResource("data/breathing.tr.json");
        List<Map<String, Object>> jsonData = objectMapper.readValue(
                resource.getInputStream(),
                new TypeReference<List<Map<String, Object>>>() {}
        );

        for (Map<String, Object> item : jsonData) {
            String slug = getString(item, "id");
            String difficulty = getString(item, "difficulty");
            String type = "BREATHING";

            Map<String, Object> pattern = getMap(item, "pattern");
            String breathingPatternJson = null;
            if (pattern != null) {
                breathingPatternJson = objectMapper.writeValueAsString(pattern);
            }

            List<String> benefits = getList(item, "benefits");
            String benefitsJson = null;
            if (benefits != null && !benefits.isEmpty()) {
                benefitsJson = objectMapper.writeValueAsString(benefits);
            }

            MeditationExercise entity = MeditationExercise.builder()
                    .slug(slug)
                    .title(getString(item, "titleTr"))
                    .titleTr(getString(item, "titleTr"))
                    .description(getString(item, "description"))
                    .benefitsJson(benefitsJson)
                    .type(type)
                    .focusTheme("RELAXATION")
                    .difficulty(difficulty)
                    .icon(getString(item, "icon"))
                    .durationSec(getInteger(item, "defaultDurationSec"))
                    .stepsJson("[]")
                    .breathingPatternJson(breathingPatternJson)
                    .animationMode("CALM")
                    .backgroundAudioEnabledByDefault(false)
                    .active(true)
                    .build();

            meditationExerciseRepository.save(entity);
        }

        log.info("Loaded {} MeditationExercise entries", jsonData.size());
    }

    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    private Integer getInteger(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return value != null ? Integer.parseInt(value.toString()) : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof Map ? (Map<String, Object>) value : null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getList(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof List ? (List<String>) value : null;
    }

    private String serializeList(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof List) {
            try {
                return objectMapper.writeValueAsString(value);
            } catch (Exception e) {
                return value.toString();
            }
        }
        return value != null ? value.toString() : null;
    }

    @SuppressWarnings("unchecked")
    private String extractFirstTag(Map<String, Object> item) {
        List<String> tags = getList(item, "tags");
        return tags != null && !tags.isEmpty() ? tags.get(0) : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractSource(Map<String, Object> item) {
        Object value = item.get("sources");
        if (value instanceof List<?> list && !list.isEmpty()) {
            Object first = list.getFirst();
            if (first instanceof Map) {
                return (Map<String, Object>) first;
            }
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    private String extractSourceProvider(Map<String, Object> item) {
        Map<String, Object> source = extractSource(item);
        return source.get("provider") != null ? source.get("provider").toString() : "Diyanet";
    }

    @SuppressWarnings("unchecked")
    private String extractSourceNote(Map<String, Object> item) {
        Map<String, Object> source = extractSource(item);
        return source.get("licenseNote") != null ? source.get("licenseNote").toString() : null;
    }

    private int estimateReadTime(String arabicText) {
        if (arabicText == null || arabicText.isEmpty()) {
            return 10;
        }
        return Math.max(5, arabicText.length() / 5);
    }

    private int estimateDifficulty(String category) {
        if (category == null) return 1;
        return switch (category) {
            case "SURE", "ZIKIR" -> 1;
            case "SALAVAT", "SABAH", "AKSAM" -> 1;
            case "HUZUR", "KORUNMA", "BEREKET" -> 2;
            case "SIFA", "ILIM", "GECE" -> 2;
            case "TEVBE" -> 3;
            default -> 1;
        };
    }
}
