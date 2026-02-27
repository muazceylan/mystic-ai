package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "asmaul_husna", indexes = {
        @Index(name = "idx_asma_theme", columnList = "theme"),
        @Index(name = "idx_asma_active", columnList = "active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AsmaulHusna {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no", nullable = false, unique = true)
    private Integer orderNo;

    @Column(name = "arabic_name", nullable = false, length = 128)
    private String arabicName;

    @Column(name = "name_tr", length = 128)
    private String nameTr;

    @Column(name = "transliteration_tr", nullable = false, length = 128)
    private String transliterationTr;

    @Column(name = "meaning_tr", nullable = false, length = 256)
    private String meaningTr;

    @Column(name = "short_benefit_tr", columnDefinition = "TEXT")
    private String shortBenefitTr;

    @Column(name = "reflection_text_tr", columnDefinition = "TEXT", nullable = false)
    private String reflectionTextTr;

    @Column(length = 64)
    private String theme;

    @Column(name = "tags_json", columnDefinition = "TEXT")
    private String tagsJson;

    @Column(name = "source_provider", length = 64)
    private String sourceProvider;

    @Column(name = "source_note", columnDefinition = "TEXT")
    private String sourceNote;

    @Column(name = "recommended_dhikr_count")
    private Integer recommendedDhikrCount;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (active == null) active = true;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

