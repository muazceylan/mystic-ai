package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "name_tags", uniqueConstraints = {
        @UniqueConstraint(name = "uq_name_tags_name_id_normalized_tag", columnNames = {"name_id", "normalized_tag"})
}, indexes = {
        @Index(name = "idx_name_tags_name_id", columnList = "name_id"),
        @Index(name = "idx_name_tags_normalized_tag", columnList = "normalized_tag"),
        @Index(name = "idx_name_tags_tag_group", columnList = "tag_group"),
        @Index(name = "idx_name_tags_source", columnList = "source")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "name_id", nullable = false)
    private NameEntity name;

    @Column(name = "tag", nullable = false, length = 120)
    private String tag;

    @Column(name = "normalized_tag", nullable = false, length = 120)
    private String normalizedTag;

    @Enumerated(EnumType.STRING)
    @Column(name = "tag_group", length = 32)
    private NameTagGroup tagGroup;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 24)
    private NameTagSource source;

    @Column(name = "confidence", nullable = false, precision = 5, scale = 3)
    private BigDecimal confidence;

    @Column(name = "evidence", columnDefinition = "TEXT")
    private String evidence;

    @Column(name = "enrichment_version")
    private Integer enrichmentVersion;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (source == null) {
            source = NameTagSource.MANUAL;
        }
        if (confidence == null) {
            confidence = BigDecimal.ONE;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
