package com.mysticai.vision.repository;

import com.mysticai.vision.entity.VisionAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Vision Analysis Repository - Kahve falı ve el falı analizleri için veritabanı erişimi.
 */
@Repository
public interface VisionAnalysisRepository extends JpaRepository<VisionAnalysis, UUID> {

    /**
     * Kullanıcının tüm analizlerini getir.
     */
    List<VisionAnalysis> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Kullanıcının belirli bir tip analizlerini getir.
     */
    List<VisionAnalysis> findByUserIdAndVisionTypeOrderByCreatedAtDesc(
            Long userId, VisionAnalysis.VisionType visionType);

    /**
     * Correlation ID'ye göre analiz bul.
     */
    Optional<VisionAnalysis> findByCorrelationId(UUID correlationId);

    /**
     * Kullanıcının bekleyen analizlerini getir.
     */
    List<VisionAnalysis> findByUserIdAndStatusOrderByCreatedAtDesc(
            Long userId, VisionAnalysis.AnalysisStatus status);

    /**
     * Belirli bir durumdaki tüm analizleri getir.
     */
    List<VisionAnalysis> findByStatus(VisionAnalysis.AnalysisStatus status);
}
