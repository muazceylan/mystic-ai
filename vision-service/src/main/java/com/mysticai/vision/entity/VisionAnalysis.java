package com.mysticai.vision.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vision Analysis Entity - Kahve falı ve el falı analizlerini temsil eder.
 */
@Entity
@Table(name = "vision_analyses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisionAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vision_type", nullable = false)
    private VisionType visionType;

    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "image_path")
    private String imagePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private AnalysisStatus status = AnalysisStatus.PENDING;

    @Column(name = "ai_interpretation", columnDefinition = "TEXT")
    private String aiInterpretation;

    @Column(name = "correlation_id")
    private UUID correlationId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Vision analiz tipi - Kahve falı veya El falı
     */
    public enum VisionType {
        COFFEE_CUP("Kahve Falı", "Telve kalıntılarından geleceği okuma sanatı"),
        PALM("El Falı", "Avuç içi çizgilerinden kaderi yorumlama");

        private final String displayName;
        private final String description;

        VisionType(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * Analiz durumu
     */
    public enum AnalysisStatus {
        PENDING("Beklemede"),
        PROCESSING("İşleniyor"),
        COMPLETED("Tamamlandı"),
        FAILED("Başarısız");

        private final String displayName;

        AnalysisStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
