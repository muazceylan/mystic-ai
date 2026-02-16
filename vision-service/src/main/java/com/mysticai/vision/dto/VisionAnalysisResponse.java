package com.mysticai.vision.dto;

import com.mysticai.vision.entity.VisionAnalysis;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vision Analysis Response - Tamamlanmış analiz yanıtı için Record.
 * 
 * @param id Analiz ID
 * @param userId Kullanıcı ID
 * @param visionType Analiz tipi
 * @param status Analiz durumu
 * @param imageUrl Görsel URL'si
 * @param aiInterpretation AI yorumu
 * @param correlationId İşlem takip ID'si
 * @param createdAt Oluşturulma zamanı
 * @param completedAt Tamamlanma zamanı
 */
public record VisionAnalysisResponse(
        UUID id,
        Long userId,
        VisionAnalysis.VisionType visionType,
        VisionAnalysis.AnalysisStatus status,
        String imageUrl,
        String aiInterpretation,
        UUID correlationId,
        LocalDateTime createdAt,
        LocalDateTime completedAt
) {}
