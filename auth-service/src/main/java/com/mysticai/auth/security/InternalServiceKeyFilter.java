package com.mysticai.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Single place where service-to-service authentication for {@code /internal/} paths is decided.
 *
 * Controllers never compare the key themselves — that duplication is how a null check gets
 * missed on one endpoint. Behaviour:
 *
 * <ul>
 *   <li>missing, blank or wrong key → <b>404</b>, identical to an unmapped path, so the
 *       existence of internal routes is not disclosed to a prober;</li>
 *   <li>the key is compared in constant time and is never written to a log or error body;</li>
 *   <li>the gateway additionally blocks these paths from outside, so this is the second layer.</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class InternalServiceKeyFilter extends OncePerRequestFilter {

    private static final String INTERNAL_SERVICE_HEADER = "X-Internal-Service-Key";

    private final String internalGatewayKey;

    public InternalServiceKeyFilter(@Value("${internal.gateway.key}") String internalGatewayKey) {
        this.internalGatewayKey = internalGatewayKey;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.contains("/internal/") || path.endsWith("/internal"));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (!matchesInternalKey(request.getHeader(INTERNAL_SERVICE_HEADER))) {
            // Log the path only. The supplied value is a credential and must never be recorded.
            log.warn("Rejected internal call without a valid service key: method={} path={}",
                    request.getMethod(), request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":404,\"error\":\"Not Found\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean matchesInternalKey(String provided) {
        if (provided == null || provided.isBlank() || internalGatewayKey == null || internalGatewayKey.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                provided.getBytes(StandardCharsets.UTF_8),
                internalGatewayKey.getBytes(StandardCharsets.UTF_8));
    }
}
