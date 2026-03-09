package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
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

class BebekIsmiScraperTest {

    @Test
    void parse_extractsExpectedFields() throws Exception {
        String html = Files.readString(Path.of("src/test/resources/fixtures/name-ingestion/bebekismi-detail-akaydin.html"));

        NameIngestionProperties properties = new NameIngestionProperties();
        ResilientHttpClient httpClient = new ResilientHttpClient(properties);
        RobotsTxtPolicyService robots = new RobotsTxtPolicyService(properties, httpClient);
        NameNormalizationService normalizationService = new NameNormalizationService();

        BebekIsmiScraper scraper = new BebekIsmiScraper(httpClient, robots, properties, normalizationService);

        RawNameSourceEntry rawEntry = RawNameSourceEntry.builder()
                .sourceName(SourceName.BEBEKISMI)
                .sourceUrl("https://bebekismi.com/isim/akaydin")
                .rawTitle("Akaydın İsminin Anlamı ve Özellikleri - Bebekismi.com")
                .rawHtml(html)
                .rawText("raw")
                .fetchedAt(LocalDateTime.now())
                .parseStatus(ParseStatus.FETCHED)
                .checksum("checksum")
                .build();

        ParsedNameCandidateDraft draft = scraper.parse(rawEntry).orElseThrow();

        assertEquals("Akaydın", draft.name());
        assertEquals(ParsedGender.MALE, draft.gender());
        assertTrue(draft.meaningShort().contains("Arapça"));
        assertTrue(draft.characterTraitsText().contains("Enerjik"));
        assertTrue(draft.letterAnalysisText().contains("A:"));
        assertEquals(SourceName.BEBEKISMI, draft.sourceName());
    }
}
