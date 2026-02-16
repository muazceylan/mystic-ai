package com.mysticai.auth.security;

import com.mysticai.auth.entity.User;
import com.mysticai.auth.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * JWT Token Provider Unit Tests.
 * Tests token generation, validation, and claims extraction.
 */
@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    private final String secret = Base64.getEncoder().encodeToString(
            "my-test-secret-key-for-jwt-token-generation-must-be-at-least-256-bits".getBytes()
    );
    private final long expirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(userRepository);
        // Set private fields using reflection
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiration", expirationMs);
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshExpiration", expirationMs * 2);
    }

    @Test
    void shouldGenerateTokenWithCorrectClaims() {
        // Given
        Long userId = 1L;
        String username = "testuser";
        String email = "test@example.com";

        // When
        String token = jwtTokenProvider.generateToken(userId, username, email);

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        
        Claims claims = parseToken(token);
        assertThat(claims.getSubject()).isEqualTo(username);
        assertThat(claims.get("userId", Long.class)).isEqualTo(userId);
        assertThat(claims.get("email", String.class)).isEqualTo(email);
    }

    @Test
    void shouldValidateValidToken() {
        // Given
        String token = jwtTokenProvider.generateToken(1L, "testuser", "test@example.com");

        // When
        boolean isValid = jwtTokenProvider.validateToken(token);

        // Then
        assertThat(isValid).isTrue();
    }

    @Test
    void shouldRejectInvalidToken() {
        // Given
        String invalidToken = "invalid.token.here";

        // When
        boolean isValid = jwtTokenProvider.validateToken(invalidToken);

        // Then
        assertThat(isValid).isFalse();
    }

    @Test
    void shouldExtractUsernameFromToken() {
        // Given
        String username = "testuser";
        String token = jwtTokenProvider.generateToken(1L, username, "test@example.com");

        // When
        String extractedUsername = jwtTokenProvider.getUsernameFromToken(token);

        // Then
        assertThat(extractedUsername).isEqualTo(username);
    }

    @Test
    void shouldExtractUserIdFromToken() {
        // Given
        Long userId = 42L;
        String token = jwtTokenProvider.generateToken(userId, "testuser", "test@example.com");

        // When
        Long extractedUserId = jwtTokenProvider.getUserIdFromToken(token);

        // Then
        assertThat(extractedUserId).isEqualTo(userId);
    }

    @Test
    void shouldSetCorrectExpirationTime() {
        // Given
        String token = jwtTokenProvider.generateToken(1L, "testuser", "test@example.com");

        // When
        Claims claims = parseToken(token);
        Date expiration = claims.getExpiration();

        // Then
        assertThat(expiration).isAfter(new Date());
        // Should expire within ~1 hour
        long diffMs = expiration.getTime() - System.currentTimeMillis();
        assertThat(diffMs).isBetween(3500000L, 3600000L);
    }

    @Test
    void shouldGenerateUniqueTokensForDifferentUsers() {
        // When
        String token1 = jwtTokenProvider.generateToken(1L, "user1", "user1@example.com");
        String token2 = jwtTokenProvider.generateToken(2L, "user2", "user2@example.com");

        // Then
        assertThat(token1).isNotEqualTo(token2);
        
        Claims claims1 = parseToken(token1);
        Claims claims2 = parseToken(token2);
        
        assertThat(claims1.get("userId", Long.class)).isEqualTo(1L);
        assertThat(claims2.get("userId", Long.class)).isEqualTo(2L);
    }

    @Test
    void shouldGenerateAccessTokenFromAuthentication() {
        // Given
        String username = "testuser";
        User user = User.builder()
                .id(1L)
                .username(username)
                .email("test@example.com")
                .build();
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));

        // Create authentication
        var authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                new org.springframework.security.core.userdetails.User(
                        username, "password", java.util.Collections.emptyList()
                ),
                null,
                java.util.Collections.emptyList()
        );

        // When
        String token = jwtTokenProvider.generateAccessToken(authentication);

        // Then
        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo(username);
    }

    private Claims parseToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
