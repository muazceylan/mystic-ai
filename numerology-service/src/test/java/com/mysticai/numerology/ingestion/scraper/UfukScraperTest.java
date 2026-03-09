package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.NormalizedCandidateData;
import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.ParseStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.service.NameNormalizationService;
import com.mysticai.numerology.ingestion.service.ResilientHttpClient;
import com.mysticai.numerology.ingestion.service.RobotsTxtPolicyService;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UfukScraperTest {

    @Test
    void parse_extractsExpectedFields() throws Exception {
        String html = Files.readString(Path.of("src/test/resources/fixtures/name-ingestion/ufuk-detail-ahmet.html"));

        NameIngestionProperties properties = new NameIngestionProperties();
        ResilientHttpClient httpClient = new ResilientHttpClient(properties);
        RobotsTxtPolicyService robots = new RobotsTxtPolicyService(properties, httpClient);
        NameNormalizationService normalizationService = new NameNormalizationService();

        UfukScraper scraper = new UfukScraper(httpClient, robots, properties, normalizationService);

        RawNameSourceEntry rawEntry = RawNameSourceEntry.builder()
                .sourceName(SourceName.UFUK)
                .sourceUrl("https://sertifika.ufuk.edu.tr/ahmet-isminin-anlami-nedir-blog")
                .rawTitle("Ahmet İsminin Anlamı Nedir?")
                .rawHtml(html)
                .rawText("raw")
                .fetchedAt(LocalDateTime.now())
                .parseStatus(ParseStatus.FETCHED)
                .checksum("checksum")
                .build();

        ParsedNameCandidateDraft draft = scraper.parse(rawEntry).orElseThrow();

        assertEquals("Ahmet", draft.name());
        assertEquals(ParsedGender.MALE, draft.gender());
        assertEquals("Arapça", draft.origin());
        assertTrue(draft.meaningLong().contains("Kur'an"));
        assertTrue(draft.quranFlag());
    }

    @Test
    void normalize_cleansUfukMeaningLongPrefixes() {
        String html = """
                <html><head><title>Fuat İsminin Anlamı Nedir?</title></head>
                <body>
                  <main>
                    <h1>Fuat İsminin Anlamı Nedir?</h1>
                    <div class="prose">
                      <p>Fuat İsminin Anlamı Nedir?,Fuat, Arapça kökenli, anlamı "kalp" olan erkek ismidir.</p>
                    </div>
                  </main>
                </body></html>
                """;

        NameIngestionProperties properties = new NameIngestionProperties();
        ResilientHttpClient httpClient = new ResilientHttpClient(properties);
        RobotsTxtPolicyService robots = new RobotsTxtPolicyService(properties, httpClient);
        NameNormalizationService normalizationService = new NameNormalizationService();
        UfukScraper scraper = new UfukScraper(httpClient, robots, properties, normalizationService);

        RawNameSourceEntry rawEntry = RawNameSourceEntry.builder()
                .sourceName(SourceName.UFUK)
                .sourceUrl("https://sertifika.ufuk.edu.tr/fuat-isminin-anlami-nedir-blog")
                .rawTitle("Fuat İsminin Anlamı Nedir?")
                .rawHtml(html)
                .rawText("raw")
                .fetchedAt(LocalDateTime.now())
                .parseStatus(ParseStatus.FETCHED)
                .checksum("checksum-fuat")
                .build();

        ParsedNameCandidateDraft draft = scraper.parse(rawEntry).orElseThrow();
        NormalizedCandidateData normalized = normalizationService.normalize(draft, rawEntry.getRawTitle(), false);

        assertEquals("Fuat", draft.name());
        assertEquals("Arapça kökenli, anlamı \"kalp\" olan erkek ismidir.", normalized.meaningLong());
    }
}
