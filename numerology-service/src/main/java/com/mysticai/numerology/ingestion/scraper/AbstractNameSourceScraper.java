package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.RawFetchPayload;
import com.mysticai.numerology.ingestion.model.ParseStatus;
import com.mysticai.numerology.ingestion.service.ResilientHttpClient;
import com.mysticai.numerology.ingestion.service.RobotsTxtPolicyService;
import com.mysticai.numerology.ingestion.util.DigestUtil;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;
import java.util.regex.Pattern;

public abstract class AbstractNameSourceScraper implements NameSourceScraper {

    protected final ResilientHttpClient httpClient;
    protected final RobotsTxtPolicyService robotsTxtPolicyService;
    protected final NameIngestionProperties properties;

    protected AbstractNameSourceScraper(
            ResilientHttpClient httpClient,
            RobotsTxtPolicyService robotsTxtPolicyService,
            NameIngestionProperties properties
    ) {
        this.httpClient = httpClient;
        this.robotsTxtPolicyService = robotsTxtPolicyService;
        this.properties = properties;
    }

    protected RawFetchPayload fetchUrl(String url, String externalNameHint) {
        LocalDateTime now = LocalDateTime.now();

        if (!robotsTxtPolicyService.isAllowed(sourceName(), url)) {
            return new RawFetchPayload(
                    sourceName(),
                    url,
                    externalNameHint,
                    null,
                    null,
                    null,
                    now,
                    451,
                    ParseStatus.SKIPPED,
                    DigestUtil.sha256(url + ":robots-block")
            );
        }

        int rateLimitMs = properties.settingsFor(sourceName()).getRateLimitMs();
        ResilientHttpClient.HttpFetchResponse response = httpClient.fetch(sourceName(), url, rateLimitMs);

        if (!response.isSuccessful()) {
            return new RawFetchPayload(
                    sourceName(),
                    url,
                    externalNameHint,
                    null,
                    null,
                    null,
                    now,
                    response.statusCode(),
                    ParseStatus.FETCH_FAILED,
                    DigestUtil.sha256(url + ":" + response.statusCode() + ":" + response.error())
            );
        }

        String html = response.body();
        Document document = Jsoup.parse(html, response.finalUrl());
        String rawText = normalizeWhitespace(document.text());
        String title = normalizeWhitespace(document.title());
        String checksum = DigestUtil.sha256(rawText);

        return new RawFetchPayload(
                sourceName(),
                response.finalUrl(),
                externalNameHint,
                title,
                html,
                rawText,
                now,
                response.statusCode(),
                ParseStatus.FETCHED,
                checksum
        );
    }

    protected String firstNonBlank(Document doc, String... selectors) {
        for (String selector : selectors) {
            Element element = doc.selectFirst(selector);
            if (element != null) {
                String text = normalizeWhitespace(element.text());
                if (text != null && !text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }

    protected String firstNonBlank(Element root, String... selectors) {
        for (String selector : selectors) {
            Element element = root.selectFirst(selector);
            if (element != null) {
                String text = normalizeWhitespace(element.text());
                if (text != null && !text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }

    protected String metaContent(Document doc, String selector) {
        Element element = doc.selectFirst(selector);
        if (element == null) {
            return null;
        }
        return normalizeWhitespace(element.attr("content"));
    }

    protected String extractByRegex(String input, Pattern pattern, int group) {
        if (input == null || input.isBlank()) {
            return null;
        }
        var matcher = pattern.matcher(input);
        if (matcher.find()) {
            return normalizeWhitespace(matcher.group(group));
        }
        return null;
    }

    protected String normalizeWhitespace(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.isBlank() ? null : normalized;
    }

    protected Optional<Element> findHeadingSection(Element root, String headingKeyword) {
        if (root == null || headingKeyword == null) {
            return Optional.empty();
        }

        return root.select("h1,h2,h3,strong").stream()
                .filter(el -> {
                    String text = normalizeWhitespace(el.text());
                    if (text == null) {
                        return false;
                    }
                    String normalizedText = TurkishStringUtil.normalizeTextForDiff(text);
                    String normalizedKeyword = TurkishStringUtil.normalizeTextForDiff(headingKeyword);
                    return normalizedText.contains(normalizedKeyword);
                })
                .findFirst();
    }

    protected String collectFollowingParagraphs(Element heading, int maxParagraphs) {
        if (heading == null) {
            return null;
        }

        StringBuilder out = new StringBuilder();
        Element sibling = heading.nextElementSibling();
        int count = 0;

        while (sibling != null && count < maxParagraphs) {
            if (Arrays.asList("h1", "h2", "h3").contains(sibling.tagName().toLowerCase())) {
                break;
            }
            String text = normalizeWhitespace(sibling.text());
            if (text != null && !text.isBlank()) {
                if (!out.isEmpty()) {
                    out.append(" ");
                }
                out.append(text);
                count++;
            }
            sibling = sibling.nextElementSibling();
        }

        return out.isEmpty() ? null : out.toString();
    }
}
