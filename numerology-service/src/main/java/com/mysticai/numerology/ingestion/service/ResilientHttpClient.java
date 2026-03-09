package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.model.SourceName;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResilientHttpClient {

    private final NameIngestionProperties properties;
    private final Map<SourceName, AtomicLong> lastRequestAtMs = new ConcurrentHashMap<>();

    private volatile HttpClient httpClient;

    public HttpFetchResponse fetch(SourceName sourceName, String url, int rateLimitMs) {
        throttle(sourceName, rateLimitMs);

        int maxRetries = Math.max(0, properties.getHttp().getMaxRetries());
        int backoffMs = Math.max(50, properties.getHttp().getRetryBackoffMs());

        Exception lastException = null;

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            Instant startedAt = Instant.now();
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                        .GET()
                        .timeout(Duration.ofMillis(Math.max(1000, properties.getHttp().getReadTimeoutMs())))
                        .header("User-Agent", properties.getHttp().getUserAgent())
                        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                        .header("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.8")
                        .build();

                HttpResponse<String> response = client().send(request, HttpResponse.BodyHandlers.ofString());
                long elapsed = Duration.between(startedAt, Instant.now()).toMillis();

                int status = response.statusCode();
                String body = response.body();
                String finalUrl = response.uri() != null ? response.uri().toString() : url;

                if (status >= 500 && attempt < maxRetries) {
                    sleep(backoffMs * (attempt + 1L));
                    continue;
                }

                return new HttpFetchResponse(status, body, finalUrl, null, elapsed);
            } catch (IOException | InterruptedException ex) {
                if (ex instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                lastException = ex;
                if (attempt < maxRetries) {
                    sleep(backoffMs * (attempt + 1L));
                    continue;
                }
                break;
            } catch (IllegalArgumentException ex) {
                return new HttpFetchResponse(0, null, url, "invalid_url", 0);
            }
        }

        String error = lastException == null ? "unknown_error" : lastException.getClass().getSimpleName();
        log.warn("http fetch failed source={} url={} error={}", sourceName, url, error);
        return new HttpFetchResponse(0, null, url, error, 0);
    }

    private HttpClient client() {
        HttpClient local = httpClient;
        if (local != null) {
            return local;
        }
        synchronized (this) {
            if (httpClient == null) {
                httpClient = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofMillis(Math.max(1000, properties.getHttp().getConnectTimeoutMs())))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .version(HttpClient.Version.HTTP_2)
                        .build();
            }
            return httpClient;
        }
    }

    private void throttle(SourceName sourceName, int rateLimitMs) {
        if (rateLimitMs <= 0) {
            return;
        }
        AtomicLong last = lastRequestAtMs.computeIfAbsent(sourceName, key -> new AtomicLong(0));
        while (true) {
            long now = System.currentTimeMillis();
            long previous = last.get();
            long waitFor = rateLimitMs - (now - previous);
            if (waitFor > 0) {
                sleep(waitFor);
                continue;
            }
            if (last.compareAndSet(previous, System.currentTimeMillis())) {
                return;
            }
        }
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(Math.max(0, ms));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    public record HttpFetchResponse(
            int statusCode,
            String body,
            String finalUrl,
            String error,
            long elapsedMs
    ) {
        public boolean isSuccessful() {
            return statusCode >= 200 && statusCode < 300 && body != null;
        }
    }
}
