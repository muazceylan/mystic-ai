package com.mysticai.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class MonetizationSignupBonusClient {

    private static final String INTERNAL_SERVICE_HEADER = "X-Internal-Service-Key";

    @Qualifier("notificationRestTemplate")
    private final RestTemplate notificationRestTemplate;

    @Value("${services.notification.base-url:http://localhost:8088}")
    private String notificationServiceBaseUrl;

    @Value("${services.notification.internal-key:local-dev-internal-gateway-key-change-me}")
    private String internalServiceKey;

    public SignupBonusResponse grantSignupBonus(Long userId, String registrationSource, String locale) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(INTERNAL_SERVICE_HEADER, internalServiceKey);

        HttpEntity<SignupBonusGrantRequest> entity = new HttpEntity<>(
                new SignupBonusGrantRequest(userId, registrationSource, "AUTH_SERVICE", locale),
                headers
        );

        ResponseEntity<SignupBonusResponse> response = notificationRestTemplate.exchange(
                notificationServiceBaseUrl + "/api/v1/monetization/internal/signup-bonus",
                HttpMethod.POST,
                entity,
                SignupBonusResponse.class
        );

        SignupBonusResponse body = response.getBody();
        log.info("Signup bonus request sent: userId={}, registrationSource={}, status={}",
                userId,
                registrationSource,
                body != null ? body.status() : "empty_response");
        return body;
    }

    public record SignupBonusGrantRequest(
            Long userId,
            String registrationSource,
            String platform,
            String locale
    ) {}

    public record SignupBonusResponse(
            boolean granted,
            boolean enabled,
            int amountGranted,
            int currentBalance,
            String status,
            String ledgerReason,
            String registrationSource
    ) {}
}
