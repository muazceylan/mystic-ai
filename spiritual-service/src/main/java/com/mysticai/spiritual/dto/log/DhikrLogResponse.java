package com.mysticai.spiritual.dto.log;

import com.mysticai.spiritual.entity.DhikrEntry;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DhikrLogResponse(
        Long id,
        Long userId,
        LocalDate date,
        String entryType,
        Long prayerId,
        Long asmaId,
        Integer totalRepeatCount,
        Integer sessionCount,
        String mood,
        String note,
        LocalDateTime updatedAt
) {
    public static DhikrLogResponse from(DhikrEntry entry) {
        return new DhikrLogResponse(
                entry.getId(),
                entry.getUserId(),
                entry.getEntryDate(),
                entry.getEntryType(),
                entry.getPrayerId(),
                entry.getAsmaId(),
                entry.getTotalRepeatCount(),
                entry.getSessionCount(),
                entry.getMood(),
                entry.getNote(),
                entry.getUpdatedAt()
        );
    }
}

