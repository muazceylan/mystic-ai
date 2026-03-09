package com.mysticai.notification.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.cms.PrayerContent;
import com.mysticai.notification.repository.PrayerContentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

/**
 * Seeds prayer_content table from bundled JSON on first startup.
 * Runs only when the table is empty or has no seeded DUA/ESMA records.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SpiritualContentSeeder {

    private final PrayerContentRepository repository;
    private final ObjectMapper objectMapper;

    // --- Category mapping from JSON Turkish names to existing entity enum (9 values only) ---
    private static final Map<String, PrayerContent.Category> DUA_CATEGORY_MAP = Map.ofEntries(
            Map.entry("SABAH",    PrayerContent.Category.MORNING),
            Map.entry("AKSAM",    PrayerContent.Category.EVENING),
            Map.entry("GECE",     PrayerContent.Category.EVENING),   // night → evening
            Map.entry("ZİKİR",   PrayerContent.Category.GRATITUDE),  // dhikr → gratitude
            Map.entry("HUZUR",    PrayerContent.Category.GENERAL),    // peace → general
            Map.entry("KORUNMA",  PrayerContent.Category.PROTECTION),
            Map.entry("SALAVAT",  PrayerContent.Category.GRATITUDE),  // salawat → gratitude
            Map.entry("SURE",     PrayerContent.Category.GUIDANCE),   // sura → guidance
            Map.entry("İLİM",    PrayerContent.Category.GUIDANCE),   // knowledge → guidance
            Map.entry("ŞİFA",    PrayerContent.Category.HEALING),
            Map.entry("BEREKET",  PrayerContent.Category.ABUNDANCE)
    );

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        long count = repository.count();
        if (count > 0) {
            log.info("[Seeder] prayer_content already has {} records — skipping seed", count);
            return;
        }

        log.info("[Seeder] Seeding spiritual content (duas + esma)...");
        int duaCount = seedDuas();
        int esmaCount = seedEsma();
        log.info("[Seeder] Seeded {} duas and {} esma records", duaCount, esmaCount);
    }

    private int seedDuas() {
        List<DuaJson> duas = loadJson("dua.tr.json", new TypeReference<>() {});
        if (duas == null) return 0;
        int saved = 0;
        for (DuaJson d : duas) {
            try {
                PrayerContent.Category cat = DUA_CATEGORY_MAP.getOrDefault(
                        d.category != null ? d.category.toUpperCase() : "", PrayerContent.Category.GENERAL);
                PrayerContent.ContentType type = "SURE".equalsIgnoreCase(d.category)
                        ? PrayerContent.ContentType.SURE
                        : PrayerContent.ContentType.DUA;
                repository.save(PrayerContent.builder()
                        .title(d.title)
                        .arabicText(d.arabic)
                        .transliteration(d.transliteration)
                        .meaning(d.meaningTr)
                        .tags(d.tags != null ? String.join(",", d.tags) : null)
                        .category(cat)
                        .contentType(type)
                        .locale("tr")
                        .status(PrayerContent.Status.PUBLISHED)
                        .suggestedCount(d.defaultTargetCount)
                        .isFeatured(false)
                        .isPremium(false)
                        .isActive(true)
                        .build());
                saved++;
            } catch (Exception ex) {
                log.warn("[Seeder] Failed to seed dua '{}': {}", d.title, ex.getMessage());
            }
        }
        return saved;
    }

    private int seedEsma() {
        List<EsmaJson> esmas = loadJson("esma.tr.json", new TypeReference<>() {});
        if (esmas == null) return 0;
        int saved = 0;
        for (EsmaJson e : esmas) {
            try {
                repository.save(PrayerContent.builder()
                        .title(e.nameTr != null ? e.nameTr : e.transliteration)
                        .arabicText(e.nameAr)
                        .transliteration(e.transliteration)
                        .meaning(e.meaningTr)
                        .tags(e.tags != null ? String.join(",", e.tags) : null)
                        .category(PrayerContent.Category.GENERAL)
                        .contentType(PrayerContent.ContentType.ESMA)
                        .locale("tr")
                        .status(PrayerContent.Status.PUBLISHED)
                        .suggestedCount(e.defaultTargetCount)
                        .isFeatured(false)
                        .isPremium(false)
                        .isActive(true)
                        .build());
                saved++;
            } catch (Exception ex) {
                log.warn("[Seeder] Failed to seed esma '{}': {}", e.nameTr, ex.getMessage());
            }
        }
        return saved;
    }

    private <T> T loadJson(String filename, TypeReference<T> type) {
        try {
            ClassPathResource res = new ClassPathResource(filename);
            try (InputStream is = res.getInputStream()) {
                return objectMapper.readValue(is, type);
            }
        } catch (Exception e) {
            log.error("[Seeder] Failed to load {}: {}", filename, e.getMessage());
            return null;
        }
    }

    // ----- JSON DTOs -----

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DuaJson(
            String title,
            String category,
            String arabic,
            String transliteration,
            String meaningTr,
            Integer defaultTargetCount,
            List<String> tags
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EsmaJson(
            String nameAr,
            String nameTr,
            String transliteration,
            String meaningTr,
            Integer defaultTargetCount,
            List<String> tags
    ) {}
}
