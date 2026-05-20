package com.mysticai.gateway.filter;

import com.mysticai.gateway.security.GatewaySecurityMetrics;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

class JwtAuthenticationFilterTest {

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(new GatewaySecurityMetrics(new SimpleMeterRegistry()));
        ReflectionTestUtils.setField(filter, "permitAll", false);
    }

    @Test
    void passwordResetRequest_isPublicWithoutAuthorization() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/v1/auth/password/forgot")
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, webExchange -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertThat(chainCalled).isTrue();
    }

    @Test
    void passwordResetPage_isPublicWithoutAuthorization() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/auth/reset-password?token=abc")
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, webExchange -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertThat(chainCalled).isTrue();
    }

    @Test
    void moduleRuleRequest_isPublicWithoutAuthorization() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/monetization/modules/horoscope")
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, webExchange -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertThat(chainCalled).isTrue();
    }

    @Test
    void actionUnlockOptions_requiresAuthorization() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/monetization/modules/horoscope/actions/weekly/unlock-options")
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, webExchange -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertThat(chainCalled).isFalse();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(UNAUTHORIZED);
    }

    @Test
    void rewardedUnlockComplete_requiresAuthorization() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/v1/monetization/modules/horoscope/actions/weekly/rewarded-ad/complete")
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, webExchange -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertThat(chainCalled).isFalse();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(UNAUTHORIZED);
    }
}
