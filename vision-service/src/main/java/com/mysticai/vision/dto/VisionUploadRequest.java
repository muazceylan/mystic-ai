package com.mysticai.vision.dto;

import com.mysticai.vision.entity.VisionAnalysis;
import jakarta.validation.constraints.NotNull;

/**
 * Vision Upload Request - Görsel yükleme isteği için Record.
 * 
 * @param visionType Analiz tipi (COFFEE_CUP veya PALM)
 */
public record VisionUploadRequest(
        @NotNull(message = "Vision type is required")
        VisionAnalysis.VisionType visionType
) {}
