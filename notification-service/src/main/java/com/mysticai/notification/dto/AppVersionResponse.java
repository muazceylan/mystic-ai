package com.mysticai.notification.dto;

public record AppVersionResponse(
        String platform,
        boolean forceUpdate,
        String minSupportedVersion,
        String latestVersion,
        String message,
        String iosStoreUrl,
        String androidStoreUrl,
        String androidWebStoreUrl
) {
    /** Safe default returned when no config row is found for the requested platform. */
    public static AppVersionResponse safeDefault(String platform) {
        return new AppVersionResponse(
                platform,
                false,
                "0.0.0",
                "0.0.0",
                null,
                null,
                null,
                null
        );
    }
}
