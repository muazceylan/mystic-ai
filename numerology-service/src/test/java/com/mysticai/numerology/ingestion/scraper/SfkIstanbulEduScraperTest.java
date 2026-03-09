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

class SfkIstanbulEduScraperTest {

    @Test
    void parse_extractsExpectedFields() throws Exception {
        String html = Files.readString(Path.of("src/test/resources/fixtures/name-ingestion/sfk-detail-alya.html"));

        NameIngestionProperties properties = new NameIngestionProperties();
        ResilientHttpClient httpClient = new ResilientHttpClient(properties);
        RobotsTxtPolicyService robots = new RobotsTxtPolicyService(properties, httpClient);
        NameNormalizationService normalizationService = new NameNormalizationService();

        SfkIstanbulEduScraper scraper = new SfkIstanbulEduScraper(httpClient, robots, properties, normalizationService);

        RawNameSourceEntry rawEntry = RawNameSourceEntry.builder()
                .sourceName(SourceName.SFK_ISTANBUL_EDU)
                .sourceUrl("https://sfk.istanbul.edu.tr/alya-isminin-anlami-nedir-kokeni-ve-ozellikleri")
                .rawTitle("Alya İsminin Anlamı Nedir - Kökeni ve Özellikleri?")
                .rawHtml(html)
                .rawText("raw")
                .fetchedAt(LocalDateTime.now())
                .parseStatus(ParseStatus.FETCHED)
                .checksum("checksum")
                .build();

        ParsedNameCandidateDraft draft = scraper.parse(rawEntry).orElseThrow();

        assertEquals("Alya", draft.name());
        assertEquals(ParsedGender.FEMALE, draft.gender());
        assertTrue(draft.meaningShort().contains("Arapça"));
        assertEquals("Arapça", draft.origin());
        assertTrue(draft.characterTraitsText().contains("Özgüvenli"));
        assertTrue(draft.letterAnalysisText().contains("Liderlik"));
    }
}
