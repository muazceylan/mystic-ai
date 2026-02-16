package com.mysticai.vision.service;

import com.mysticai.vision.dto.VisionAnalysisResponse;
import com.mysticai.vision.dto.VisionUploadRequest;
import com.mysticai.vision.dto.VisionUploadResponse;
import com.mysticai.vision.entity.VisionAnalysis;
import com.mysticai.vision.event.VisionAnalysisEvent;
import com.mysticai.vision.messaging.VisionEventPublisher;
import com.mysticai.vision.repository.VisionAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Vision Service - Kahve falı ve el falı analiz işlemlerini yönetir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VisionService {

    private final VisionAnalysisRepository visionRepository;
    private final StorageService storageService;
    private final VisionEventPublisher eventPublisher;

    /**
     * Yeni bir görsel analizi başlat.
     */
    @Transactional
    public VisionUploadResponse uploadImage(Long userId, VisionUploadRequest request, MultipartFile image) {
        log.info("Uploading {} image for user {}", request.visionType(), userId);

        // Validate image
        validateImage(image);

        // Store image
        String directory = request.visionType().name().toLowerCase();
        StorageService.StorageResult storageResult = storageService.storeWithMetadata(
                image, directory, null);

        // Create analysis record
        UUID correlationId = UUID.randomUUID();
        VisionAnalysis analysis = VisionAnalysis.builder()
                .userId(userId)
                .visionType(request.visionType())
                .imageUrl(storageResult.url())
                .imagePath(storageResult.path())
                .status(VisionAnalysis.AnalysisStatus.PENDING)
                .correlationId(correlationId)
                .build();

        analysis = visionRepository.save(analysis);

        // Publish event to AI Orchestrator
        VisionAnalysisEvent event = new VisionAnalysisEvent(
                correlationId,
                userId,
                request.visionType(),
                storageResult.url(),
                storageResult.path()
        );
        eventPublisher.publishVisionAnalysisRequest(event);

        // Update status to processing
        analysis.setStatus(VisionAnalysis.AnalysisStatus.PROCESSING);
        visionRepository.save(analysis);

        log.info("Vision analysis created with correlationId: {}", correlationId);

        return new VisionUploadResponse(
                analysis.getId(),
                analysis.getVisionType(),
                analysis.getStatus(),
                analysis.getImageUrl(),
                analysis.getCorrelationId(),
                "Fotoğrafınız başarıyla yüklendi. AI analizi başlatıldı, sonuç hazır olduğunda bildirim alacaksınız.",
                analysis.getCreatedAt()
        );
    }

    /**
     * Kullanıcının tüm analizlerini getir.
     */
    @Transactional(readOnly = true)
    public List<VisionAnalysisResponse> getUserAnalyses(Long userId) {
        return visionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Kullanıcının belirli bir tip analizlerini getir.
     */
    @Transactional(readOnly = true)
    public List<VisionAnalysisResponse> getUserAnalysesByType(Long userId, VisionAnalysis.VisionType visionType) {
        return visionRepository.findByUserIdAndVisionTypeOrderByCreatedAtDesc(userId, visionType)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Belirli bir analizi getir.
     */
    @Transactional(readOnly = true)
    public VisionAnalysisResponse getAnalysis(Long userId, UUID analysisId) {
        VisionAnalysis analysis = visionRepository.findById(analysisId)
                .orElseThrow(() -> new IllegalArgumentException("Analysis not found: " + analysisId));

        if (!analysis.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized access to analysis");
        }

        return toResponse(analysis);
    }

    /**
     * Analiz entity'sini response'a dönüştür.
     */
    private VisionAnalysisResponse toResponse(VisionAnalysis analysis) {
        return new VisionAnalysisResponse(
                analysis.getId(),
                analysis.getUserId(),
                analysis.getVisionType(),
                analysis.getStatus(),
                analysis.getImageUrl(),
                analysis.getAiInterpretation(),
                analysis.getCorrelationId(),
                analysis.getCreatedAt(),
                analysis.getCompletedAt()
        );
    }

    /**
     * Görsel doğrulama.
     */
    private void validateImage(MultipartFile image) {
        if (image.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        // Check file size (max 10MB)
        if (image.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("Image size must be less than 10MB");
        }

        // Check content type
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }

        // Allowed formats
        String filename = image.getOriginalFilename();
        if (filename != null) {
            String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
            if (!List.of("jpg", "jpeg", "png", "webp").contains(extension)) {
                throw new IllegalArgumentException("Only JPG, PNG, and WEBP formats are supported");
            }
        }
    }
}
