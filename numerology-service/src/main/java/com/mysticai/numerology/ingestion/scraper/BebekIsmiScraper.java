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
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class BebekIsmiScraper extends AbstractNameSourceScraper {

    private static final Pattern JSON_NAME_PATTERN = Pattern.compile("\\\"name\\\":\\\"([^\\\"]{2,100})\\\"");
    private static final Pattern TITLE_NAME_PATTERN = Pattern.compile("^(.+?)\\s+İsminin", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern ORIGIN_PATTERN = Pattern.compile("(Arapça|Farsça|Türkçe|Yunanca|Latince|İbranice)\\s+k[öo]kenli", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private final NameNormalizationService normalizationService;

    public BebekIsmiScraper(
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
        return SourceName.BEBEKISMI;
    }

    @Override
    public Set<String> discoverDetailUrls() {
        Set<String> detailUrls = new LinkedHashSet<>();
        List<String> seedListUrls = List.of(
                "https://bebekismi.com/isimler?cinsiyet=erkek",
                "https://bebekismi.com/isimler?cinsiyet=kiz",
                "https://bebekismi.com/isimler?cinsiyet=uniseks"
        );

        int maxDiscovery = properties.settingsFor(sourceName()).getMaxDiscoveryUrls();

        for (String listUrl : seedListUrls) {
            if (!robotsTxtPolicyService.isAllowed(sourceName(), listUrl)) {
                log.warn("bebekismi list discovery blocked by robots: {}", listUrl);
                continue;
            }

            ResilientHttpClient.HttpFetchResponse response = httpClient.fetch(
                    sourceName(),
                    listUrl,
                    properties.settingsFor(sourceName()).getRateLimitMs()
            );
            if (!response.isSuccessful() || response.body() == null) {
                log.warn("bebekismi discovery request failed status={} url={}", response.statusCode(), listUrl);
                continue;
            }

            Matcher matcher = JSON_NAME_PATTERN.matcher(response.body());
            while (matcher.find() && detailUrls.size() < maxDiscovery) {
                String name = matcher.group(1);
                String slug = normalizationService.slugify(name);
                if (slug.isBlank()) {
                    continue;
                }
                detailUrls.add("https://bebekismi.com/isim/" + slug);
            }
        }

        return detailUrls;
    }

    @Override
    public RawFetchPayload fetchRawEntry(String url) {
        String externalName = extractExternalName(url);
        return fetchUrl(url, externalName);
    }

    @Override
    public Optional<ParsedNameCandidateDraft> parse(RawNameSourceEntry rawEntry) {
        if (rawEntry.getRawHtml() == null || rawEntry.getRawHtml().isBlank()) {
            return Optional.empty();
        }

        Document doc = Jsoup.parse(rawEntry.getRawHtml(), rawEntry.getSourceUrl());

        String title = firstNonBlank(doc, "title", "h1");
        String name = extractByRegex(title, TITLE_NAME_PATTERN, 1);
        if (name == null) {
            name = firstNonBlank(doc, "h1");
            if (name != null) {
                name = name.replaceAll("\\s+İsminin.*$", "").trim();
            }
        }

        String genderText = firstNonBlank(doc,
                "span.tag:matchesOwn((?i)erkek|kız|uniseks|üniseks)",
                "p:matchesOwn((?i)erkek bebek isimleri|kız bebek isimleri)");
        ParsedGender gender = normalizationService.inferGenderFromText(genderText);

        Element root = doc.selectFirst("main");
        if (root == null) {
            root = doc.body();
        }

        String meaningShort = null;
        String character = null;
        String letter = null;

        Optional<Element> meaningHeading = findHeadingSection(root, "isim anlam");
        if (meaningHeading.isPresent()) {
            meaningShort = collectFollowingParagraphs(meaningHeading.get(), 1);
        }
        if (meaningShort == null) {
            meaningShort = firstNonBlank(doc, "p.name-meaning");
        }
        if (meaningShort == null) {
            meaningShort = metaContent(doc, "meta[name=description]");
        }

        Optional<Element> characterHeading = findHeadingSection(root, "karakter");
        if (characterHeading.isPresent()) {
            character = collectFollowingParagraphs(characterHeading.get(), 2);
        }
        if (character == null) {
            character = firstNonBlank(doc, "div.name-char");
        }

        Optional<Element> letterHeading = findHeadingSection(root, "harf analiz");
        if (letterHeading.isPresent()) {
            letter = collectFollowingParagraphs(letterHeading.get(), 3);
        }

        String meaningLong = joinNonBlank(meaningShort, character, letter);
        String origin = null;
        Matcher originMatcher = ORIGIN_PATTERN.matcher(joinNonBlank(meaningShort, meaningLong));
        if (originMatcher.find()) {
            origin = originMatcher.group(1);
        }

        Boolean quranFlag = null;
        String corpus = joinNonBlank(meaningShort, meaningLong).toLowerCase();
        if (corpus.contains("kur'an") || corpus.contains("kuran")) {
            quranFlag = true;
        }

        if (name == null || name.isBlank()) {
            return Optional.empty();
        }

        double confidenceBonus = origin != null ? 0.06 : 0.0;

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
                confidenceBonus
        ));
    }

    private String extractExternalName(String url) {
        String[] parts = url.split("/");
        if (parts.length == 0) {
            return null;
        }
        String slug = parts[parts.length - 1];
        if (slug.isBlank()) {
            return null;
        }
        return normalizationService.normalizedName(slug).replace('-', ' ');
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
