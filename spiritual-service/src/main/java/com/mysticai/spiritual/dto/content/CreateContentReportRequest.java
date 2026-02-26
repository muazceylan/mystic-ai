package com.mysticai.spiritual.dto.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateContentReportRequest(
        @NotBlank @Pattern(regexp = "PRAYER|ASMA|MEDITATION") String contentType,
        @NotNull Long contentId,
        @NotBlank @Size(max = 64) String reason,
        @Size(max = 1000) String note
) {
}

