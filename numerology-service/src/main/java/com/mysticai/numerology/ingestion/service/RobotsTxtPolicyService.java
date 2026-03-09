package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.model.SourceName;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class RobotsTxtPolicyService {

    private static final Duration CACHE_TTL = Duration.ofHours(6);

    private final NameIngestionProperties properties;
    private final ResilientHttpClient httpClient;

    private final Map<SourceName, CachedPolicy> policyCache = new ConcurrentHashMap<>();

    public boolean isAllowed(SourceName sourceName, String url) {
        if (!properties.isRespectRobotsTxt()) {
            return true;
        }
        RobotsPolicy policy = getPolicy(sourceName);
        if (policy.aiInputForbidden()) {
            log.warn("robots content-signal forbids ai-input for source={}", sourceName);
            return false;
        }
        String path = pathOf(url);
        return policy.isPathAllowed(path);
    }

    private RobotsPolicy getPolicy(SourceName sourceName) {
        CachedPolicy cached = policyCache.get(sourceName);
        Instant now = Instant.now();
        if (cached != null && Duration.between(cached.fetchedAt(), now).compareTo(CACHE_TTL) < 0) {
            return cached.policy();
        }

        String robotsUrl = sourceName.getBaseUrl() + "/robots.txt";
        ResilientHttpClient.HttpFetchResponse response = httpClient.fetch(sourceName, robotsUrl, 0);
        RobotsPolicy policy = response.isSuccessful()
                ? parsePolicy(response.body())
                : RobotsPolicy.allowAll();

        policyCache.put(sourceName, new CachedPolicy(policy, now));
        return policy;
    }

    private RobotsPolicy parsePolicy(String robotsText) {
        List<String> disallowRules = new ArrayList<>();
        List<String> allowRules = new ArrayList<>();
        boolean aiInputForbidden = false;

        boolean userAgentStar = false;

        String[] lines = robotsText.split("\\r?\\n");
        for (String line : lines) {
            String noComment = line;
            int hashIdx = noComment.indexOf('#');
            if (hashIdx >= 0) {
                noComment = noComment.substring(0, hashIdx);
            }
            String trimmed = noComment.trim();
            if (trimmed.isBlank() || !trimmed.contains(":")) {
                continue;
            }

            String key = trimmed.substring(0, trimmed.indexOf(':')).trim().toLowerCase(Locale.ROOT);
            String value = trimmed.substring(trimmed.indexOf(':') + 1).trim();

            if ("content-signal".equals(key)) {
                if (value.toLowerCase(Locale.ROOT).contains("ai-input=no")) {
                    aiInputForbidden = true;
                }
                continue;
            }

            if ("user-agent".equals(key)) {
                userAgentStar = "*".equals(value);
                continue;
            }

            if (!userAgentStar) {
                continue;
            }

            if ("allow".equals(key) && !value.isBlank()) {
                allowRules.add(value);
            }
            if ("disallow".equals(key) && !value.isBlank()) {
                disallowRules.add(value);
            }
        }

        return new RobotsPolicy(allowRules, disallowRules, aiInputForbidden);
    }

    private String pathOf(String url) {
        try {
            URI uri = URI.create(url);
            String path = uri.getRawPath();
            if (path == null || path.isBlank()) {
                return "/";
            }
            String query = uri.getRawQuery();
            return query == null ? path : path + "?" + query;
        } catch (Exception ex) {
            return "/";
        }
    }

    private record CachedPolicy(RobotsPolicy policy, Instant fetchedAt) {
    }

    private record RobotsPolicy(List<String> allowRules, List<String> disallowRules, boolean aiInputForbidden) {

        static RobotsPolicy allowAll() {
            return new RobotsPolicy(List.of(), List.of(), false);
        }

        boolean isPathAllowed(String path) {
            String winner = null;
            boolean allow = true;

            for (String rule : disallowRules) {
                if (matches(path, rule) && (winner == null || rule.length() > winner.length())) {
                    winner = rule;
                    allow = false;
                }
            }
            for (String rule : allowRules) {
                if (matches(path, rule) && (winner == null || rule.length() >= winner.length())) {
                    winner = rule;
                    allow = true;
                }
            }
            return allow;
        }

        private boolean matches(String path, String rule) {
            if (rule == null || rule.isBlank()) {
                return false;
            }
            if ("/".equals(rule)) {
                return true;
            }
            String regex = "^" + Pattern.quote(rule).replace("\\*", ".*");
            return path.matches(regex + ".*");
        }
    }
}
