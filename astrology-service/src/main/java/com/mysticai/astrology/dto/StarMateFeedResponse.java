package com.mysticai.astrology.dto;

import java.util.List;

public record StarMateFeedResponse(
        List<StarMateFeedCandidateResponse> items,
        String queueStatus,
        int returnedCount,
        int warmingCandidates
) {}
