package com.mysticai.orchestrator.service;

import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;

import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.SocketTimeoutException;
import java.util.Locale;
import java.util.concurrent.TimeoutException;

@Component
public class FailureClassifier {

    public AiFailureType classify(Throwable throwable) {
        if (throwable == null) {
            return AiFailureType.UNKNOWN;
        }

        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ProviderCallException pce && pce.getFailureType() != null
                    && pce.getFailureType() != AiFailureType.UNKNOWN) {
                return pce.getFailureType();
            }

            AiFailureType fromStatus = classifyFromHttpStatus(current);
            if (fromStatus != null) {
                return fromStatus;
            }

            AiFailureType fromMessage = classifyFromMessage(current.getMessage());
            if (fromMessage != null) {
                return fromMessage;
            }

            if (current instanceof SocketTimeoutException
                    || current instanceof TimeoutException
                    || current.getClass().getSimpleName().toLowerCase(Locale.ROOT).contains("timeout")) {
                return AiFailureType.TIMEOUT;
            }

            if (current instanceof ConnectException
                    || current instanceof NoRouteToHostException
                    || current.getClass().getSimpleName().toLowerCase(Locale.ROOT).contains("connectexception")) {
                return AiFailureType.CONNECTION_ERROR;
            }

            current = current.getCause();
        }

        return AiFailureType.UNKNOWN;
    }

    public boolean isRetryable(AiFailureType failureType) {
        return failureType == AiFailureType.TIMEOUT
                || failureType == AiFailureType.SERVER_ERROR
                || failureType == AiFailureType.CONNECTION_ERROR;
    }

    private AiFailureType classifyFromHttpStatus(Throwable throwable) {
        if (!(throwable instanceof RestClientResponseException ex)) {
            return null;
        }

        HttpStatusCode statusCode = ex.getStatusCode();
        int code = statusCode.value();

        if (code == 429) {
            return AiFailureType.RATE_LIMIT;
        }
        if (code == 401 || code == 403) {
            return AiFailureType.AUTH_ERROR;
        }
        if (code == 404) {
            return AiFailureType.MODEL_NOT_FOUND;
        }
        if (code == 400) {
            return AiFailureType.BAD_REQUEST;
        }
        if (code >= 500) {
            return AiFailureType.SERVER_ERROR;
        }
        return null;
    }

    private AiFailureType classifyFromMessage(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String lower = message.toLowerCase(Locale.ROOT);

        if (containsAny(lower,
                "error while extracting response",
                "application/octet-stream",
                "json parse",
                "cannot deserialize",
                "httpmessageconverter",
                "failed to read response")) {
            return AiFailureType.RESPONSE_PARSE_ERROR;
        }

        if (containsAny(lower, "empty response", "empty content", "empty body", "blank response")) {
            return AiFailureType.EMPTY_RESPONSE;
        }

        if (containsAny(lower, "model_decommissioned", "decommissioned and is no longer supported", "decommissioned")) {
            return AiFailureType.MODEL_DECOMMISSIONED;
        }

        if (containsAny(lower,
                "models/", " is not found", "model not found", "not supported for generatecontent", "404")) {
            return AiFailureType.MODEL_NOT_FOUND;
        }

        if (containsAny(lower, "429", "rate_limit", "quota", "resource_exhausted", "too many")) {
            return AiFailureType.RATE_LIMIT;
        }

        if (containsAny(lower,
                "connection refused",
                "failed to connect",
                "connectexception",
                "localhost:11434",
                "connection reset",
                "no route to host")) {
            return AiFailureType.CONNECTION_ERROR;
        }

        if (containsAny(lower, "timeout", "sockettimeout")) {
            return AiFailureType.TIMEOUT;
        }

        if (containsAny(lower, "unauthorized", "forbidden")) {
            return AiFailureType.AUTH_ERROR;
        }

        if (lower.contains("400") || lower.contains("bad request")) {
            return AiFailureType.BAD_REQUEST;
        }

        if (lower.contains("500") || lower.contains("server error") || lower.contains("internal error")) {
            return AiFailureType.SERVER_ERROR;
        }

        return null;
    }

    private boolean containsAny(String value, String... patterns) {
        for (String pattern : patterns) {
            if (value.contains(pattern)) {
                return true;
            }
        }
        return false;
    }
}
