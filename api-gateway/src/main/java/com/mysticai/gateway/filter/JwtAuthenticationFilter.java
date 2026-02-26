package com.mysticai.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
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

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${gateway.auth.permit-all:false}")
    private boolean permitAll;

    // Paths that don't require authentication
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/check-email",
            "/api/auth/refresh",
            "/api/auth/social-login",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/check-email",
            "/api/v1/auth/refresh",
            "/actuator",
            "/v3/api-docs",
            "/swagger-ui",
            "/swagger-ui.html"
    );

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
            ServerHttpRequest mutatedRequest = request.mutate()
                    .header("X-User-Id", request.getHeaders().getFirst("X-User-Id") != null
                            ? request.getHeaders().getFirst("X-User-Id")
                            : "1")
                    .header("X-Username", request.getHeaders().getFirst("X-Username") != null
                            ? request.getHeaders().getFirst("X-Username")
                            : "local-dev")
                    .build();
            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        }

        // Check if path is public
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        // Extract Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorizedResponse(exchange, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);

        // Validate token
        if (!validateToken(token)) {
            return unauthorizedResponse(exchange, "Invalid or expired token");
        }

        // Extract claims and add user context headers
        Claims claims = extractClaims(token);
        String username = claims.getSubject();
        Long userId = claims.get("userId", Long.class);

        // Add user context headers
        ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", userId != null ? userId.toString() : "")
                .header("X-Username", username)
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
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

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        return response.setComplete();
    }
}
