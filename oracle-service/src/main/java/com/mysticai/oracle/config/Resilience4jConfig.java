package com.mysticai.oracle.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Set;

/**
 * Resilience4j Circuit Breaker Configuration for Oracle Service.
 * Protects against cascading failures when calling downstream services.
 */
@Configuration
public class Resilience4jConfig {

    private static final Set<String> AI_SERVICES = Set.of("ai-orchestrator");

    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> defaultCustomizer() {
        return factory -> {
            // AI Orchestrator needs a longer timeout — Groq LLM calls can take up to 20s
            factory.configure(builder -> builder
                    .circuitBreakerConfig(CircuitBreakerConfig.custom()
                            .failureRateThreshold(50)
                            .slowCallRateThreshold(80)
                            .slowCallDurationThreshold(Duration.ofSeconds(25))
                            .permittedNumberOfCallsInHalfOpenState(3)
                            .slidingWindowSize(10)
                            .minimumNumberOfCalls(3)
                            .waitDurationInOpenState(Duration.ofSeconds(30))
                            .automaticTransitionFromOpenToHalfOpenEnabled(true)
                            .build())
                    .timeLimiterConfig(TimeLimiterConfig.custom()
                            .timeoutDuration(Duration.ofSeconds(30))
                            .build()),
                    AI_SERVICES.toArray(new String[0]));

            factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(CircuitBreakerConfig.custom()
                        // Failure rate threshold percentage
                        .failureRateThreshold(50)
                        // Slow call rate threshold
                        .slowCallRateThreshold(50)
                        // Duration threshold for slow calls
                        .slowCallDurationThreshold(Duration.ofSeconds(2))
                        // Number of calls to calculate failure rate
                        .permittedNumberOfCallsInHalfOpenState(10)
                        // Sliding window size
                        .slidingWindowSize(100)
                        // Minimum number of calls before calculating failure rate
                        .minimumNumberOfCalls(10)
                        // Wait duration in open state before transitioning to half-open
                        .waitDurationInOpenState(Duration.ofSeconds(10))
                        // Automatic transition from open to half-open
                        .automaticTransitionFromOpenToHalfOpenEnabled(true)
                        .build())
                .timeLimiterConfig(TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(5))
                        .build())
                .build());
        };
    }
}
