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
                .route("auth-service", r -> r
                        .path("/api/auth/**")
                        .uri("lb://auth-service"))
                .route("tarot-service", r -> r
                        .path("/api/tarot/**")
                        .uri("lb://tarot-service"))
                .route("astrology-service", r -> r
                        .path("/api/astrology/**")
                        .uri("lb://astrology-service"))
                .build();
    }
}
