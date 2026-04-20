package com.mysticai.notification.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT authentication filter for user-facing monetization endpoints.
 *
 * WHY THIS EXISTS:
 * The API Gateway validates user JWTs and injects X-User-Id into downstream
 * requests. However, internal/direct calls can bypass the gateway and inject
 * arbitrary X-User-Id headers. This filter eliminates that trust gap for the
 * high-security rewarded-ads flow by independently validating the Bearer token
 * using the same JWT_SECRET as auth-service.
 *
 * The Authorization header is NOT stripped by the gateway — it passes through
 * unchanged — so the same token the mobile/web client sent is available here.
 *
 * SCOPE: Only activates for /api/v1/monetization/rewarded-ads/** paths.
 * Other notification-service paths retain their existing security config.
 *
 * RESULT: SecurityContext.authentication.principal == Long userId from JWT.
 * X-User-Id header is completely ignored for these endpoints.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserJwtFilter extends OncePerRequestFilter {

    private static final String REWARDED_ADS_PREFIX = "/api/v1/monetization/rewarded-ads";

    private final UserJwtService userJwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Only apply to rewarded-ads endpoints.
        if (!path.startsWith(REWARDED_ADS_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            reject(response, "Missing or invalid Authorization header for rewarded-ads endpoint.");
            return;
        }

        String token = authHeader.substring(7);
        Claims claims;
        try {
            claims = userJwtService.parseAndValidate(token);
        } catch (Exception e) {
            log.warn("[UserJwtFilter] Invalid user JWT on rewarded-ads path={} error={}",
                path, e.getMessage());
            reject(response, "Invalid or expired user token.");
            return;
        }

        Long userId = userJwtService.extractUserId(claims);
        if (userId == null) {
            log.warn("[UserJwtFilter] JWT missing userId claim on path={}", path);
            reject(response, "Token does not carry a valid user identity.");
            return;
        }

        // Set Spring Security context — controller reads from here, NOT from header.
        var auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String reason) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            "{\"code\":\"UNAUTHORIZED\",\"message\":\"" + reason + "\"}"
        );
    }
}
