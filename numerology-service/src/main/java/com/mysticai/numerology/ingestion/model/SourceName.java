package com.mysticai.numerology.ingestion.model;

public enum SourceName {
    BEBEKISMI("bebekismi", "https://bebekismi.com"),
    SFK_ISTANBUL_EDU("sfk_istanbul_edu", "https://sfk.istanbul.edu.tr"),
    ALFABETIK("alfabetik", "https://alfabetik.net.tr"),
    UFUK("ufuk", "https://sertifika.ufuk.edu.tr");

    private final String configKey;
    private final String baseUrl;

    SourceName(String configKey, String baseUrl) {
        this.configKey = configKey;
        this.baseUrl = baseUrl;
    }

    public String getConfigKey() {
        return configKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public static SourceName fromNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toLowerCase();
        for (SourceName sourceName : values()) {
            if (sourceName.name().equalsIgnoreCase(value)
                    || sourceName.configKey.equalsIgnoreCase(normalized)) {
                return sourceName;
            }
        }
        throw new IllegalArgumentException("Unknown source: " + value);
    }
}
