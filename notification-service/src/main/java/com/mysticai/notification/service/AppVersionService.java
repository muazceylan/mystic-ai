package com.mysticai.notification.service;

import com.mysticai.notification.dto.AppUpdateStatus;
import com.mysticai.notification.dto.AppVersionResponse;
import com.mysticai.notification.entity.AppVersionConfig;
import com.mysticai.notification.repository.AppVersionConfigRepository;
import com.mysticai.notification.util.SemanticVersions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Evaluates the admin-managed update policy against the build the caller actually has installed.
 *
 * <p>The backend owns the decision so the rules can change without shipping a new app build;
 * the client only reports what it is running.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppVersionService {

    private static final Set<String> SUPPORTED_PLATFORMS = Set.of("ios", "android");
    private static final String IOS = "ios";

    private final AppVersionConfigRepository repository;

    public boolean isSupportedPlatform(String platform) {
        return platform != null && SUPPORTED_PLATFORMS.contains(platform.toLowerCase());
    }

    /** Legacy entry point: no installed version reported, so only the raw policy is returned. */
    public AppVersionResponse getVersionInfo(String platform) {
        return getVersionInfo(platform, null, null, null);
    }

    public AppVersionResponse getVersionInfo(String platform,
                                             String installedVersion,
                                             Integer installedBuild,
                                             String locale) {
        String normalized = platform.toLowerCase();
        return repository.findByPlatform(normalized)
                .map(config -> toResponse(config, installedVersion, installedBuild, locale))
                .orElseGet(() -> AppVersionResponse.safeDefault(normalized));
    }

    /**
     * FORCE_UPDATE only when the force toggle is on <em>and</em> the installed build is below the
     * configured minimum — the toggle enables enforcement, it does not force everyone. A build
     * ahead of the configured latest (TestFlight, internal, staged rollout) stays UP_TO_DATE.
     */
    AppUpdateStatus decideStatus(AppVersionConfig config, String installedVersion, Integer installedBuild) {
        if (config.isForceUpdate()
                && isOlderThan(installedVersion, installedBuild,
                config.getMinSupportedVersion(), config.getMinSupportedBuild())) {
            return AppUpdateStatus.FORCE_UPDATE;
        }
        if (config.isOptionalUpdateEnabled()
                && isOlderThan(installedVersion, installedBuild,
                config.getLatestVersion(), config.getLatestBuild())) {
            return AppUpdateStatus.OPTIONAL_UPDATE;
        }
        return AppUpdateStatus.UP_TO_DATE;
    }

    /**
     * Build numbers are the primary signal — they are monotonic per platform and unambiguous.
     * Semantic versions are the fallback when either side has no usable build number, and an
     * unknown installed version is never treated as outdated.
     */
    private boolean isOlderThan(String installedVersion, Integer installedBuild,
                                String targetVersion, Integer targetBuild) {
        boolean buildsComparable = installedBuild != null && installedBuild >= 0
                && targetBuild != null && targetBuild > 0;
        if (buildsComparable) {
            return installedBuild < targetBuild;
        }
        if (installedVersion != null && !installedVersion.isBlank() && targetVersion != null) {
            return SemanticVersions.isOlder(installedVersion, targetVersion);
        }
        return false;
    }

    private AppVersionResponse toResponse(AppVersionConfig config,
                                          String installedVersion,
                                          Integer installedBuild,
                                          String locale) {
        AppUpdateStatus status = decideStatus(config, installedVersion, installedBuild);
        boolean turkish = isTurkish(locale);

        return new AppVersionResponse(
                config.getPlatform(),
                status,
                config.getLatestVersion(),
                nullSafeBuild(config.getLatestBuild()),
                config.getMinSupportedVersion(),
                nullSafeBuild(config.getMinSupportedBuild()),
                config.isForceUpdate(),
                config.isOptionalUpdateEnabled(),
                resolveStoreUrl(config),
                resolveTitle(config, turkish),
                resolveMessage(config, turkish),
                config.isForceUpdate(),
                config.getMinSupportedVersion(),
                config.getIosStoreUrl(),
                config.getAndroidStoreUrl(),
                config.getAndroidWebStoreUrl()
        );
    }

    /**
     * The canonical store link for the platform. Android keeps the {@code market://} deep link in
     * the legacy fields — the normalized value prefers the https link because it opens everywhere.
     */
    private String resolveStoreUrl(AppVersionConfig config) {
        if (IOS.equals(config.getPlatform())) {
            return config.getIosStoreUrl();
        }
        return config.getAndroidWebStoreUrl() != null && !config.getAndroidWebStoreUrl().isBlank()
                ? config.getAndroidWebStoreUrl()
                : config.getAndroidStoreUrl();
    }

    private String resolveTitle(AppVersionConfig config, boolean turkish) {
        return firstNonBlank(turkish ? config.getTitleTr() : config.getTitleEn(),
                turkish ? config.getTitleEn() : config.getTitleTr());
    }

    private String resolveMessage(AppVersionConfig config, boolean turkish) {
        return firstNonBlank(turkish ? config.getMessageTr() : config.getMessageEn(),
                turkish ? config.getMessageEn() : config.getMessageTr(),
                config.getMessage());
    }

    private boolean isTurkish(String locale) {
        return locale != null && locale.trim().toLowerCase().startsWith("tr");
    }

    private int nullSafeBuild(Integer build) {
        return build == null ? 0 : build;
    }

    private String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate;
            }
        }
        return null;
    }
}
