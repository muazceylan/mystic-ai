package com.mysticai.spiritual.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SecurityStartupValidator implements ApplicationRunner {

    private static final String LOCAL_PROFILE = "local";
    private static final String DEFAULT_INTERNAL_GATEWAY_KEY = "local-dev-internal-gateway-key-change-me";

    private final Environment environment;

    @Value("${ENV:prod}")
    private String deploymentEnv;

    @Value("${internal.gateway.key}")
    private String internalGatewayKey;

    @Value("${spring.jpa.hibernate.ddl-auto:}")
    private String ddlAuto;

    public SecurityStartupValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isLocalEnvironment()) {
            return;
        }

        String normalizedKey = normalize(internalGatewayKey);
        if (normalizedKey.isBlank() || DEFAULT_INTERNAL_GATEWAY_KEY.equals(normalizedKey)) {
            throw new IllegalStateException(
                    "INTERNAL_GATEWAY_KEY must be set to a non-default value outside local environment."
            );
        }

        if (!"validate".equalsIgnoreCase(normalize(ddlAuto))) {
            throw new IllegalStateException(
                    "spring.jpa.hibernate.ddl-auto must be 'validate' outside local environment."
            );
        }
    }

    private boolean isLocalEnvironment() {
        boolean localProfileActive = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(LOCAL_PROFILE::equalsIgnoreCase);
        return localProfileActive || "local".equalsIgnoreCase(normalize(deploymentEnv));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
