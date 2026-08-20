package com.mysticai.notification.admin.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Admin upsert payload for one platform's update policy.
 *
 * <p>Cross-field rules (minimum &lt;= latest) live in the service so the same guard applies to
 * every caller, not only to requests that happen to go through this DTO.
 */
public record AppVersionPolicyRequest(

        @NotBlank(message = "latestVersion is required")
        @Size(max = 20, message = "latestVersion must be at most 20 characters")
        String latestVersion,

        @NotNull(message = "latestBuild is required")
        @Min(value = 0, message = "latestBuild must be zero or greater")
        Integer latestBuild,

        @NotBlank(message = "minimumSupportedVersion is required")
        @Size(max = 20, message = "minimumSupportedVersion must be at most 20 characters")
        String minimumSupportedVersion,

        @NotNull(message = "minimumSupportedBuild is required")
        @Min(value = 0, message = "minimumSupportedBuild must be zero or greater")
        Integer minimumSupportedBuild,

        boolean forceUpdateEnabled,

        boolean optionalUpdateEnabled,

        /** Canonical https store link. Android also keeps a market:// deep link, see below. */
        String storeUrl,

        /** Android only — optional market:// deep link tried before {@link #storeUrl}. */
        String androidStoreUrl,

        @Size(max = 200, message = "titleTr must be at most 200 characters")
        String titleTr,

        String messageTr,

        @Size(max = 200, message = "titleEn must be at most 200 characters")
        String titleEn,

        String messageEn
) {
}
