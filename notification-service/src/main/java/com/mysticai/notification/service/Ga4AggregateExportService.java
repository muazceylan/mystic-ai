package com.mysticai.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class Ga4AggregateExportService {

    private final ProductAnalyticsService productAnalyticsService;
    private final RestTemplate restTemplate;

    @Value("${services.auth.base-url:http://localhost:8081}")
    private String authServiceBaseUrl;

    @Value("${analytics.ga4.enabled:false}")
    private boolean ga4Enabled;

    @Value("${analytics.ga4.endpoint:https://www.google-analytics.com/mp/collect}")
    private String ga4Endpoint;

    @Value("${analytics.ga4.measurement-id:}")
    private String measurementId;

    @Value("${analytics.ga4.api-secret:}")
    private String apiSecret;

    @Value("${analytics.ga4.client-id:mystic-admin-server}")
    private String clientId;

    public record AuthUserStats(
            long totalUsers,
            long registeredUsers,
            long guestUsers,
            long verifiedUsers
    ) {}

    public record ExportResult(
            boolean enabled,
            boolean exported,
            String measurementId,
            String targetUrl,
            int eventCount,
            LocalDateTime exportedAt,
            List<String> eventNames,
            String message
    ) {}

    public ExportResult exportSnapshot(int windowDays, int activeWithinDays) {
        LocalDateTime now = LocalDateTime.now();
        String targetUrl = buildTargetUrl();

        if (!ga4Enabled) {
            return new ExportResult(
                    false,
                    false,
                    measurementId,
                    targetUrl,
                    0,
                    now,
                    List.of(),
                    "GA4 aggregate export kapali. GA4_EXPORT_ENABLED=true ile ac."
            );
        }

        if (!StringUtils.hasText(measurementId) || !StringUtils.hasText(apiSecret)) {
            return new ExportResult(
                    true,
                    false,
                    measurementId,
                    targetUrl,
                    0,
                    now,
                    List.of(),
                    "GA4 Measurement ID veya API Secret eksik."
            );
        }

        try {
            ProductAnalyticsService.AnalyticsOverview overview =
                    productAnalyticsService.getOverview(windowDays, activeWithinDays, 3);
            AuthUserStats userStats = fetchUserStats();

            List<Map<String, Object>> events = new ArrayList<>();
            events.add(buildUserAggregateEvent(overview, userStats));
            events.add(buildTopScreensEvent(overview));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("client_id", clientId);
            payload.put("events", events);

            ResponseEntity<String> response = restTemplate.postForEntity(buildCollectUri(), payload, String.class);
            boolean success = response.getStatusCode().is2xxSuccessful();

            if (success) {
                log.info("GA4 aggregate export sent successfully to measurementId={}", measurementId);
            } else {
                log.warn("GA4 aggregate export returned non-2xx for measurementId={} status={}",
                        measurementId, response.getStatusCode());
            }

            return new ExportResult(
                    true,
                    success,
                    measurementId,
                    targetUrl,
                    events.size(),
                    now,
                    List.of("user_aggregate_snapshot", "screen_popularity_snapshot"),
                    success ? "Aggregate snapshot GA4'e gonderildi." : "GA4 export denemesi basarisiz oldu."
            );
        } catch (RestClientException ex) {
            log.warn("GA4 aggregate export failed", ex);
            return new ExportResult(
                    true,
                    false,
                    measurementId,
                    targetUrl,
                    0,
                    now,
                    List.of(),
                    "GA4 export basarisiz: " + safeMessage(ex)
            );
        }
    }

    private AuthUserStats fetchUserStats() {
        String url = authServiceBaseUrl.replaceAll("/+$", "") + "/api/auth/admin/users/stats";
        AuthUserStats userStats = restTemplate.getForObject(url, AuthUserStats.class);
        if (userStats == null) {
            throw new RestClientException("Auth service user stats bos dondu");
        }
        return userStats;
    }

    private Map<String, Object> buildUserAggregateEvent(
            ProductAnalyticsService.AnalyticsOverview overview,
            AuthUserStats userStats
    ) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("window_days", overview.windowDays());
        params.put("active_days", overview.activeWithinDays());
        params.put("total_users", userStats.totalUsers());
        params.put("registered_users", userStats.registeredUsers());
        params.put("guest_users", userStats.guestUsers());
        params.put("verified_users", userStats.verifiedUsers());
        params.put("active_users", overview.activeUsers());
        params.put("tracked_users", overview.trackedUsers());
        params.put("screen_views", overview.trackedScreenViews());
        params.put("screen_views_today", overview.screenViewsToday());

        return Map.of(
                "name", "user_aggregate_snapshot",
                "params", params
        );
    }

    private Map<String, Object> buildTopScreensEvent(ProductAnalyticsService.AnalyticsOverview overview) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("window_days", overview.windowDays());

        List<ProductAnalyticsService.TopScreen> topScreens = overview.topScreens();
        for (int i = 0; i < Math.min(topScreens.size(), 3); i++) {
            ProductAnalyticsService.TopScreen screen = topScreens.get(i);
            int order = i + 1;
            params.put("top_screen_" + order + "_key", screen.screenKey());
            params.put("top_screen_" + order + "_views", screen.visits());
            params.put("top_screen_" + order + "_users", screen.uniqueUsers());
        }

        return Map.of(
                "name", "screen_popularity_snapshot",
                "params", params
        );
    }

    private URI buildCollectUri() {
        return UriComponentsBuilder.fromHttpUrl(ga4Endpoint)
                .queryParam("measurement_id", measurementId)
                .queryParam("api_secret", apiSecret)
                .build(true)
                .toUri();
    }

    private String buildTargetUrl() {
        if (!StringUtils.hasText(measurementId)) {
            return ga4Endpoint;
        }
        return ga4Endpoint + "?measurement_id=" + measurementId;
    }

    private String safeMessage(Throwable throwable) {
        String message = throwable.getMessage();
        if (!StringUtils.hasText(message)) {
            return throwable.getClass().getSimpleName();
        }
        return message;
    }
}
