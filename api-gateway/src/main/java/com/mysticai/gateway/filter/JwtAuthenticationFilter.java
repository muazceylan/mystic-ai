package com.mysticai.gateway.filter;

import com.mysticai.gateway.security.GatewaySecurityMetrics;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.util.List;

/**
 * Global JWT authentication filter for API Gateway.
 * Validates JWT tokens and propagates user context headers to downstream services.
 */
@Component
@Order(1)
public class JwtAuthenticationFilter implements GlobalFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${gateway.auth.permit-all:false}")
    private boolean permitAll;

    private final GatewaySecurityMetrics securityMetrics;

    // Paths that don't require authentication
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/check-email",
            "/api/auth/refresh",
            "/api/auth/social-login",
            "/api/auth/verification/resend",
            "/api/auth/verify-email",
            "/api/auth/verify-email-otp",
            "/api/auth/quick-start",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/check-email",
            "/api/v1/auth/refresh",
            "/api/v1/auth/social-login",
            "/api/v1/auth/verification/resend",
            "/api/v1/auth/verify-email",
            "/api/v1/auth/verify-email-otp",
            "/api/v1/auth/quick-start",
            "/actuator/health",
            "/actuator/info"
    );

    public JwtAuthenticationFilter(GatewaySecurityMetrics securityMetrics) {
        this.securityMetrics = securityMetrics;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        if (request.getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        if (permitAll) {
            String requestedUserId = request.getHeaders().getFirst("X-User-Id");
            String safeUserId = isNumeric(requestedUserId) ? requestedUserId : "1";
            String requestedUsername = request.getHeaders().getFirst("X-Username");
            String safeUsername = (requestedUsername != null && !requestedUsername.isBlank())
                    ? requestedUsername
                    : "local-dev";

            ServerHttpRequest mutatedRequest = request.mutate()
                    .headers(headers -> {
                        headers.remove("X-User-Id");
                        headers.remove("X-Username");
                        headers.set("X-User-Id", safeUserId);
                        headers.set("X-Username", safeUsername);
                    })
                    .build();
            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        }

        // Check if path is public
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        if (hasUserContextHeaders(request)) {
            log.warn("Potential spoofed user context headers detected and ignored at gateway: method={} path={}",
                    request.getMethod(), path);
            securityMetrics.incrementHeaderSpoofAttempts();
        }

        // Extract Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorizedResponse(
                    exchange,
                    "Missing or invalid Authorization header",
                    AuthFailureReason.MISSING_AUTH
            );
        }

        String token = authHeader.substring(7);

        // Validate token
        if (!validateToken(token)) {
            return unauthorizedResponse(exchange, "Invalid or expired token", AuthFailureReason.INVALID_TOKEN);
        }

        // Extract claims and add user context headers
        Claims claims = extractClaims(token);
        String username = claims.getSubject();
        Long userId = claims.get("userId", Long.class);
        if (userId == null) {
            return unauthorizedResponse(
                    exchange,
                    "Token does not contain userId claim",
                    AuthFailureReason.INVALID_TOKEN
            );
        }

        String userType = claims.get("user_type", String.class);

        // Add user context headers
        ServerHttpRequest mutatedRequest = request.mutate()
                .headers(headers -> {
                    headers.remove("X-User-Id");
                    headers.remove("X-Username");
                    headers.remove("X-User-Type");
                    headers.set("X-User-Id", userId.toString());
                    headers.set("X-Username", username);
                    if (userType != null) {
                        headers.set("X-User-Type", userType);
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private boolean isNumeric(String value) {
        return value != null && value.matches("\\d+");
    }

    private boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean hasUserContextHeaders(ServerHttpRequest request) {
        return request.getHeaders().containsKey("X-User-Id")
                || request.getHeaders().containsKey("X-Username")
                || request.getHeaders().containsKey("X-User-Type");
    }

    private Mono<Void> unauthorizedResponse(
            ServerWebExchange exchange,
            String message,
            AuthFailureReason reason
    ) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        if (reason == AuthFailureReason.MISSING_AUTH) {
            securityMetrics.incrementMissingAuthAttempts();
        } else if (reason == AuthFailureReason.INVALID_TOKEN) {
            securityMetrics.incrementInvalidAuthAttempts();
        }
        log.warn("Gateway auth rejected request: path={} reason={}", exchange.getRequest().getPath(), message);
        return response.setComplete();
    }

    private enum AuthFailureReason {
        MISSING_AUTH,
        INVALID_TOKEN
    }
}
