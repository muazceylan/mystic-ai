package com.mysticai.notification.dto;

/**
 * Public app-version check response.
 *
 * <p>The first block is the normalized decision consumed by current app builds. The trailing
 * {@code forceUpdate} / {@code minSupportedVersion} / {@code *StoreUrl} fields are the original
 * contract and are still populated so already-shipped builds keep working unchanged.
 */
public record AppVersionResponse(
        String platform,
        AppUpdateStatus status,
        String latestVersion,
        Integer latestBuild,
        String minimumSupportedVersion,
        Integer minimumSupportedBuild,
        boolean forceUpdateEnabled,
        boolean optionalUpdateEnabled,
        String storeUrl,
        String title,
        String message,
        // ── legacy fields (pre-build-number clients) ──────────────────────────
        boolean forceUpdate,
        String minSupportedVersion,
        String iosStoreUrl,
        String androidStoreUrl,
        String androidWebStoreUrl
) {
    /**
     * Safe default returned when no config row exists for the requested platform.
     * Never blocks the user — a missing policy must not become an outage.
     */
    public static AppVersionResponse safeDefault(String platform) {
        return new AppVersionResponse(
                platform,
                AppUpdateStatus.UP_TO_DATE,
                "0.0.0",
                0,
                "0.0.0",
                0,
                false,
                false,
                null,
                null,
                null,
                false,
                "0.0.0",
                null,
                null,
                null
        );
    }
}
