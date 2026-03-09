package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.ParseStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
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
@Table(name = "raw_name_source_entries",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_raw_name_source_entries_dedupe",
                        columnNames = {"source_name", "source_url", "checksum"})
        },
        indexes = {
                @Index(name = "idx_raw_name_source_entries_source_name", columnList = "source_name"),
                @Index(name = "idx_raw_name_source_entries_parse_status", columnList = "parse_status")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RawNameSourceEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_name", nullable = false, length = 64)
    private SourceName sourceName;

    @Column(name = "source_url", nullable = false, columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "external_name", length = 255)
    private String externalName;

    @Column(name = "raw_title", columnDefinition = "TEXT")
    private String rawTitle;

    @Column(name = "raw_html", columnDefinition = "TEXT")
    private String rawHtml;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "parse_status", nullable = false, length = 32)
    private ParseStatus parseStatus;

    @Column(name = "checksum", nullable = false, length = 64)
    private String checksum;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (fetchedAt == null) {
            fetchedAt = now;
        }
        if (parseStatus == null) {
            parseStatus = ParseStatus.FETCHED;
        }
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
