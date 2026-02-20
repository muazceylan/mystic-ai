package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.service.DreamAnalyticsService;
import com.mysticai.astrology.service.DreamService;
import com.mysticai.astrology.service.PushNotificationService;
import com.mysticai.astrology.service.WhisperTranscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dreams")
@RequiredArgsConstructor
@Slf4j
public class DreamController {

    private final DreamService dreamService;
    private final DreamAnalyticsService analyticsService;
    private final PushNotificationService pushService;
    private final WhisperTranscriptionService whisperService;

    /** POST /api/v1/dreams — submit dream via text */
    @PostMapping
    public ResponseEntity<DreamEntryResponse> submitDream(
            @Valid @RequestBody DreamSubmitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dreamService.submitDream(request));
    }

    /**
     * POST /api/v1/dreams/audio — transcribe audio then submit.
     * Multipart: userId (Long), audio (file), dreamDate (optional ISO date string)
     */
    @PostMapping(value = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitDreamAudio(
            @RequestParam("userId") Long userId,
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam(value = "dreamDate", required = false) String dreamDate) {
        log.info("Audio dream from userId={}, file={}, size={} bytes",
                userId, audioFile.getOriginalFilename(), audioFile.getSize());
        try {
            String transcribed = whisperService.transcribe(audioFile);
            log.info("Transcribed {} chars for userId={}", transcribed.length(), userId);

            LocalDate date = (dreamDate != null && !dreamDate.isBlank())
                    ? LocalDate.parse(dreamDate) : LocalDate.now();

            DreamEntryResponse response = dreamService.submitDream(
                    new DreamSubmitRequest(userId, transcribed, date, null, null, null));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Audio dream submission failed for userId={}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Ses kaydı işlenemedi: " + e.getMessage()));
        }
    }

    /**
     * POST /api/v1/dreams/transcribe — transcribes audio and returns text only, does NOT save.
     * Called by the frontend to show live text after recording stops.
     */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> transcribeOnly(@RequestParam("audio") MultipartFile audioFile) {
        log.info("Transcribe-only request: name={}, size={}", audioFile.getOriginalFilename(), audioFile.getSize());
        try {
            String text = whisperService.transcribe(audioFile);
            return ResponseEntity.ok(java.util.Map.of("text", text));
        } catch (Exception e) {
            log.error("Transcription failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", "Ses çözümlenemedi: " + e.getMessage()));
        }
    }

    /** GET /api/v1/dreams/{id} — poll for interpretation status */
    @GetMapping("/{id}")
    public ResponseEntity<DreamEntryResponse> getDreamById(@PathVariable Long id) {
        return ResponseEntity.ok(dreamService.getDreamById(id));
    }

    /** DELETE /api/v1/dreams/{id} — delete a dream entry */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDream(@PathVariable Long id) {
        dreamService.deleteDream(id);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/v1/dreams/user/{userId} — full journal history */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DreamEntryResponse>> getDreamsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(dreamService.getDreamsByUser(userId));
    }

    /** GET /api/v1/dreams/symbols/{userId} — recurring symbols */
    @GetMapping("/symbols/{userId}")
    public ResponseEntity<List<DreamSymbolDTO>> getSymbolsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(dreamService.getTopSymbolsByUser(userId));
    }

    /** GET /api/v1/dreams/analytics/{userId} — personal subconscious analytics */
    @GetMapping("/analytics/{userId}")
    public ResponseEntity<DreamAnalyticsResponse> getAnalytics(@PathVariable Long userId) {
        return ResponseEntity.ok(analyticsService.getAnalytics(userId));
    }

    /** GET /api/v1/dreams/collective-pulse — global dream trends (Redis-cached) */
    @GetMapping("/collective-pulse")
    public ResponseEntity<CollectivePulseResponse> getCollectivePulse() {
        return ResponseEntity.ok(analyticsService.getCollectivePulse());
    }

    /** POST /api/v1/dreams/monthly-story/{userId}?year=&month=[&force=true] — trigger monthly story generation */
    @PostMapping("/monthly-story/{userId}")
    public ResponseEntity<MonthlyStoryResponse> generateMonthlyStory(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(defaultValue = "false") boolean force) {
        MonthlyStoryResponse response = dreamService.generateMonthlyStory(userId, year, month, force);
        return ResponseEntity.ok(response);
    }

    /** GET /api/v1/dreams/monthly-story/{userId}/{year}/{month} — get existing story */
    @GetMapping("/monthly-story/{userId}/{year}/{month}")
    public ResponseEntity<MonthlyStoryResponse> getMonthlyStory(
            @PathVariable Long userId,
            @PathVariable int year,
            @PathVariable int month) {
        MonthlyStoryResponse response = dreamService.getMonthlyStory(userId, year, month);
        if (response == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(response);
    }

    /** POST /api/v1/dreams/push-token — register Expo push token */
    @PostMapping("/push-token")
    public ResponseEntity<Void> registerPushToken(@Valid @RequestBody PushTokenRequest request) {
        pushService.registerToken(request.userId(), request.token(), request.platform());
        return ResponseEntity.ok().build();
    }
}
