package com.mysticai.notification.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

/**
 * Validates user JWTs issued by auth-service using the shared JWT_SECRET.
 *
 * WHY: The gateway validates JWT and injects X-User-Id, but downstream services
 * can be called directly (bypassing the gateway) by internal or malicious actors.
 * Re-validating the Bearer token in notification-service closes this trust gap
 * for high-security endpoints (rewarded ads / token credit flows).
 *
 * The JWT secret is the same key used by auth-service (JWT_SECRET env var).
 * The Authorization: Bearer header passes through the gateway unchanged.
 *
 * JWT claims expected:
 * - "sub"    : username / email (string)
 * - "userId" : numeric user id (Long)
 */
@Service
@Slf4j
public class UserJwtService {

    private final SecretKey signingKey;

    public UserJwtService(@Value("${user.jwt.secret}") String base64Secret) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
    }

    /**
     * Parses and validates a user JWT.
     *
     * @param token raw token (without "Bearer " prefix)
     * @return parsed Claims on success
     * @throws io.jsonwebtoken.JwtException on invalid/expired token
     */
    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts userId from the "userId" claim.
     * Returns null if the claim is absent (should never happen for auth-service JWTs).
     */
    public Long extractUserId(Claims claims) {
        return claims.get("userId", Long.class);
    }

    public boolean isValid(String token) {
        try {
            parseAndValidate(token);
            return true;
        } catch (Exception e) {
            log.debug("User JWT validation failed: {}", e.getMessage());
            return false;
        }
    }
}
