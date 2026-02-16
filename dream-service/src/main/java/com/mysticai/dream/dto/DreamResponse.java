package com.mysticai.dream.dto;

import com.mysticai.dream.entity.Dream;

import java.time.LocalDateTime;

public record DreamResponse(
        Long id,
        String dreamText,
        String mood,
        LocalDateTime dreamDate,
        String interpretationStatus,
        String interpretation,
        LocalDateTime createdAt
) {
    public static DreamResponse from(Dream dream) {
        return new DreamResponse(
                dream.getId(),
                dream.getDreamText(),
                dream.getMood(),
                dream.getDreamDate().atStartOfDay(),
                dream.getInterpretationStatus() != null ? dream.getInterpretationStatus().name() : null,
                dream.getInterpretation(),
                dream.getCreatedAt()
        );
    }
}
