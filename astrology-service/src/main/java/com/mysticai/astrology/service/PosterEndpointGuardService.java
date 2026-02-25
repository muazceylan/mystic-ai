package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.NightSkyPosterShareLinkRequest;
import com.mysticai.astrology.dto.NightSkyProjectionRequest;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
@Slf4j
public class PosterEndpointGuardService {

    private final Map<String, ConcurrentLinkedDeque<Long>> buckets = new ConcurrentHashMap<>();

    public void checkProjection(HttpServletRequest request, NightSkyProjectionRequest payload) {
        String ip = resolveClientIp(request);
        enforce("projection:ip", ip, 45, Duration.ofMinutes(1));
        if (payload != null && payload.userId() != null) {
            enforce("projection:user", String.valueOf(payload.userId()), 120, Duration.ofMinutes(10));
        }
    }

    public void checkShareLink(HttpServletRequest request, NightSkyPosterShareLinkRequest payload) {
        String ip = resolveClientIp(request);
        enforce("share-link:ip", ip, 16, Duration.ofMinutes(1));
        if (payload != null && payload.userId() != null) {
            enforce("share-link:user", String.valueOf(payload.userId()), 40, Duration.ofMinutes(10));
        }
    }

    public void checkShareResolve(HttpServletRequest request, String token) {
        String ip = resolveClientIp(request);
        enforce("share-resolve:ip", ip, 180, Duration.ofMinutes(1));
        if (token != null && !token.isBlank()) {
            enforce("share-resolve:ip-token", ip + "|" + token, 30, Duration.ofMinutes(1));
        }
    }

    @Scheduled(fixedDelayString = "${astrology.poster-share.guard.cleanup-ms:300000}")
    public void cleanupBuckets() {
        long now = System.currentTimeMillis();
        int before = buckets.size();
        buckets.entrySet().removeIf(entry -> {
            ConcurrentLinkedDeque<Long> q = entry.getValue();
            synchronized (q) {
                prune(q, now - Duration.ofMinutes(15).toMillis());
                return q.isEmpty();
            }
        });
        int removed = before - buckets.size();
        if (removed > 0) {
            log.debug("Poster guard cleanup removed {} empty buckets", removed);
        }
    }

    private void enforce(String scope, String identity, int limit, Duration window) {
        String key = scope + "|" + sanitizeIdentity(identity);
        long now = System.currentTimeMillis();
        long cutoff = now - window.toMillis();
        ConcurrentLinkedDeque<Long> q = buckets.computeIfAbsent(key, __ -> new ConcurrentLinkedDeque<>());

        synchronized (q) {
            prune(q, cutoff);
            if (q.size() >= limit) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Çok fazla poster isteği alındı. Lütfen kısa süre sonra tekrar dene."
                );
            }
            q.addLast(now);
        }
    }

    private void prune(ConcurrentLinkedDeque<Long> q, long cutoffEpochMs) {
        while (true) {
            Long head = q.peekFirst();
            if (head == null || head >= cutoffEpochMs) {
                break;
            }
            q.pollFirst();
        }
    }

    private String sanitizeIdentity(String value) {
        if (value == null || value.isBlank()) return "unknown";
        String v = value.trim();
        return v.length() > 128 ? v.substring(0, 128) : v;
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";

        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String first = xff.split(",")[0].trim();
            if (!first.isBlank()) return first;
        }

        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return xri.trim();
        }

        String remote = request.getRemoteAddr();
        if (remote == null || remote.isBlank()) return "unknown";
        return remote;
    }
}

