package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.SourceName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "name_source_controls", indexes = {
        @Index(name = "idx_name_source_controls_enabled", columnList = "enabled")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameSourceControl {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "source_name", nullable = false, length = 64)
    private SourceName sourceName;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
