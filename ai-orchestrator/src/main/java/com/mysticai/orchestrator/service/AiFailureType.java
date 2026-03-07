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
    UNKNOWN
}
