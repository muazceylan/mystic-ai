package com.mysticai.vision.controller;

import com.mysticai.vision.dto.VisionAnalysisResponse;
import com.mysticai.vision.dto.VisionUploadRequest;
import com.mysticai.vision.dto.VisionUploadResponse;
import com.mysticai.vision.entity.VisionAnalysis;
import com.mysticai.vision.service.VisionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Vision Controller - Kahve falı ve el falı analiz endpoint'leri.
 * 
 * POST /api/v1/vision/upload - Görsel yükle ve analiz başlat
 * GET /api/v1/vision/analyses - Kullanıcının tüm analizlerini getir
 * GET /api/v1/vision/analyses/{id} - Belirli bir analizi getir
 * GET /api/v1/vision/analyses/type/{type} - Tipe göre analizleri getir
 */
@RestController
@RequestMapping("/api/v1/vision")
@RequiredArgsConstructor
@Slf4j
public class VisionController {

    private final VisionService visionService;

    /**
     * POST /api/v1/vision/upload
     * Görsel yükle ve AI analizi başlat.
     * 
     * @param visionType COFFEE_CUP veya PALM
     * @param image Yüklenen görsel dosyası (JPG, PNG, WEBP - max 10MB)
     * @param userId X-User-Id header'ından alınan kullanıcı ID
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VisionUploadResponse> uploadImage(
            @RequestParam("visionType") VisionAnalysis.VisionType visionType,
            @RequestParam("image") MultipartFile image,
            @RequestHeader("X-User-Id") Long userId) {
        
        log.info("Vision upload request - user: {}, type: {}", userId, visionType);
        
        VisionUploadRequest request = new VisionUploadRequest(visionType);
        VisionUploadResponse response = visionService.uploadImage(userId, request, image);
        
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/vision/analyses
     * Kullanıcının tüm görsel analizlerini getir.
     */
    @GetMapping("/analyses")
    public ResponseEntity<List<VisionAnalysisResponse>> getUserAnalyses(
            @RequestHeader("X-User-Id") Long userId) {
        
        log.info("Fetching all vision analyses for user: {}", userId);
        List<VisionAnalysisResponse> analyses = visionService.getUserAnalyses(userId);
        return ResponseEntity.ok(analyses);
    }

    /**
     * GET /api/v1/vision/analyses/{id}
     * Belirli bir analizi ID'ye göre getir.
     */
    @GetMapping("/analyses/{id}")
    public ResponseEntity<VisionAnalysisResponse> getAnalysis(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") Long userId) {
        
        log.info("Fetching vision analysis {} for user: {}", id, userId);
        VisionAnalysisResponse analysis = visionService.getAnalysis(userId, id);
        return ResponseEntity.ok(analysis);
    }

    /**
     * GET /api/v1/vision/analyses/type/{type}
     * Kullanıcının belirli tip analizlerini getir (COFFEE_CUP veya PALM).
     */
    @GetMapping("/analyses/type/{type}")
    public ResponseEntity<List<VisionAnalysisResponse>> getAnalysesByType(
            @PathVariable VisionAnalysis.VisionType type,
            @RequestHeader("X-User-Id") Long userId) {
        
        log.info("Fetching {} analyses for user: {}", type, userId);
        List<VisionAnalysisResponse> analyses = visionService.getUserAnalysesByType(userId, type);
        return ResponseEntity.ok(analyses);
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Vision Service is running");
    }
}
