package com.mysticai.gateway.filter;

import com.mysticai.gateway.security.GatewaySecurityMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GatewayCorsAuditFilter implements WebFilter {

    private static final Logger log = LoggerFactory.getLogger(GatewayCorsAuditFilter.class);

    @Value("${gateway.cors.allowed-origins}")
    private List<String> allowedOrigins;

    private final GatewaySecurityMetrics securityMetrics;

    public GatewayCorsAuditFilter(GatewaySecurityMetrics securityMetrics) {
        this.securityMetrics = securityMetrics;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String origin = request.getHeaders().getOrigin();

        if (origin == null || origin.isBlank() || isAllowedOrigin(origin) || !isCorsPreflight(request)) {
            return chain.filter(exchange);
        }

        String method = request.getMethod() != null ? request.getMethod().name() : "UNKNOWN";
        log.warn("Blocked CORS preflight request from disallowed origin: method={} path={} origin={}",
                method, request.getPath(), origin);
        securityMetrics.incrementCorsBlockedPreflightAttempts();

        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        return response.setComplete();
    }

    private boolean isCorsPreflight(ServerHttpRequest request) {
        return request.getMethod() == HttpMethod.OPTIONS
                && request.getHeaders().containsKey("Access-Control-Request-Method");
    }

    private boolean isAllowedOrigin(String origin) {
        String normalized = normalizeOrigin(origin);
        return allowedOrigins.stream()
                .map(this::normalizeOrigin)
                .anyMatch(normalized::equals);
    }

    private String normalizeOrigin(String origin) {
        if (origin == null) {
            return "";
        }
        String value = origin.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }
}
