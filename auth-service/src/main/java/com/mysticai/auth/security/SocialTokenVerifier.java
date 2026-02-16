package com.mysticai.auth.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class SocialTokenVerifier {

    private final ObjectMapper objectMapper;

    public record SocialUserInfo(String socialId, String email, String firstName, String lastName) {}

    /**
     * Verify Google ID token by calling Google's tokeninfo endpoint.
     */
    public SocialUserInfo verifyGoogleToken(String idToken) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null) {
                throw new IllegalArgumentException("Invalid Google token: empty response");
            }

            String sub = (String) response.get("sub");
            String email = (String) response.get("email");
            String givenName = (String) response.get("given_name");
            String familyName = (String) response.get("family_name");

            if (sub == null || email == null) {
                throw new IllegalArgumentException("Invalid Google token: missing sub or email");
            }

            return new SocialUserInfo(sub, email, givenName, familyName);
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

            // Fetch Apple's public keys
            RestTemplate restTemplate = new RestTemplate();
            AppleKeysResponse keysResponse = restTemplate.getForObject(
                    "https://appleid.apple.com/auth/keys", AppleKeysResponse.class);

            if (keysResponse == null || keysResponse.keys == null) {
                throw new IllegalArgumentException("Failed to fetch Apple public keys");
            }

            // Find matching key
            AppleKey matchingKey = keysResponse.keys.stream()
                    .filter(k -> k.kid.equals(kid))
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
                    .requireIssuer("https://appleid.apple.com")
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();

            String sub = claims.getSubject();
            String email = claims.get("email", String.class);

            if (sub == null) {
                throw new IllegalArgumentException("Invalid Apple token: missing sub");
            }

            // Apple doesn't always include name in the token — it's only sent on first auth
            return new SocialUserInfo(sub, email, null, null);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Apple token verification failed", e);
            throw new IllegalArgumentException("Invalid Apple token");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class AppleKeysResponse {
        public List<AppleKey> keys;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class AppleKey {
        public String kty;
        public String kid;
        public String use;
        public String alg;
        public String n;
        public String e;
    }
}
