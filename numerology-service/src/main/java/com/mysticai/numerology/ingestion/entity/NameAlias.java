package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.AliasType;
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
@Table(name = "name_aliases", uniqueConstraints = {
        @UniqueConstraint(name = "uq_name_aliases_normalized_alias_name", columnNames = "normalized_alias_name")
}, indexes = {
        @Index(name = "idx_name_aliases_canonical_name_id", columnList = "canonical_name_id"),
        @Index(name = "idx_name_aliases_alias_type", columnList = "alias_type"),
        @Index(name = "idx_name_aliases_is_manual", columnList = "is_manual")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameAlias {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canonical_name_id", nullable = false)
    private NameEntity canonicalName;

    @Column(name = "alias_name", nullable = false, length = 255)
    private String aliasName;

    @Column(name = "normalized_alias_name", nullable = false, length = 255)
    private String normalizedAliasName;

    @Enumerated(EnumType.STRING)
    @Column(name = "alias_type", nullable = false, length = 32)
    private AliasType aliasType;

    @Column(name = "confidence", nullable = false, precision = 5, scale = 3)
    private BigDecimal confidence;

    @Column(name = "is_manual", nullable = false)
    private boolean manual;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (confidence == null) {
            confidence = BigDecimal.ONE;
        }
        if (aliasType == null) {
            aliasType = AliasType.RELATED_FORM;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
