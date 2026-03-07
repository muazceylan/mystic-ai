package com.mysticai.orchestrator.service;

public class ProviderCallException extends RuntimeException {

    private final AiFailureType failureType;
    private final Integer statusCode;
    private final String contentType;
    private final String rawSnippet;

    public ProviderCallException(
            String message,
            AiFailureType failureType,
            Integer statusCode,
            String contentType,
            String rawSnippet,
            Throwable cause
    ) {
        super(message, cause);
        this.failureType = failureType;
        this.statusCode = statusCode;
        this.contentType = contentType;
        this.rawSnippet = rawSnippet;
    }

    public AiFailureType getFailureType() {
        return failureType;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public String getContentType() {
        return contentType;
    }

    public String getRawSnippet() {
        return rawSnippet;
    }
}
