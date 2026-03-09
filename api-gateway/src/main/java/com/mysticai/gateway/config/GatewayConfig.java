package com.mysticai.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Auth Service
                .route("auth-service", r -> r
                        .path("/api/auth/**", "/api/v1/auth/**")
                        .uri("lb://auth-service"))
                // Astrology Service
                .route("astrology-service", r -> r
                        .path("/api/v1/astrology/**", "/api/v1/daily/**", "/api/v1/feedback")
                        .uri("lb://astrology-service"))
                // Cosmic scoring endpoints (hosted in astrology-service)
                .route("cosmic-service", r -> r
                        .path("/api/v1/cosmic/**", "/api/v1/cosmic-planner/**")
                        .uri("lb://astrology-service"))
                // Planner reminders (hosted in astrology-service)
                .route("planner-reminders", r -> r
                        .path("/api/v1/reminders", "/api/v1/reminders/**")
                        .uri("lb://astrology-service"))
                // Dream Journal (hosted in astrology-service)
                .route("dream-journal", r -> r
                        .path("/api/v1/dreams/**")
                        .uri("lb://astrology-service"))
                // Saved People (hosted in astrology-service)
                .route("saved-people", r -> r
                        .path("/api/v1/people/**")
                        .uri("lb://astrology-service"))
                // Synastry (hosted in astrology-service)
                .route("synastry", r -> r
                        .path("/api/v1/synastry/**")
                        .uri("lb://astrology-service"))
                // Match Traits comparison endpoint (hosted in astrology-service)
                .route("match-traits", r -> r
                        .path("/api/v1/match/**", "/api/match/**")
                        .uri("lb://astrology-service"))
                // Horoscope (hosted in astrology-service)
                .route("horoscope", r -> r
                        .path("/api/v1/horoscope/**")
                        .uri("lb://astrology-service"))
                // Numerology Admin endpoints (rewrite /api/numerology/admin/** -> /admin/**)
                .route("numerology-admin-service", r -> r
                        .path("/api/numerology/admin/**")
                        .filters(f -> f.rewritePath("/api/numerology/admin(?<segment>/?.*)", "/admin${segment}"))
                        .uri("lb://numerology-service"))
                // Numerology public endpoints (rewrite /api/numerology -> /api/v1/numerology)
                .route("numerology-service", r -> r
                        .path("/api/numerology/**")
                        .filters(f -> f.rewritePath("/api/numerology(?<segment>/?.*)", "/api/v1/numerology${segment}"))
                        .uri("lb://numerology-service"))
                // Dream Service
                .route("dream-service", r -> r
                        .path("/api/dreams/**")
                        .uri("lb://dream-service"))
                // AI Orchestrator (internal)
                .route("ai-orchestrator", r -> r
                        .path("/api/orchestrator/**")
                        .uri("lb://ai-orchestrator"))
                // Oracle Service
                .route("oracle-service", r -> r
                        .path("/api/v1/oracle/**")
                        .uri("lb://oracle-service"))
                // Spiritual Service
                .route("spiritual-service", r -> r
                        .path("/api/v1/spiritual/**")
                        .uri("lb://spiritual-service"))
                // Notification Service - REST API
                .route("notification-service", r -> r
                        .path("/api/v1/notifications/**")
                        .uri("lb://notification-service"))
                // Tutorial Config - public endpoint (notification-service)
                .route("notification-tutorial-config", r -> r
                        .path("/api/v1/tutorial-configs", "/api/v1/tutorial-configs/**")
                        .uri("lb://notification-service"))
                // Vision Service
                .route("vision-service", r -> r
                        .path("/api/vision/**")
                        .uri("lb://vision-service"))
                // Notification Service - WebSocket (ws:// or wss://)
                .route("notification-service-ws", r -> r
                        .path("/ws/**")
                        .uri("lb:ws://notification-service"))
                // Swagger UI for all services
                .route("auth-service-docs", r -> r
                        .path("/auth-service/v3/api-docs")
                        .uri("lb://auth-service/v3/api-docs"))
                .route("astrology-service-docs", r -> r
                        .path("/astrology-service/v3/api-docs")
                        .uri("lb://astrology-service/v3/api-docs"))
                .route("numerology-service-docs", r -> r
                        .path("/numerology-service/v3/api-docs")
                        .uri("lb://numerology-service/v3/api-docs"))
                .route("dream-service-docs", r -> r
                        .path("/dream-service/v3/api-docs")
                        .uri("lb://dream-service/v3/api-docs"))
                .route("oracle-service-docs", r -> r
                        .path("/oracle-service/v3/api-docs")
                        .uri("lb://oracle-service/v3/api-docs"))
                .route("spiritual-service-docs", r -> r
                        .path("/spiritual-service/v3/api-docs")
                        .uri("lb://spiritual-service/v3/api-docs"))
                .route("notification-service-docs", r -> r
                        .path("/notification-service/v3/api-docs")
                        .uri("lb://notification-service/v3/api-docs"))
                .route("vision-service-docs", r -> r
                        .path("/vision-service/v3/api-docs")
                        .uri("lb://vision-service/v3/api-docs"))
                .build();
    }
}
