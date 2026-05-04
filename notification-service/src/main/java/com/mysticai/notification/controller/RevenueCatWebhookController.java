package com.mysticai.notification.controller;

import com.mysticai.notification.service.billing.RevenueCatWebhookService;
import com.mysticai.notification.service.billing.RevenueCatWebhookService.DispatchResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * RevenueCat webhook receiver.
 *
 * Auth: shared {@code Authorization: Bearer <secret>} header validated by
 * {@link RevenueCatWebhookService#isAuthorized}. The endpoint is wired as
 * {@code permitAll} in AdminSecurityConfig and added to the gateway's
 * PUBLIC_PATHS so RevenueCat's IPs do not need to authenticate via JWT.
 *
 * Behaviour:
 *   - Invalid secret → 401, no payload persisted.
 *   - Valid secret + duplicate event → 200 {received:true, status:DUPLICATE}.
 *   - Valid secret + processable event → 200 {received:true, status:PROCESSED|IGNORED|FAILED}.
 *
 * We always return 200 for business validation failures so RevenueCat does
 * not retry them indefinitely; only transient infra errors bubble up as 5xx.
 */
@RestController
@RequestMapping("/api/webhooks/revenuecat")
@RequiredArgsConstructor
@Slf4j
public class RevenueCatWebhookController {

    private final RevenueCatWebhookService webhookService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<WebhookResponse> receive(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody String payload) {

        if (!webhookService.isAuthorized(authorization)) {
            // Don't echo what the caller sent; this also avoids logging
            // partial secrets if a misconfigured caller leaks one.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new WebhookResponse(false, "UNAUTHORIZED"));
        }

        if (payload == null || payload.isBlank()) {
            return ResponseEntity.ok(new WebhookResponse(true, "IGNORED"));
        }

        DispatchResult result = webhookService.process(payload);
        return ResponseEntity.ok(new WebhookResponse(true, result.name()));
    }

    public record WebhookResponse(boolean received, String status) {}
}
