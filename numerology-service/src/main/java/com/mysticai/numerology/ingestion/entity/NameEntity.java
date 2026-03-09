package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "names",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_names_normalized_name", columnNames = "normalized_name")
        },
        indexes = {
                @Index(name = "idx_names_normalized_name", columnList = "normalized_name")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "normalized_name", nullable = false, length = 255)
    private String normalizedName;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private NameStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (status == null) {
            status = NameStatus.PENDING_REVIEW;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
