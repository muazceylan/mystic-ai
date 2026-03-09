package com.mysticai.notification.admin.security;

import com.mysticai.notification.entity.AdminUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Set;

@Service
public class AdminJwtService {

    private static final int MIN_SECRET_LENGTH = 32;
    private static final Set<String> KNOWN_WEAK_SECRETS = Set.of(
            "mystic-admin-super-secret-key-min-32-chars-long",
            "secret", "changeme", "password", "admin"
    );

    private final SecretKey key;
    private final long expirationMs;

    public AdminJwtService(
            @Value("${admin.jwt.secret:}") String secret,
            @Value("${admin.jwt.expiration-ms:86400000}") long expirationMs) {

        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "admin.jwt.secret is not configured. Set it in application.yml or via ADMIN_JWT_SECRET env var.");
        }
        if (secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "admin.jwt.secret must be at least " + MIN_SECRET_LENGTH + " characters long.");
        }
        if (KNOWN_WEAK_SECRETS.contains(secret)) {
            throw new IllegalStateException(
                    "admin.jwt.secret is set to a known default/weak value. Use a strong random secret in production.");
        }

        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(AdminUser admin) {
        return Jwts.builder()
                .subject(admin.getId().toString())
                .claims(Map.of(
                        "email", admin.getEmail(),
                        "role", admin.getRole().name()
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long extractAdminId(String token) {
        return Long.parseLong(parseClaims(token).getSubject());
    }

    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
