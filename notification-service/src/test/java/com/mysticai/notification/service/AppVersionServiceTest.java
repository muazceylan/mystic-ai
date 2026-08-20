package com.mysticai.notification.service;

import com.mysticai.notification.dto.AppUpdateStatus;
import com.mysticai.notification.dto.AppVersionResponse;
import com.mysticai.notification.entity.AppVersionConfig;
import com.mysticai.notification.repository.AppVersionConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppVersionServiceTest {

    @Mock AppVersionConfigRepository repository;

    @InjectMocks AppVersionService service;

    /** Matches the worked example in the spec: latest build 27, minimum supported 25. */
    private AppVersionConfig androidPolicy() {
        return AppVersionConfig.builder()
                .platform("android")
                .latestVersion("1.2.0").latestBuild(27)
                .minSupportedVersion("1.1.0").minSupportedBuild(25)
                .forceUpdate(true)
                .optionalUpdateEnabled(true)
                .androidStoreUrl("market://details?id=com.astroguru.mmc")
                .androidWebStoreUrl("https://play.google.com/store/apps/details?id=com.astroguru.mmc")
                .titleTr("Yeni sürüm").messageTr("Güncelle")
                .titleEn("New version").messageEn("Please update")
                .build();
    }

    // ── status matrix ────────────────────────────────────────────────────────

    @Test
    void belowMinimumBuild_isForceUpdate() {
        assertThat(service.decideStatus(androidPolicy(), "1.0.0", 24))
                .isEqualTo(AppUpdateStatus.FORCE_UPDATE);
    }

    @Test
    void betweenMinimumAndLatest_isOptionalUpdate() {
        assertThat(service.decideStatus(androidPolicy(), "1.1.5", 26))
                .isEqualTo(AppUpdateStatus.OPTIONAL_UPDATE);
    }

    @Test
    void exactlyMinimumBuild_isOptionalUpdateNotForced() {
        assertThat(service.decideStatus(androidPolicy(), "1.1.0", 25))
                .isEqualTo(AppUpdateStatus.OPTIONAL_UPDATE);
    }

    @Test
    void atLatestBuild_isUpToDate() {
        assertThat(service.decideStatus(androidPolicy(), "1.2.0", 27))
                .isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    @Test
    void aheadOfLatestBuild_isUpToDate() {
        // Internal / TestFlight / staged builds must never be pushed backwards.
        assertThat(service.decideStatus(androidPolicy(), "1.3.0", 31))
                .isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    // ── toggles ──────────────────────────────────────────────────────────────

    @Test
    void forceDisabled_downgradesBlockToOptional() {
        AppVersionConfig config = androidPolicy();
        config.setForceUpdate(false);

        assertThat(service.decideStatus(config, "1.0.0", 24))
                .isEqualTo(AppUpdateStatus.OPTIONAL_UPDATE);
    }

    @Test
    void optionalDisabled_leavesSupportedUserAlone() {
        AppVersionConfig config = androidPolicy();
        config.setOptionalUpdateEnabled(false);

        assertThat(service.decideStatus(config, "1.1.5", 26))
                .isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    @Test
    void optionalDisabled_stillForcesUnsupportedBuild() {
        AppVersionConfig config = androidPolicy();
        config.setOptionalUpdateEnabled(false);

        assertThat(service.decideStatus(config, "1.0.0", 24))
                .isEqualTo(AppUpdateStatus.FORCE_UPDATE);
    }

    @Test
    void forceEnabled_doesNotBlockEveryoneWhenMinimumIsZero() {
        AppVersionConfig config = androidPolicy();
        config.setMinSupportedBuild(0);
        config.setMinSupportedVersion("0.0.0");

        assertThat(service.decideStatus(config, "1.1.0", 25))
                .isEqualTo(AppUpdateStatus.OPTIONAL_UPDATE);
    }

    // ── fallbacks ────────────────────────────────────────────────────────────

    @Test
    void withoutBuildNumbers_fallsBackToSemanticVersions() {
        AppVersionConfig config = androidPolicy();
        config.setLatestBuild(0);
        config.setMinSupportedBuild(0);

        assertThat(service.decideStatus(config, "1.0.9", null)).isEqualTo(AppUpdateStatus.FORCE_UPDATE);
        assertThat(service.decideStatus(config, "1.1.0", null)).isEqualTo(AppUpdateStatus.OPTIONAL_UPDATE);
        assertThat(service.decideStatus(config, "1.2.0", null)).isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    @Test
    void semanticFallback_comparesNumericallyNotLexicographically() {
        AppVersionConfig config = androidPolicy();
        config.setLatestBuild(0);
        config.setMinSupportedBuild(0);
        config.setLatestVersion("1.10.0");
        config.setMinSupportedVersion("1.9.0");

        assertThat(service.decideStatus(config, "1.9.5", null)).isEqualTo(AppUpdateStatus.OPTIONAL_UPDATE);
        assertThat(service.decideStatus(config, "1.10.0", null)).isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    @Test
    void unknownInstalledVersion_neverBlocksTheUser() {
        AppVersionConfig config = androidPolicy();
        config.setLatestBuild(0);
        config.setMinSupportedBuild(0);

        assertThat(service.decideStatus(config, null, null)).isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    @Test
    void buildZero_isStillComparedAgainstTheMinimum() {
        assertThat(service.decideStatus(androidPolicy(), "0.0.1", 0))
                .isEqualTo(AppUpdateStatus.FORCE_UPDATE);
    }

    // ── response shape ───────────────────────────────────────────────────────

    @Test
    void missingPlatformRow_returnsNonBlockingDefault() {
        when(repository.findByPlatform("android")).thenReturn(Optional.empty());

        AppVersionResponse response = service.getVersionInfo("android", "1.0.0", 1, "tr");

        assertThat(response.status()).isEqualTo(AppUpdateStatus.UP_TO_DATE);
        assertThat(response.forceUpdateEnabled()).isFalse();
    }

    @Test
    void response_resolvesTurkishCopyForTurkishLocale() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(androidPolicy()));

        AppVersionResponse response = service.getVersionInfo("android", "1.0.0", 24, "tr-TR");

        assertThat(response.title()).isEqualTo("Yeni sürüm");
        assertThat(response.message()).isEqualTo("Güncelle");
        assertThat(response.status()).isEqualTo(AppUpdateStatus.FORCE_UPDATE);
    }

    @Test
    void response_resolvesEnglishCopyForOtherLocales() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(androidPolicy()));

        AppVersionResponse response = service.getVersionInfo("android", "1.0.0", 24, "en-US");

        assertThat(response.title()).isEqualTo("New version");
        assertThat(response.message()).isEqualTo("Please update");
    }

    @Test
    void response_fallsBackToTheOtherLocaleWhenCopyIsMissing() {
        AppVersionConfig config = androidPolicy();
        config.setTitleEn(null);
        config.setMessageEn(null);
        when(repository.findByPlatform("android")).thenReturn(Optional.of(config));

        AppVersionResponse response = service.getVersionInfo("android", "1.0.0", 24, "en");

        assertThat(response.title()).isEqualTo("Yeni sürüm");
        assertThat(response.message()).isEqualTo("Güncelle");
    }

    @Test
    void response_fallsBackToLegacyMessageColumn() {
        AppVersionConfig config = androidPolicy();
        config.setMessageTr(null);
        config.setMessageEn(null);
        config.setMessage("Legacy copy");
        when(repository.findByPlatform("android")).thenReturn(Optional.of(config));

        assertThat(service.getVersionInfo("android", "1.0.0", 24, "tr").message())
                .isEqualTo("Legacy copy");
    }

    @Test
    void androidStoreUrl_prefersTheHttpsLinkAndKeepsMarketDeepLink() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(androidPolicy()));

        AppVersionResponse response = service.getVersionInfo("android", "1.0.0", 24, "tr");

        assertThat(response.storeUrl()).startsWith("https://play.google.com");
        assertThat(response.androidStoreUrl()).startsWith("market://");
    }

    @Test
    void iosStoreUrl_usesTheIosColumn() {
        AppVersionConfig config = AppVersionConfig.builder()
                .platform("ios")
                .latestVersion("1.2.0").latestBuild(27)
                .minSupportedVersion("1.1.0").minSupportedBuild(25)
                .forceUpdate(true).optionalUpdateEnabled(true)
                .iosStoreUrl("https://apps.apple.com/app/id123")
                .build();
        when(repository.findByPlatform("ios")).thenReturn(Optional.of(config));

        assertThat(service.getVersionInfo("ios", "1.0.0", 24, "tr").storeUrl())
                .isEqualTo("https://apps.apple.com/app/id123");
    }

    @Test
    void response_keepsLegacyFieldsForAlreadyShippedBuilds() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(androidPolicy()));

        AppVersionResponse response = service.getVersionInfo("android", null, null, null);

        assertThat(response.forceUpdate()).isTrue();
        assertThat(response.minSupportedVersion()).isEqualTo("1.1.0");
        assertThat(response.androidWebStoreUrl()).isNotBlank();
    }

    @Test
    void legacyCallWithoutInstalledVersion_isNeverForced() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(androidPolicy()));

        // Old clients still evaluate the policy themselves; the server must not guess for them.
        assertThat(service.getVersionInfo("android").status()).isEqualTo(AppUpdateStatus.UP_TO_DATE);
    }

    @Test
    void isSupportedPlatform_acceptsOnlyIosAndAndroid() {
        assertThat(service.isSupportedPlatform("ios")).isTrue();
        assertThat(service.isSupportedPlatform("ANDROID")).isTrue();
        assertThat(service.isSupportedPlatform("web")).isFalse();
        assertThat(service.isSupportedPlatform(null)).isFalse();
    }
}
