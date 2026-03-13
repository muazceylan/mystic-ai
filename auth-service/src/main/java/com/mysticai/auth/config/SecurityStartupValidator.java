package com.mysticai.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SecurityStartupValidator implements ApplicationRunner {

    private static final String LOCAL_PROFILE = "local";
    private static final String DEFAULT_JWT_SECRET = "bXlzdGljLWFpLXNlY3JldC1rZXktZm9yLWp3dC10b2tlbi1nZW5lcmF0aW9uLW11c3QtYmUtYXQtbGVhc3QtMjU2LWJpdHM=";
    private static final String DEFAULT_VERIFICATION_PEPPER = "change-me-dev-pepper";
    private static final String DEFAULT_PASSWORD_RESET_PEPPER = "change-me-password-reset-pepper";

    private final Environment environment;

    @Value("${ENV:prod}")
    private String deploymentEnv;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${auth.verification.token-pepper}")
    private String verificationPepper;

    @Value("${auth.password-reset.token-pepper}")
    private String passwordResetPepper;

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

        requireConfigured(jwtSecret, DEFAULT_JWT_SECRET,
                "JWT_SECRET must be set to a non-default value outside local environment.");
        requireConfigured(verificationPepper, DEFAULT_VERIFICATION_PEPPER,
                "VERIFICATION_TOKEN_PEPPER must be set to a non-default value outside local environment.");
        requireConfigured(passwordResetPepper, DEFAULT_PASSWORD_RESET_PEPPER,
                "PASSWORD_RESET_TOKEN_PEPPER must be set to a non-default value outside local environment.");

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

    private void requireConfigured(String value, String disallowed, String message) {
        String normalized = normalize(value);
        if (normalized.isBlank() || disallowed.equals(normalized)) {
            throw new IllegalStateException(message);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
