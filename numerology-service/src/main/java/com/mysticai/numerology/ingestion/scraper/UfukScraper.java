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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class UfukScraper extends AbstractNameSourceScraper {

    private static final String LIST_URL = "https://sertifika.ufuk.edu.tr/isimler-ve-anlamlari";
    private static final Pattern DETAIL_PATTERN = Pattern.compile("https://sertifika\\.ufuk\\.edu\\.tr/.+-isminin-anlami-nedir-blog$");
    private static final Pattern ORIGIN_PATTERN = Pattern.compile("K[öo]keni\\s*:\\s*([^\\n<]+)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern GENDER_PATTERN = Pattern.compile("Cinsiyet\\s*:\\s*([^\\n<]+)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private final NameNormalizationService normalizationService;

    public UfukScraper(
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
        return SourceName.UFUK;
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

        String title = firstNonBlank(doc, "h1", "title");
        String name = extractName(title);
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }

        String content = firstNonBlank(root, "div.prose", ".prose", "article");
        if (content == null) {
            content = normalizeWhitespace(root.text());
        }

        String meaningShort = firstParagraph(root);
        String meaningLong = content;

        String originRaw = findByPattern(rawEntry.getRawHtml(), ORIGIN_PATTERN);
        String genderRaw = findByPattern(rawEntry.getRawHtml(), GENDER_PATTERN);

        String origin = normalizationService.normalizeOrigin(originRaw, meaningShort, meaningLong);
        ParsedGender gender = normalizationService.inferGenderFromText(genderRaw, meaningLong, meaningShort);

        String characterTraits = null;
        if (meaningLong != null && meaningLong.toLowerCase().contains("özellik")) {
            characterTraits = meaningLong;
        }

        String letterAnalysis = null;
        if (meaningLong != null && meaningLong.toLowerCase().contains("harf analizi")) {
            letterAnalysis = meaningLong.substring(Math.max(0, meaningLong.toLowerCase().indexOf("harf analizi")));
        }

        Boolean quranFlag = null;
        if (meaningLong != null && meaningLong.toLowerCase().contains("kur") && meaningLong.toLowerCase().contains("geç")) {
            quranFlag = true;
        }

        return Optional.of(new ParsedNameCandidateDraft(
                name,
                gender,
                meaningShort,
                meaningLong,
                origin,
                characterTraits,
                letterAnalysis,
                quranFlag,
                sourceName(),
                rawEntry.getSourceUrl(),
                0.07
        ));
    }

    private String extractName(String title) {
        if (title == null) {
            return null;
        }
        String normalized = normalizeWhitespace(title);
        if (normalized == null) {
            return null;
        }
        String lower = normalized.toLowerCase(Locale.forLanguageTag("tr"));
        int idx = lower.indexOf(" isminin");
        if (idx > 0) {
            normalized = normalized.substring(0, idx).trim();
        }
        return normalized;
    }

    private String firstParagraph(Element root) {
        Element paragraph = root.selectFirst("div.prose p, .prose p, p");
        if (paragraph == null) {
            return null;
        }
        return normalizeWhitespace(paragraph.text());
    }

    private String findByPattern(String html, Pattern pattern) {
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return normalizeWhitespace(Jsoup.parse(matcher.group(1)).text());
        }
        return null;
    }
}
