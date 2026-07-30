package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.LevelPlayCallbackProperties;
import com.mysticai.notification.dto.rewarded.LevelPlayCallbackParams;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
@RequiredArgsConstructor
public class LevelPlaySignatureVerifier {
    private final LevelPlayCallbackProperties properties;

    public boolean verify(LevelPlayCallbackParams params) {
        String privateKey = properties.getPrivateKey();
        if (privateKey == null || privateKey.isBlank()) {
            return properties.isAllowUnsignedCallbacks();
        }
        if (params.signature() == null || params.signature().isBlank()) return false;

        // Official LevelPlay canonical form:
        // md5(timestamp + eventId + userId + rewards + privateKey)
        String canonical = params.timestamp() + params.eventId() + params.userId()
                + params.rewards() + privateKey;
        try {
            byte[] digest = MessageDigest.getInstance("MD5")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            byte[] expected = HexFormat.of().formatHex(digest).getBytes(StandardCharsets.US_ASCII);
            byte[] actual = params.signature().trim().toLowerCase()
                    .getBytes(StandardCharsets.US_ASCII);
            return MessageDigest.isEqual(expected, actual);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("MD5 digest unavailable", impossible);
        }
    }
}
