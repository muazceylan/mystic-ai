package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "parsed_name_candidates", indexes = {
        @Index(name = "idx_parsed_name_candidates_normalized_name", columnList = "normalized_name"),
        @Index(name = "idx_parsed_name_candidates_canonical_normalized_name", columnList = "canonical_normalized_name"),
        @Index(name = "idx_parsed_name_candidates_canonical_name_id", columnList = "canonical_name_id"),
        @Index(name = "idx_parsed_name_candidates_content_quality", columnList = "content_quality"),
        @Index(name = "idx_parsed_name_candidates_duplicate_content", columnList = "duplicate_content_flag")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsedNameCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "raw_entry_id", nullable = false, unique = true)
    private RawNameSourceEntry rawEntry;

    @Column(name = "normalized_name", nullable = false, length = 255)
    private String normalizedName;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "canonical_name_id")
    private Long canonicalNameId;

    @Column(name = "canonical_normalized_name", nullable = false, length = 255)
    private String canonicalNormalizedName;

    @Enumerated(EnumType.STRING)
    @Column(name = "alias_match_level", nullable = false, length = 24)
    private AliasMatchLevel aliasMatchLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 24)
    private ParsedGender gender;

    @Column(name = "meaning_short", columnDefinition = "TEXT")
    private String meaningShort;

    @Column(name = "meaning_long", columnDefinition = "TEXT")
    private String meaningLong;

    @Column(name = "origin", length = 255)
    private String origin;

    @Column(name = "character_traits_text", columnDefinition = "TEXT")
    private String characterTraitsText;

    @Column(name = "letter_analysis_text", columnDefinition = "TEXT")
    private String letterAnalysisText;

    @Column(name = "quran_flag")
    private Boolean quranFlag;

    @Column(name = "source_confidence", nullable = false, precision = 5, scale = 3)
    private BigDecimal sourceConfidence;

    @Column(name = "mismatch_flag", nullable = false)
    private boolean mismatchFlag;

    @Column(name = "duplicate_content_flag", nullable = false)
    private boolean duplicateContentFlag;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_quality", nullable = false, length = 16)
    private ContentQuality contentQuality;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (sourceConfidence == null) {
            sourceConfidence = BigDecimal.ZERO;
        }
        if (canonicalNormalizedName == null || canonicalNormalizedName.isBlank()) {
            canonicalNormalizedName = normalizedName;
        }
        if (aliasMatchLevel == null) {
            aliasMatchLevel = AliasMatchLevel.NO_MATCH;
        }
        if (contentQuality == null) {
            contentQuality = ContentQuality.LOW;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
