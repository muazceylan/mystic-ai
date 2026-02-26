package com.mysticai.spiritual.dto.content;

import java.time.LocalDateTime;

public record ContentReportResponse(
        Long id,
        Long userId,
        String contentType,
        Long contentId,
        String reason,
        String note,
        String status,
        LocalDateTime createdAt
) {
}

