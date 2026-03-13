package com.mysticai.oracle.security;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class GatewayTrustFilter extends OncePerRequestFilter {

    private static final String TRUST_HEADER = "X-Internal-Gateway-Key";

    private final Counter rejectedGatewayTrustCounter;

    @Value("${internal.gateway.key}")
    private String internalGatewayKey;

    public GatewayTrustFilter(MeterRegistry meterRegistry) {
        this.rejectedGatewayTrustCounter = Counter.builder("security.oracle.gateway_trust_rejected")
                .description("Requests rejected due to missing/invalid gateway trust key.")
                .register(meterRegistry);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/v1/oracle/")
                || path.equals("/api/v1/oracle/health");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String providedKey = request.getHeader(TRUST_HEADER);
        if (providedKey == null || !providedKey.equals(internalGatewayKey)) {
            log.warn("Blocked oracle request without valid gateway trust key: method={} path={} ip={}",
                    request.getMethod(), request.getRequestURI(), request.getRemoteAddr());
            rejectedGatewayTrustCounter.increment();
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Missing or invalid gateway trust");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
