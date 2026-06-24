package com.mysticai.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestOperations;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SocialTokenVerifierTest {

    private static final String LEGACY_WEB_CLIENT_ID =
            "607073022009-t0nujj22fr6k33tuhdg1eka9n9eq36t5.apps.googleusercontent.com";
    private static final String LEGACY_ANDROID_CLIENT_ID =
            "607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com";
    private static final String WEB_CLIENT_ID =
            "699117630000-ectgs3iqcqclqlhrn01e5vtodd0n3lrp.apps.googleusercontent.com";
    private static final String WEB_FALLBACK_CLIENT_ID =
            "699117630000-ps0os3vtf47ld2ne8qdoer83i1dl3p8i.apps.googleusercontent.com";
    private static final String IOS_CLIENT_ID =
            "699117630000-p31ab38e9cbi1p78h17v0grkqogp7an7.apps.googleusercontent.com";
    private static final String ANDROID_CLIENT_ID =
            "699117630000-h31rsh94vq05n6avnki1eiee48q7h4q9.apps.googleusercontent.com";
    private static final String IOS_PLIST_ANDROID_CLIENT_ID =
            "699117630000-f8ejg9frfqhs02fn9c7p9k2o5vqicvus.apps.googleusercontent.com";
    private static final String ALLOWED_CLIENT_IDS = String.join(",",
            LEGACY_WEB_CLIENT_ID,
            LEGACY_ANDROID_CLIENT_ID,
            WEB_CLIENT_ID,
            WEB_FALLBACK_CLIENT_ID,
            IOS_CLIENT_ID,
            ANDROID_CLIENT_ID,
            IOS_PLIST_ANDROID_CLIENT_ID
    );

    @Mock
    private RestOperations socialAuthRestTemplate;

    private SocialTokenVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new SocialTokenVerifier(new ObjectMapper(), socialAuthRestTemplate);
        ReflectionTestUtils.setField(verifier, "allowedGoogleClientIdsRaw", ALLOWED_CLIENT_IDS);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            WEB_CLIENT_ID,
            IOS_CLIENT_ID,
            ANDROID_CLIENT_ID,
            IOS_PLIST_ANDROID_CLIENT_ID
    })
    void verifyGoogleToken_acceptsCurrentMobileClientAudiences(String audience) {
        when(socialAuthRestTemplate.getForObject(
                eq("https://oauth2.googleapis.com/tokeninfo?id_token=google-token"),
                eq(Map.class)
        )).thenReturn(tokenInfo(audience));

        SocialTokenVerifier.SocialUserInfo userInfo = verifier.verifyGoogleToken("google-token");

        assertThat(userInfo.socialId()).isEqualTo("google-sub-123");
        assertThat(userInfo.email()).isEqualTo("user@example.com");
        assertThat(userInfo.firstName()).isEqualTo("Ada");
        assertThat(userInfo.lastName()).isEqualTo("Lovelace");
    }

    @Test
    void verifyGoogleToken_rejectsUnknownAudience() {
        when(socialAuthRestTemplate.getForObject(
                eq("https://oauth2.googleapis.com/tokeninfo?id_token=google-token"),
                eq(Map.class)
        )).thenReturn(tokenInfo("unknown-client.apps.googleusercontent.com"));

        assertThatThrownBy(() -> verifier.verifyGoogleToken("google-token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid Google token: invalid audience");
    }

    private static Map<String, Object> tokenInfo(String audience) {
        return Map.of(
                "sub", "google-sub-123",
                "email", "user@example.com",
                "given_name", "Ada",
                "family_name", "Lovelace",
                "aud", audience
        );
    }
}
