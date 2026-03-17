package com.mysticai.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for the {@code POST /api/auth/quick-start} endpoint.
 *
 * <p>Limits each client IP to {@value #MAX_REQUESTS_PER_WINDOW} quick-start requests within
 * a rolling {@value #WINDOW_SECONDS}-second window to prevent guest account farming.
 *
 * <p><b>Note:</b> This is a single-node in-memory implementation suitable for the current
 * single-gateway deployment. If the gateway is horizontally scaled, replace with a
 * Redis-backed {@code RequestRateLimiter} filter.
 */
@Component
@Order(0) // Run before JWT filter
public class QuickStartRateLimitFilter implements GlobalFilter {

    private static final Logger log = LoggerFactory.getLogger(QuickStartRateLimitFilter.class);

    static final int MAX_REQUESTS_PER_WINDOW = 10;
    static final long WINDOW_SECONDS = 60;

    private static final String QUICK_START_PATH = "/api/auth/quick-start";
    private static final String RATE_LIMIT_RESPONSE =
            "{\"error\":\"RATE_LIMITED\",\"message\":\"Too many quick-start requests. Try again later.\"}";

    /** IP → sliding window of request timestamps (epoch seconds). */
    private final ConcurrentHashMap<String, Deque<Long>> requestHistory = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        var request = exchange.getRequest();

        // Only guard POST /api/auth/quick-start
        if (!HttpMethod.POST.equals(request.getMethod())
                || !QUICK_START_PATH.equals(request.getPath().value())) {
            return chain.filter(exchange);
        }

        String ip = resolveClientIp(exchange);
        long nowSeconds = Instant.now().getEpochSecond();

        boolean allowed = checkAndRecord(ip, nowSeconds);
        if (allowed) {
            return chain.filter(exchange);
        }

        log.warn("Quick-start rate limit exceeded: ip={}", ip);
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        var buffer = response.bufferFactory().wrap(RATE_LIMIT_RESPONSE.getBytes());
        return response.writeWith(Mono.just(buffer));
    }

    /**
     * Records the request timestamp and returns {@code true} if the request is allowed,
     * {@code false} if the sliding window limit is exceeded.
     */
    boolean checkAndRecord(String ip, long nowSeconds) {
        long windowStart = nowSeconds - WINDOW_SECONDS;

        Deque<Long> history = requestHistory.computeIfAbsent(ip, k -> new ArrayDeque<>());

        synchronized (history) {
            // Evict timestamps outside the current window
            while (!history.isEmpty() && history.peekFirst() <= windowStart) {
                history.pollFirst();
            }

            if (history.size() >= MAX_REQUESTS_PER_WINDOW) {
                return false;
            }

            history.addLast(nowSeconds);
            return true;
        }
    }

    private String resolveClientIp(ServerWebExchange exchange) {
        var request = exchange.getRequest();
        // Respect X-Forwarded-For when behind a load balancer
        String forwarded = request.getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        var remoteAddress = request.getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }
}
