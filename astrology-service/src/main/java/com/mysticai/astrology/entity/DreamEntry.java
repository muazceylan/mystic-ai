package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dream_entries", indexes = {
        @Index(name = "idx_dream_entries_user_id", columnList = "user_id"),
        @Index(name = "idx_dream_entries_date", columnList = "dream_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DreamEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "dream_text", columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(name = "dream_date")
    private LocalDate dreamDate;

    @Column(name = "audio_url")
    private String audioUrl;

    /**
     * Main astrological + psychological interpretation from AI.
     */
    @Column(name = "interpretation", columnDefinition = "TEXT")
    private String interpretation;

    /**
     * JSON array of warning strings e.g. ["Dikkat: ...", "..."]
     */
    @Column(name = "warnings_json", columnDefinition = "TEXT")
    private String warningsJson;

    /**
     * JSON array of opportunity strings e.g. ["Fırsat: ...", "..."]
     */
    @Column(name = "opportunities_json", columnDefinition = "TEXT")
    private String opportunitiesJson;

    /**
     * JSON array of recurring symbol names flagged for this entry.
     */
    @Column(name = "recurring_symbols_json", columnDefinition = "TEXT")
    private String recurringSymbolsJson;

    /**
     * All extracted symbols (recurring + new) for this entry.
     */
    @Column(name = "extracted_symbols_json", columnDefinition = "TEXT")
    private String extractedSymbolsJson;

    @Column(name = "correlation_id")
    private UUID correlationId;

    @Column(name = "interpretation_status")
    private String interpretationStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (dreamDate == null) {
            dreamDate = LocalDate.now();
        }
    }
}
