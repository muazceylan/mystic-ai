package com.mysticai.auth.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestOperations;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Component
public class SocialTokenVerifier {

    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final String APPLE_AUDIENCE = "com.astroguru.mmc";
    private static final String APPLE_SIGNING_ALGORITHM = "RS256";

    private final ObjectMapper objectMapper;
    private final RestOperations socialAuthRestTemplate;

    @Value("${auth.google.allowed-client-ids}")
    private String allowedGoogleClientIdsRaw;

    public SocialTokenVerifier(
            ObjectMapper objectMapper,
            @Qualifier("socialAuthRestTemplate") RestOperations socialAuthRestTemplate
    ) {
        this.objectMapper = objectMapper;
        this.socialAuthRestTemplate = socialAuthRestTemplate;
    }

    public record SocialUserInfo(
            String socialId,
            String email,
            String firstName,
            String lastName,
            boolean emailVerified,
            Boolean privateEmail
    ) {
        public SocialUserInfo(String socialId, String email, String firstName, String lastName) {
            this(socialId, email, firstName, lastName, email != null, null);
        }

        public SocialUserInfo(
                String socialId,
                String email,
                String firstName,
                String lastName,
                boolean emailVerified
        ) {
            this(socialId, email, firstName, lastName, emailVerified, null);
        }
    }

    /**
     * Verify Google ID token by calling Google's tokeninfo endpoint.
     */
    public SocialUserInfo verifyGoogleToken(String idToken) {
        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;

            @SuppressWarnings("unchecked")
            Map<String, Object> response = socialAuthRestTemplate.getForObject(url, Map.class);

            if (response == null) {
                throw new IllegalArgumentException("Invalid Google token: empty response");
            }

            String sub = (String) response.get("sub");
            String email = (String) response.get("email");
            String givenName = (String) response.get("given_name");
            String familyName = (String) response.get("family_name");
            String audience = (String) response.get("aud");

            if (sub == null || email == null) {
                throw new IllegalArgumentException("Invalid Google token: missing sub or email");
            }
            Set<String> allowedGoogleClientIds = Stream.of((allowedGoogleClientIdsRaw == null ? "" : allowedGoogleClientIdsRaw).split(","))
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .collect(Collectors.toSet());
            if (audience == null || !allowedGoogleClientIds.contains(audience)) {
                log.warn("Google token rejected — aud='{}', allowed={}", audience, allowedGoogleClientIds);
                throw new IllegalArgumentException("Invalid Google token: invalid audience");
            }

            return new SocialUserInfo(
                    sub,
                    email,
                    givenName,
                    familyName,
                    parseBooleanClaim(response.get("email_verified")),
                    null
            );
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google token verification failed", e);
            throw new IllegalArgumentException("Invalid Google token");
        }
    }

    /**
     * Verify Apple ID token by decoding the JWT and verifying against Apple's public keys.
     */
    public SocialUserInfo verifyAppleToken(String idToken) {
        try {
            // Decode the JWT payload without verification first to get claims
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Invalid Apple token format");
            }

            // Decode header to get kid
            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            @SuppressWarnings("unchecked")
            Map<String, Object> header = objectMapper.readValue(headerJson, Map.class);
            String kid = (String) header.get("kid");
            String algorithm = (String) header.get("alg");
            if (kid == null || !APPLE_SIGNING_ALGORITHM.equals(algorithm)) {
                throw new IllegalArgumentException("Invalid Apple token header");
            }

            // Fetch Apple's public keys
            AppleKeysResponse keysResponse = socialAuthRestTemplate.getForObject(
                    "https://appleid.apple.com/auth/keys", AppleKeysResponse.class);

            if (keysResponse == null || keysResponse.keys == null) {
                throw new IllegalArgumentException("Failed to fetch Apple public keys");
            }

            // Find matching key
            AppleKey matchingKey = keysResponse.keys.stream()
                    .filter(k -> kid.equals(k.kid))
                    .filter(k -> "RSA".equals(k.kty))
                    .filter(k -> APPLE_SIGNING_ALGORITHM.equals(k.alg))
                    .filter(k -> "sig".equals(k.use))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("No matching Apple key found"));

            // Build RSA public key
            byte[] nBytes = Base64.getUrlDecoder().decode(matchingKey.n);
            byte[] eBytes = Base64.getUrlDecoder().decode(matchingKey.e);
            RSAPublicKeySpec spec = new RSAPublicKeySpec(
                    new BigInteger(1, nBytes), new BigInteger(1, eBytes));
            KeyFactory factory = KeyFactory.getInstance("RSA");
            PublicKey publicKey = factory.generatePublic(spec);

            // Verify signature using jsonwebtoken
            io.jsonwebtoken.Claims claims = io.jsonwebtoken.Jwts.parser()
                    .verifyWith((java.security.interfaces.RSAPublicKey) publicKey)
                    .requireIssuer(APPLE_ISSUER)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();

            String sub = claims.getSubject();
            String email = claims.get("email", String.class);
            Set<String> tokenAudiences = claims.getAudience();
            Date expiration = claims.getExpiration();

            if (sub == null || sub.isBlank()) {
                throw new IllegalArgumentException("Invalid Apple token: missing sub");
            }
            if (tokenAudiences == null
                    || !tokenAudiences.contains(APPLE_AUDIENCE)) {
                log.warn("Apple token rejected because its audience is not allowed");
                throw new IllegalArgumentException("Invalid Apple token: invalid audience");
            }
            if (expiration == null || !expiration.after(new Date())) {
                throw new IllegalArgumentException("Invalid Apple token: missing or expired expiration");
            }

            // Apple doesn't always include name in the token — it's only sent on first auth
            return new SocialUserInfo(
                    sub,
                    email,
                    null,
                    null,
                    parseBooleanClaim(claims.get("email_verified")),
                    parseNullableBooleanClaim(claims.get("is_private_email"))
            );
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Apple token verification failed", e);
            throw new IllegalArgumentException("Invalid Apple token");
        }
    }

    private boolean parseBooleanClaim(Object value) {
        return value instanceof Boolean booleanValue
                ? booleanValue
                : Boolean.parseBoolean(String.valueOf(value));
    }

    private Boolean parseNullableBooleanClaim(Object value) {
        return value == null ? null : parseBooleanClaim(value);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AppleKeysResponse {
        public List<AppleKey> keys;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class AppleKey {
        public String kty;
        public String kid;
        public String use;
        public String alg;
        public String n;
        public String e;
    }
}
