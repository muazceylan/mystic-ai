package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class NameSourceScraperRegistry {

    private final Map<SourceName, NameSourceScraper> scrapers = new EnumMap<>(SourceName.class);

    public NameSourceScraperRegistry(List<NameSourceScraper> scraperList) {
        for (NameSourceScraper scraper : scraperList) {
            scrapers.put(scraper.sourceName(), scraper);
        }
    }

    public NameSourceScraper getRequired(SourceName sourceName) {
        NameSourceScraper scraper = scrapers.get(sourceName);
        if (scraper == null) {
            throw new IllegalArgumentException("No scraper registered for source: " + sourceName);
        }
        return scraper;
    }

    public List<NameSourceScraper> all() {
        return List.copyOf(scrapers.values());
    }
}
