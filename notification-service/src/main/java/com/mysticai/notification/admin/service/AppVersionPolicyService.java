package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.dto.AppVersionPolicyRequest;
import com.mysticai.notification.admin.dto.AppVersionPolicyResponse;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppVersionConfig;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AppVersionConfigRepository;
import com.mysticai.notification.util.SemanticVersions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Admin management of the mobile update policy.
 *
 * <p>Every change is audited: raising {@code minimumSupportedBuild} with force update on locks
 * production users out of the app immediately, so the before/after values must stay traceable.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppVersionPolicyService {

    private static final Set<String> SUPPORTED_PLATFORMS = Set.of("ios", "android");
    private static final String IOS = "ios";

    private final AppVersionConfigRepository repository;
    private final AuditLogService auditLogService;

    public List<AppVersionPolicyResponse> findAll() {
        return SUPPORTED_PLATFORMS.stream()
                .sorted()
                .map(this::findByPlatform)
                .toList();
    }

    /** Returns an unsaved default when a platform has no row yet, so the admin form always renders. */
    public AppVersionPolicyResponse findByPlatform(String platform) {
        String normalized = normalizePlatform(platform);
        return repository.findByPlatform(normalized)
                .map(AppVersionPolicyResponse::from)
                .orElseGet(() -> AppVersionPolicyResponse.from(emptyConfig(normalized)));
    }

    @Transactional
    public AppVersionPolicyResponse upsert(String platform, AppVersionPolicyRequest request,
                                           Long adminId, String adminEmail, AdminUser.Role role) {
        String normalized = normalizePlatform(platform);
        validate(request);

        AppVersionConfig existing = repository.findByPlatform(normalized).orElse(null);
        AppVersionPolicyResponse before = existing == null ? null : AppVersionPolicyResponse.from(existing);
        AppVersionConfig config = existing == null ? emptyConfig(normalized) : existing;

        config.setLatestVersion(request.latestVersion().trim());
        config.setLatestBuild(request.latestBuild());
        config.setMinSupportedVersion(request.minimumSupportedVersion().trim());
        config.setMinSupportedBuild(request.minimumSupportedBuild());
        config.setForceUpdate(request.forceUpdateEnabled());
        config.setOptionalUpdateEnabled(request.optionalUpdateEnabled());
        config.setTitleTr(trimToNull(request.titleTr()));
        config.setMessageTr(trimToNull(request.messageTr()));
        config.setTitleEn(trimToNull(request.titleEn()));
        config.setMessageEn(trimToNull(request.messageEn()));
        config.setUpdatedBy(adminId);
        applyStoreUrls(config, normalized, request);

        AppVersionConfig saved = repository.save(config);
        AppVersionPolicyResponse after = AppVersionPolicyResponse.from(saved);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.APP_VERSION_POLICY_UPDATED,
                AuditLog.EntityType.APP_VERSION_CONFIG,
                saved.getId() == null ? normalized : saved.getId().toString(),
                normalized,
                before, after);

        if (raisesMinimumBuild(before, after) && after.forceUpdateEnabled()) {
            log.warn("[APP_VERSION] {} minimum supported build raised {} → {} with force update ON by admin {}; "
                            + "installed builds below {} are now blocked",
                    normalized,
                    before == null ? 0 : before.minimumSupportedBuild(),
                    after.minimumSupportedBuild(), adminEmail, after.minimumSupportedBuild());
        }
        return after;
    }

    /**
     * A minimum above the latest build would lock out every user including those on the newest
     * store release, so it is rejected outright rather than merely warned about.
     */
    private void validate(AppVersionPolicyRequest request) {
        if (!SemanticVersions.isValid(request.latestVersion())) {
            throw new IllegalArgumentException(
                    "latestVersion must be a semantic version such as 1.2.0: " + request.latestVersion());
        }
        if (!SemanticVersions.isValid(request.minimumSupportedVersion())) {
            throw new IllegalArgumentException(
                    "minimumSupportedVersion must be a semantic version such as 1.1.0: "
                            + request.minimumSupportedVersion());
        }
        if (request.minimumSupportedBuild() > request.latestBuild()) {
            throw new IllegalArgumentException(
                    "minimumSupportedBuild (" + request.minimumSupportedBuild()
                            + ") cannot be greater than latestBuild (" + request.latestBuild() + ")");
        }
        if (SemanticVersions.compare(request.minimumSupportedVersion(), request.latestVersion()) > 0) {
            throw new IllegalArgumentException(
                    "minimumSupportedVersion (" + request.minimumSupportedVersion()
                            + ") cannot be newer than latestVersion (" + request.latestVersion() + ")");
        }
        if (request.forceUpdateEnabled() && isBlank(request.storeUrl())) {
            throw new IllegalArgumentException(
                    "storeUrl is required when force update is enabled — users need somewhere to go");
        }
    }

    private void applyStoreUrls(AppVersionConfig config, String platform, AppVersionPolicyRequest request) {
        String storeUrl = trimToNull(request.storeUrl());
        if (IOS.equals(platform)) {
            config.setIosStoreUrl(storeUrl);
        } else {
            config.setAndroidWebStoreUrl(storeUrl);
            config.setAndroidStoreUrl(trimToNull(request.androidStoreUrl()));
        }
    }

    private boolean raisesMinimumBuild(AppVersionPolicyResponse before, AppVersionPolicyResponse after) {
        int previous = before == null ? 0 : before.minimumSupportedBuild();
        return after.minimumSupportedBuild() > previous;
    }

    private String normalizePlatform(String platform) {
        String normalized = platform == null ? "" : platform.trim().toLowerCase();
        if (!SUPPORTED_PLATFORMS.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported platform. Accepted values: ios, android");
        }
        return normalized;
    }

    private AppVersionConfig emptyConfig(String platform) {
        return AppVersionConfig.builder()
                .platform(platform)
                .latestVersion("0.0.0")
                .latestBuild(0)
                .minSupportedVersion("0.0.0")
                .minSupportedBuild(0)
                .forceUpdate(false)
                .optionalUpdateEnabled(true)
                .build();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
