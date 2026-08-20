package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.dto.AppVersionPolicyRequest;
import com.mysticai.notification.admin.dto.AppVersionPolicyResponse;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppVersionConfig;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AppVersionConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppVersionPolicyServiceTest {

    @Mock AppVersionConfigRepository repository;
    @Mock AuditLogService auditLogService;

    @InjectMocks AppVersionPolicyService service;

    private static final Long ADMIN_ID = 7L;
    private static final String ADMIN_EMAIL = "admin@mysticai.com";
    private static final AdminUser.Role ROLE = AdminUser.Role.SUPER_ADMIN;

    private static final String PLAY_URL =
            "https://play.google.com/store/apps/details?id=com.astroguru.mmc";

    private AppVersionPolicyRequest request(String latestVersion, int latestBuild,
                                            String minVersion, int minBuild,
                                            boolean force, boolean optional) {
        return new AppVersionPolicyRequest(latestVersion, latestBuild, minVersion, minBuild,
                force, optional, PLAY_URL, "market://details?id=com.astroguru.mmc",
                "Yeni sürüm", "Güncelle", "New version", "Please update");
    }

    private AppVersionConfig existing(int minBuild, boolean force) {
        return AppVersionConfig.builder()
                .id(1L).platform("android")
                .latestVersion("1.1.0").latestBuild(25)
                .minSupportedVersion("1.0.0").minSupportedBuild(minBuild)
                .forceUpdate(force).optionalUpdateEnabled(true)
                .build();
    }

    // ── validation ───────────────────────────────────────────────────────────

    @Test
    void upsert_rejectsMinimumBuildAboveLatestBuild() {
        assertThatThrownBy(() -> service.upsert("android",
                request("1.2.0", 25, "1.1.0", 27, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minimumSupportedBuild");

        verify(repository, never()).save(any());
    }

    @Test
    void upsert_rejectsMinimumVersionNewerThanLatestVersion() {
        assertThatThrownBy(() -> service.upsert("android",
                request("1.1.0", 27, "1.2.0", 25, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minimumSupportedVersion");
    }

    @Test
    void upsert_rejectsMalformedSemanticVersion() {
        assertThatThrownBy(() -> service.upsert("android",
                request("v1.2", 27, "1.1.0", 25, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("semantic version");
    }

    @Test
    void upsert_rejectsForceUpdateWithoutStoreUrl() {
        AppVersionPolicyRequest noStore = new AppVersionPolicyRequest(
                "1.2.0", 27, "1.1.0", 25, true, true, "  ", null,
                null, null, null, null);

        assertThatThrownBy(() -> service.upsert("android", noStore, ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("storeUrl");
    }

    @Test
    void upsert_rejectsUnsupportedPlatform() {
        assertThatThrownBy(() -> service.upsert("web",
                request("1.2.0", 27, "1.1.0", 25, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported platform");
    }

    @Test
    void upsert_allowsEqualMinimumAndLatestBuild() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(existing(20, true)));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppVersionPolicyResponse saved = service.upsert("android",
                request("1.2.0", 27, "1.2.0", 27, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(saved.minimumSupportedBuild()).isEqualTo(27);
    }

    // ── persistence ──────────────────────────────────────────────────────────

    @Test
    void upsert_writesEveryPolicyFieldAndTheActor() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(existing(20, false)));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.upsert("android", request("1.2.0", 27, "1.1.0", 25, true, false),
                ADMIN_ID, ADMIN_EMAIL, ROLE);

        ArgumentCaptor<AppVersionConfig> captor = ArgumentCaptor.forClass(AppVersionConfig.class);
        verify(repository).save(captor.capture());
        AppVersionConfig saved = captor.getValue();

        assertThat(saved.getLatestVersion()).isEqualTo("1.2.0");
        assertThat(saved.getLatestBuild()).isEqualTo(27);
        assertThat(saved.getMinSupportedVersion()).isEqualTo("1.1.0");
        assertThat(saved.getMinSupportedBuild()).isEqualTo(25);
        assertThat(saved.isForceUpdate()).isTrue();
        assertThat(saved.isOptionalUpdateEnabled()).isFalse();
        assertThat(saved.getAndroidWebStoreUrl()).isEqualTo(PLAY_URL);
        assertThat(saved.getAndroidStoreUrl()).startsWith("market://");
        assertThat(saved.getTitleTr()).isEqualTo("Yeni sürüm");
        assertThat(saved.getMessageEn()).isEqualTo("Please update");
        assertThat(saved.getUpdatedBy()).isEqualTo(ADMIN_ID);
    }

    @Test
    void upsert_routesStoreUrlToTheIosColumnForIos() {
        when(repository.findByPlatform("ios")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppVersionPolicyRequest iosRequest = new AppVersionPolicyRequest(
                "1.2.0", 27, "1.1.0", 25, true, true,
                "https://apps.apple.com/app/id123", null,
                "Yeni sürüm", "Güncelle", "New version", "Please update");

        service.upsert("ios", iosRequest, ADMIN_ID, ADMIN_EMAIL, ROLE);

        ArgumentCaptor<AppVersionConfig> captor = ArgumentCaptor.forClass(AppVersionConfig.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getIosStoreUrl()).isEqualTo("https://apps.apple.com/app/id123");
        assertThat(captor.getValue().getAndroidWebStoreUrl()).isNull();
    }

    @Test
    void upsert_createsTheRowWhenAPlatformHasNoPolicyYet() {
        when(repository.findByPlatform("android")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppVersionPolicyResponse saved = service.upsert("android",
                request("1.2.0", 27, "1.1.0", 25, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(saved.platform()).isEqualTo("android");
        assertThat(saved.latestBuild()).isEqualTo(27);
    }

    // ── audit ────────────────────────────────────────────────────────────────

    @Test
    void upsert_auditsBothTheOldAndNewPolicy() {
        when(repository.findByPlatform("android")).thenReturn(Optional.of(existing(20, true)));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.upsert("android", request("1.2.0", 27, "1.1.0", 25, true, true),
                ADMIN_ID, ADMIN_EMAIL, ROLE);

        ArgumentCaptor<Object> before = ArgumentCaptor.forClass(Object.class);
        ArgumentCaptor<Object> after = ArgumentCaptor.forClass(Object.class);
        verify(auditLogService).log(eq(ADMIN_ID), eq(ADMIN_EMAIL), eq(ROLE),
                eq(AuditLog.ActionType.APP_VERSION_POLICY_UPDATED),
                eq(AuditLog.EntityType.APP_VERSION_CONFIG),
                eq("1"), eq("android"), before.capture(), after.capture());

        assertThat(((AppVersionPolicyResponse) before.getValue()).minimumSupportedBuild()).isEqualTo(20);
        assertThat(((AppVersionPolicyResponse) after.getValue()).minimumSupportedBuild()).isEqualTo(25);
    }

    // ── reads ────────────────────────────────────────────────────────────────

    @Test
    void findByPlatform_returnsANonBlockingDefaultWhenNoRowExists() {
        when(repository.findByPlatform("ios")).thenReturn(Optional.empty());

        AppVersionPolicyResponse policy = service.findByPlatform("ios");

        assertThat(policy.platform()).isEqualTo("ios");
        assertThat(policy.forceUpdateEnabled()).isFalse();
        assertThat(policy.latestBuild()).isZero();
    }

    @Test
    void findAll_returnsBothPlatforms() {
        when(repository.findByPlatform(anyString())).thenReturn(Optional.empty());

        assertThat(service.findAll())
                .extracting(AppVersionPolicyResponse::platform)
                .containsExactly("android", "ios");
    }
}
