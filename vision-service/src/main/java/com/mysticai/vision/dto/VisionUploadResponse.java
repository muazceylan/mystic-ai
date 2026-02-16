package com.mysticai.vision.dto;

import com.mysticai.vision.entity.VisionAnalysis;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vision Upload Response - Görsel yükleme yanıtı için Record.
 * 
 * @param id Analiz ID
 * @param visionType Analiz tipi
 * @param status Analiz durumu
 * @param imageUrl Görsel URL'si
 * @param correlationId İşlem takip ID'si
 * @param message Kullanıcı mesajı
 * @param createdAt Oluşturulma zamanı
 */
public record VisionUploadResponse(
        UUID id,
        VisionAnalysis.VisionType visionType,
        VisionAnalysis.AnalysisStatus status,
        String imageUrl,
        UUID correlationId,
        String message,
        LocalDateTime createdAt
) {}
