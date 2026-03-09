package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.dto.RawFetchPayload;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.ParseStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.service.NameNormalizationService;
import com.mysticai.numerology.ingestion.service.ResilientHttpClient;
import com.mysticai.numerology.ingestion.service.RobotsTxtPolicyService;
import com.mysticai.numerology.ingestion.util.DigestUtil;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AlfabetikScraper extends AbstractNameSourceScraper {

    private static final String LIST_URL = "https://alfabetik.net.tr/isimler/isim-anlamlari.html";
    private static final Pattern NAME_PATTERN = Pattern.compile("^(.+?)\\s*\\(([^)]+)\\)\\s*:", Pattern.UNICODE_CASE);

    private final NameNormalizationService normalizationService;

    private final Map<String, EntrySnippet> snippetCache = new ConcurrentHashMap<>();

    public AlfabetikScraper(
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
        return SourceName.ALFABETIK;
    }

    @Override
    public Set<String> discoverDetailUrls() {
        Set<String> urls = new LinkedHashSet<>();

        if (!robotsTxtPolicyService.isAllowed(sourceName(), LIST_URL)) {
            return urls;
        }

        ResilientHttpClient.HttpFetchResponse response = httpClient.fetch(
                sourceName(),
                LIST_URL,
                properties.settingsFor(sourceName()).getRateLimitMs()
        );

        if (!response.isSuccessful() || response.body() == null) {
            return urls;
        }

        Document doc = Jsoup.parse(response.body(), LIST_URL);
        int maxDiscovery = properties.settingsFor(sourceName()).getMaxDiscoveryUrls();

        int index = 0;
        for (Element li : doc.select("article li, .entry-content li, li")) {
            String liText = normalizeWhitespace(li.text());
            if (liText == null || !liText.contains(":")) {
                continue;
            }

            String name = parseName(liText);
            if (name == null || name.isBlank()) {
                continue;
            }

            String syntheticUrl = LIST_URL + "#entry-" + (++index) + "-" + normalizationService.slugify(name);
            urls.add(syntheticUrl);
            snippetCache.put(syntheticUrl, new EntrySnippet(name, li.outerHtml(), liText));

            if (urls.size() >= maxDiscovery) {
                break;
            }
        }

        return urls;
    }

    @Override
    public RawFetchPayload fetchRawEntry(String url) {
        EntrySnippet snippet = snippetCache.get(url);
        LocalDateTime now = LocalDateTime.now();

        if (snippet == null) {
            return new RawFetchPayload(
                    sourceName(),
                    url,
                    null,
                    null,
                    null,
                    null,
                    now,
                    404,
                    ParseStatus.FETCH_FAILED,
                    DigestUtil.sha256(url + ":missing-snippet")
            );
        }

        String title = snippet.name + " İsminin Anlamı - Alfabetik";
        String checksum = DigestUtil.sha256(snippet.text);

        return new RawFetchPayload(
                sourceName(),
                url,
                snippet.name,
                title,
                snippet.html,
                snippet.text,
                now,
                200,
                ParseStatus.FETCHED,
                checksum
        );
    }

    @Override
    public Optional<ParsedNameCandidateDraft> parse(RawNameSourceEntry rawEntry) {
        if (rawEntry.getRawHtml() == null || rawEntry.getRawHtml().isBlank()) {
            return Optional.empty();
        }

        Element li = Jsoup.parseBodyFragment(rawEntry.getRawHtml()).selectFirst("li");
        String text = li != null ? normalizeWhitespace(li.text()) : normalizeWhitespace(rawEntry.getRawText());
        if (text == null) {
            return Optional.empty();
        }

        String name = parseName(text);
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }

        String meaningShort = parseMeaning(text);
        ParsedGender gender = parseGender(text);
        String origin = normalizationService.normalizeOrigin(meaningShort, meaningShort);
        Boolean quranFlag = meaningShort != null
                && (meaningShort.toLowerCase().contains("kur") || meaningShort.toLowerCase().contains("esma"));

        return Optional.of(new ParsedNameCandidateDraft(
                name,
                gender,
                meaningShort,
                meaningShort,
                origin,
                null,
                null,
                quranFlag,
                sourceName(),
                rawEntry.getSourceUrl(),
                -0.02
        ));
    }

    private String parseName(String text) {
        Matcher matcher = NAME_PATTERN.matcher(text);
        if (matcher.find()) {
            return normalizeWhitespace(matcher.group(1));
        }
        int colon = text.indexOf(':');
        if (colon <= 0) {
            return null;
        }
        String left = text.substring(0, colon).replaceAll("\\(.*?\\)", "").trim();
        return normalizeWhitespace(left);
    }

    private ParsedGender parseGender(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("kız") && lower.contains("erkek")) {
            return ParsedGender.UNISEX;
        }
        if (lower.contains("kız")) {
            return ParsedGender.FEMALE;
        }
        if (lower.contains("erkek")) {
            return ParsedGender.MALE;
        }
        return ParsedGender.UNKNOWN;
    }

    private String parseMeaning(String text) {
        int colon = text.indexOf(':');
        if (colon < 0 || colon + 1 >= text.length()) {
            return null;
        }
        return normalizeWhitespace(text.substring(colon + 1));
    }

    private record EntrySnippet(String name, String html, String text) {
    }
}
