package com.mysticai.auth.security;

import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    private final UserRepository userRepository;

    public JwtTokenProvider(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return generateToken(userDetails.getUsername(), jwtExpiration);
    }

    public String generateRefreshToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return generateToken(userDetails.getUsername(), refreshExpiration);
    }

    private String generateToken(String username, long expiration) {
        User user = userRepository.findByUsername(username).orElse(null);
        Long userId = user != null ? user.getId() : null;
        UserType userType = user != null && user.getUserType() != null ? user.getUserType() : UserType.REGISTERED;
        return generateToken(userId, username, null, expiration, userType);
    }

    /** Backward-compatible — defaults user_type to REGISTERED. */
    public String generateToken(Long userId, String username, String email) {
        return generateToken(userId, username, email, jwtExpiration, UserType.REGISTERED);
    }

    /** Preferred overload — includes user_type claim. */
    public String generateToken(Long userId, String username, String email, UserType userType) {
        return generateToken(userId, username, email, jwtExpiration, userType);
    }

    private String generateToken(Long userId, String username, String email, long expiration, UserType userType) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        var builder = Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .claim("user_type", userType != null ? userType.name() : UserType.REGISTERED.name())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey());

        if (email != null) {
            builder.claim("email", email);
        }

        return builder.compact();
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("userId", Long.class);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getJwtExpiration() {
        return jwtExpiration;
    }
}
