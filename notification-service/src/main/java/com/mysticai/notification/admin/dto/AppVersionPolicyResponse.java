package com.mysticai.notification.admin.dto;

import com.mysticai.notification.entity.AppVersionConfig;

import java.time.LocalDateTime;

/** Admin-facing view of one platform's update policy. */
public record AppVersionPolicyResponse(
        Long id,
        String platform,
        String latestVersion,
        Integer latestBuild,
        String minimumSupportedVersion,
        Integer minimumSupportedBuild,
        boolean forceUpdateEnabled,
        boolean optionalUpdateEnabled,
        String storeUrl,
        String androidStoreUrl,
        String titleTr,
        String messageTr,
        String titleEn,
        String messageEn,
        LocalDateTime updatedAt,
        Long updatedBy
) {
    public static AppVersionPolicyResponse from(AppVersionConfig config) {
        boolean ios = "ios".equals(config.getPlatform());
        return new AppVersionPolicyResponse(
                config.getId(),
                config.getPlatform(),
                config.getLatestVersion(),
                config.getLatestBuild() == null ? 0 : config.getLatestBuild(),
                config.getMinSupportedVersion(),
                config.getMinSupportedBuild() == null ? 0 : config.getMinSupportedBuild(),
                config.isForceUpdate(),
                config.isOptionalUpdateEnabled(),
                ios ? config.getIosStoreUrl() : config.getAndroidWebStoreUrl(),
                ios ? null : config.getAndroidStoreUrl(),
                config.getTitleTr(),
                config.getMessageTr(),
                config.getTitleEn(),
                config.getMessageEn(),
                config.getUpdatedAt(),
                config.getUpdatedBy()
        );
    }
}
