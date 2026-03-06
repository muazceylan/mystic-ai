package com.mysticai.auth.config.properties;

import java.util.Locale;

public enum DeploymentEnv {
    LOCAL,
    STAGING,
    PROD;

    public static DeploymentEnv from(String value) {
        if (value == null) {
            return LOCAL;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "prod", "production" -> PROD;
            case "staging", "stage" -> STAGING;
            default -> LOCAL;
        };
    }
}
