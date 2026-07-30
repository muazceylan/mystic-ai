package com.mysticai.orchestrator.service;

public enum AiFailureType {
    RATE_LIMIT,
    CONNECTION_ERROR,
    TIMEOUT,
    RESPONSE_PARSE_ERROR,
    MODEL_NOT_FOUND,
    MODEL_DECOMMISSIONED,
    AUTH_ERROR,
    BAD_REQUEST,
    SERVER_ERROR,
    EMPTY_RESPONSE,
    /** finish_reason=length with no usable content at all (distinct from EMPTY_RESPONSE so it does NOT trigger the same-provider single retry in AiFallbackService). */
    INCOMPLETE_RESPONSE,
    /** Provider is enabled but has no API key configured locally; a local config problem, not a remote auth rejection. No cooldown needed (the check is free), not retryable, falls through to the next provider. */
    MISSING_CREDENTIAL,
    UNKNOWN
}
