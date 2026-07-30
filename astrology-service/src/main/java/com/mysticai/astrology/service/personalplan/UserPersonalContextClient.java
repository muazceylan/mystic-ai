package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.daily.UserPersonalContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Reads the small profile slice auth-service owns (birth date, marital status, timezone).
 *
 * Production characteristics:
 * <ul>
 *   <li>bounded connect and read timeouts, so a slow auth-service cannot stall the plan;</li>
 *   <li><b>no retry</b> — a failed lookup degrades to a chart-only plan immediately rather than
 *       multiplying load on a service that is already struggling;</li>
 *   <li>short-lived in-memory cache. The TTL is deliberately small (minutes, not hours) because
 *       relationship status is user-editable and a stale value would gate the wrong copy;</li>
 *   <li>the internal key is read from configuration only and never logged, including on error.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserPersonalContextClient {

    private static final String INTERNAL_SERVICE_HEADER = "X-Internal-Service-Key";

    private final PersonalPlanProperties properties;

    @Value("${auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${internal.gateway.key}")
    private String internalGatewayKey;

    private record CacheEntry(UserPersonalContext context, Instant expiresAt) {}

    private final Map<Long, CacheEntry> cache = new ConcurrentHashMap<>();

    public UserPersonalContext fetch(Long userId) {
        if (userId == null || userId <= 0) {
            return UserPersonalContext.empty(userId);
        }

        CacheEntry cached = cache.get(userId);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.context();
        }

        UserPersonalContext fetched = load(userId);
        cache.put(userId, new CacheEntry(
                fetched,
                Instant.now().plus(Duration.ofSeconds(properties.getProfileCacheTtlSeconds()))));
        return fetched;
    }

    /** Drops the cached entry so the next plan picks up an edited profile immediately. */
    public void invalidate(Long userId) {
        if (userId != null) {
            cache.remove(userId);
        }
    }

    private UserPersonalContext load(Long userId) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(properties.getProfileConnectTimeoutMs());
            factory.setReadTimeout(properties.getProfileReadTimeoutMs());

            UserPersonalContext response = RestClient.builder()
                    .baseUrl(authServiceUrl)
                    .requestFactory(factory)
                    .build()
                    .get()
                    .uri("/api/v1/auth/internal/users/{userId}/personal-context", userId)
                    .header(INTERNAL_SERVICE_HEADER, internalGatewayKey)
                    .retrieve()
                    .body(UserPersonalContext.class);

            return response != null ? response : UserPersonalContext.empty(userId);
        } catch (Exception e) {
            // Log the failure class only — never the payload (birth data) or the key.
            log.warn("Personal context lookup failed for userId={}, continuing chart-only: {}",
                    userId, e.getClass().getSimpleName());
            return UserPersonalContext.empty(userId);
        }
    }
}
