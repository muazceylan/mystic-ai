package com.mysticai.notification.service.billing;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * RevenueCat webhook configuration.
 *
 * <p>Bind to {@code revenuecat.webhook.*} in {@code application.yml}. The
 * shared secret is required in any non-local profile; without it the webhook
 * controller refuses every request rather than silently accepting unsigned
 * payloads.
 */
@Data
@Component
@ConfigurationProperties(prefix = "revenuecat.webhook")
public class RevenueCatWebhookProperties {

    /**
     * Shared secret RevenueCat sends as
     * {@code Authorization: Bearer <secret>} on every webhook delivery.
     * Empty in local dev; in any other profile {@code allowEmptySecret}
     * must be explicitly true to accept unsigned requests.
     */
    private String secret = "";

    /**
     * Maximum bytes of raw payload to persist in {@code purchase_event.raw_payload}.
     * Anything larger is truncated; we never need the full payload for support
     * and storing it bloats the table.
     */
    private int maxRawPayloadBytes = 8192;

    /**
     * When true and {@link #secret} is empty, the webhook controller still
     * accepts requests. Use only for local development.
     */
    private boolean allowEmptySecret = false;
}
