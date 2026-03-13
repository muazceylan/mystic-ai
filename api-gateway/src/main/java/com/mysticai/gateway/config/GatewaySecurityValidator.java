package com.mysticai.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class GatewaySecurityValidator implements ApplicationRunner {

    private static final String LOCAL_PROFILE = "local";
    private static final String DEFAULT_INTERNAL_GATEWAY_KEY = "local-dev-internal-gateway-key-change-me";
    private static final String DEFAULT_JWT_SECRET = "bXlzdGljLWFpLXNlY3JldC1rZXktZm9yLWp3dC10b2tlbi1nZW5lcmF0aW9uLW11c3QtYmUtYXQtbGVhc3QtMjU2LWJpdHM=";

    private final Environment environment;

    @Value("${gateway.auth.permit-all:false}")
    private boolean permitAll;

    @Value("${gateway.internal.key}")
    private String internalGatewayKey;

    @Value("${gateway.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Value("${gateway.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${jwt.secret}")
    private String jwtSecret;

    public GatewaySecurityValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean localProfileActive = Arrays.asList(environment.getActiveProfiles()).contains(LOCAL_PROFILE);
        List<String> normalizedOrigins = (allowedOrigins == null ? List.<String>of() : allowedOrigins).stream()
                .map(origin -> origin == null ? "" : origin.trim())
                .filter(origin -> !origin.isEmpty())
                .toList();

        if (permitAll && !localProfileActive) {
            throw new IllegalStateException(
                    "gateway.auth.permit-all=true is allowed only when the 'local' profile is active."
            );
        }

        if (!localProfileActive && (internalGatewayKey == null
                || internalGatewayKey.isBlank()
                || DEFAULT_INTERNAL_GATEWAY_KEY.equals(internalGatewayKey))) {
            throw new IllegalStateException(
                    "INTERNAL_GATEWAY_KEY must be set to a non-default value outside local profile."
            );
        }

        if (!localProfileActive && (jwtSecret == null
                || jwtSecret.isBlank()
                || DEFAULT_JWT_SECRET.equals(jwtSecret))) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set to a non-default value outside local profile."
            );
        }

        if (normalizedOrigins.isEmpty()) {
            throw new IllegalStateException("gateway.cors.allowed-origins must not be empty.");
        }

        if (allowCredentials && normalizedOrigins.stream().anyMatch(this::isWildcardOrigin)) {
            throw new IllegalStateException(
                    "Wildcard CORS origins are not allowed when credentials are enabled."
            );
        }
    }

    private boolean isWildcardOrigin(String origin) {
        return origin != null && origin.trim().contains("*");
    }
}
