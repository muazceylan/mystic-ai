package com.mysticai.vision.event;

import com.mysticai.vision.entity.VisionAnalysis;

import java.util.UUID;

/**
 * Vision Analysis Event - AI Orchestrator'a gönderilen görsel analiz isteği.
 * 
 * @param correlationId İşlem takip ID'si
 * @param userId Kullanıcı ID
 * @param visionType Analiz tipi (COFFEE_CUP, PALM)
 * @param imageUrl Görsel URL'si
 * @param imagePath Görsel dosya yolu (base64 encoding için)
 */
public record VisionAnalysisEvent(
        UUID correlationId,
        Long userId,
        VisionAnalysis.VisionType visionType,
        String imageUrl,
        String imagePath
) {}
