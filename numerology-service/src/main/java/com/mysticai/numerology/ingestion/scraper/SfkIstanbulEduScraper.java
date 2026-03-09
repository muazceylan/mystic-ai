package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.dto.RawFetchPayload;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.service.NameNormalizationService;
import com.mysticai.numerology.ingestion.service.ResilientHttpClient;
import com.mysticai.numerology.ingestion.service.RobotsTxtPolicyService;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class SfkIstanbulEduScraper extends AbstractNameSourceScraper {

    private static final String LIST_URL = "https://sfk.istanbul.edu.tr/isimler-ve-anlamlari";
    private static final Pattern DETAIL_PATTERN = Pattern.compile("https://sfk\\.istanbul\\.edu\\.tr/.+-isminin-anlami-nedir-kokeni-ve-ozellikleri$");

    private final NameNormalizationService normalizationService;

    public SfkIstanbulEduScraper(
            ResilientHttpClient httpClient,
            RobotsTxtPolicyService robotsTxtPolicyService,
            NameIngestionProperties properties,
            NameNormalizationService normalizationService
    ) {
        super(httpClient, robotsTxtPolicyService, properties);
        this.normalizationService = normalizationService;
    }

    @Override
    public SourceName sourceName() {
        return SourceName.SFK_ISTANBUL_EDU;
    }

    @Override
    public Set<String> discoverDetailUrls() {
        Set<String> detailUrls = new LinkedHashSet<>();
        if (!robotsTxtPolicyService.isAllowed(sourceName(), LIST_URL)) {
            return detailUrls;
        }

        ResilientHttpClient.HttpFetchResponse response = httpClient.fetch(
                sourceName(),
                LIST_URL,
                properties.settingsFor(sourceName()).getRateLimitMs()
        );
        if (!response.isSuccessful() || response.body() == null) {
            return detailUrls;
        }

        Document doc = Jsoup.parse(response.body(), LIST_URL);
        int maxDiscovery = properties.settingsFor(sourceName()).getMaxDiscoveryUrls();

        for (Element anchor : doc.select("a[href]")) {
            String href = anchor.attr("abs:href");
            if (DETAIL_PATTERN.matcher(href).matches()) {
                detailUrls.add(href);
                if (detailUrls.size() >= maxDiscovery) {
                    break;
                }
            }
        }

        return detailUrls;
    }

    @Override
    public RawFetchPayload fetchRawEntry(String url) {
        return fetchUrl(url, null);
    }

    @Override
    public Optional<ParsedNameCandidateDraft> parse(RawNameSourceEntry rawEntry) {
        if (rawEntry.getRawHtml() == null || rawEntry.getRawHtml().isBlank()) {
            return Optional.empty();
        }

        Document doc = Jsoup.parse(rawEntry.getRawHtml(), rawEntry.getSourceUrl());
        Element root = doc.selectFirst("main");
        if (root == null) {
            root = doc.body();
        }

        String name = extractName(firstNonBlank(doc, "h1", "title"));
        if (name == null) {
            return Optional.empty();
        }

        String meaningShort = firstNonBlank(root, ".mt-8 p", "p");
        if (meaningShort == null) {
            meaningShort = metaContent(doc, "meta[name=description]");
        }

        String origin = null;
        String originText = null;
        String character = null;
        String letter = null;

        Optional<Element> originHeading = findHeadingSection(root, "köken");
        if (originHeading.isPresent()) {
            originText = collectFollowingParagraphs(originHeading.get(), 1);
            origin = normalizationService.normalizeOrigin(originText, originText);
        }

        Optional<Element> characterHeading = findHeadingSection(root, "karakter");
        if (characterHeading.isPresent()) {
            character = collectFollowingParagraphs(characterHeading.get(), 2);
        }

        Optional<Element> letterHeading = findHeadingSection(root, "harf analiz");
        if (letterHeading.isPresent()) {
            letter = collectFollowingParagraphs(letterHeading.get(), 3);
            if (letter == null) {
                Element list = letterHeading.get().nextElementSibling();
                if (list != null && "ul".equalsIgnoreCase(list.tagName())) {
                    letter = normalizeWhitespace(list.text());
                }
            }
        }

        String meaningLong = joinNonBlank(meaningShort, character, letter);
        ParsedGender gender = normalizationService.inferGenderFromText(meaningLong, meaningShort, originText);

        Boolean quranFlag = null;
        String corpus = joinNonBlank(meaningShort, meaningLong).toLowerCase();
        if (corpus.contains("kur'an") || corpus.contains("kuran") || corpus.contains("islam")) {
            quranFlag = true;
        }

        return Optional.of(new ParsedNameCandidateDraft(
                name,
                gender,
                meaningShort,
                meaningLong,
                origin,
                character,
                letter,
                quranFlag,
                sourceName(),
                rawEntry.getSourceUrl(),
                0.08
        ));
    }

    private String extractName(String title) {
        String normalized = normalizeWhitespace(title);
        if (normalized == null) {
            return null;
        }
        String lower = normalized.toLowerCase(Locale.forLanguageTag("tr"));
        int idx = lower.indexOf(" isminin");
        if (idx > 0) {
            normalized = normalized.substring(0, idx).trim();
        }
        return normalizationService.cleanText(normalized);
    }

    private String joinNonBlank(String... values) {
        StringBuilder out = new StringBuilder();
        for (String value : values) {
            String normalized = normalizeWhitespace(value);
            if (normalized == null) {
                continue;
            }
            if (!out.isEmpty()) {
                out.append(' ');
            }
            out.append(normalized);
        }
        return out.toString();
    }
}
