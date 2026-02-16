package com.mysticai.oracle.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Resilience4j Circuit Breaker Configuration for Oracle Service.
 * Protects against cascading failures when calling downstream services.
 */
@Configuration
public class Resilience4jConfig {

    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> defaultCustomizer() {
        return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
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
                        // Timeout for calls
                        .timeoutDuration(Duration.ofSeconds(5))
                        .build())
                .build());
    }
}
