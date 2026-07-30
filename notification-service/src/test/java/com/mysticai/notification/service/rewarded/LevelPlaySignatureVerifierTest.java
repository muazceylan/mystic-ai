package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.LevelPlayCallbackProperties;
import com.mysticai.notification.dto.rewarded.LevelPlayCallbackParams;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LevelPlaySignatureVerifierTest {

    private final LevelPlayCallbackProperties properties = new LevelPlayCallbackProperties();
    private final LevelPlaySignatureVerifier verifier = new LevelPlaySignatureVerifier(properties);

    @Test
    void verifiesOfficialCanonicalMd5Signature() {
        properties.setPrivateKey("secret");

        assertThat(verifier.verify(params("bee523652aa7925373185c356f087d85"))).isTrue();
        assertThat(verifier.verify(params("BEE523652AA7925373185C356F087D85"))).isTrue();
        assertThat(verifier.verify(params("00000000000000000000000000000000"))).isFalse();
    }

    @Test
    void failsClosedWithoutPrivateKeyByDefault() {
        properties.setPrivateKey("");

        assertThat(verifier.verify(params(null))).isFalse();

        properties.setAllowUnsignedCallbacks(true);
        assertThat(verifier.verify(params(null))).isTrue();
    }

    private static LevelPlayCallbackParams params(String signature) {
        return new LevelPlayCallbackParams(
                "1700000000", "event-1", "42", 1, signature,
                "51eeb26d-2432-49af-96f5-51a3a523a2dc",
                "TOKEN_WALLET", "UnityAds", "auction-1");
    }
}
