package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.daily.DailyActionToggleRequest;
import com.mysticai.astrology.dto.daily.DailyActionToggleResponse;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import com.mysticai.astrology.dto.daily.DailyFeedbackRequest;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.service.DailyTransitsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DailyTransitsController {

    private final DailyTransitsService dailyTransitsService;

    @GetMapping("/daily/transits")
    public ResponseEntity<DailyTransitsDTO> getDailyTransits(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(value = "userId", required = false) Long queryUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timezone
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        return ResponseEntity.ok(dailyTransitsService.getDailyTransits(userId, date, timezone));
    }

    @GetMapping("/daily/transits/actions")
    public ResponseEntity<DailyActionsDTO> getDailyActions(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(value = "userId", required = false) Long queryUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timezone
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        return ResponseEntity.ok(dailyTransitsService.getDailyActions(userId, date, timezone));
    }

    @PostMapping("/daily/transits/actions/{actionId}/done")
    public ResponseEntity<DailyActionToggleResponse> markActionDone(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(value = "userId", required = false) Long queryUserId,
            @PathVariable String actionId,
            @Valid @RequestBody DailyActionToggleRequest request
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        return ResponseEntity.ok(
                dailyTransitsService.toggleAction(userId, actionId, request.date(), Boolean.TRUE.equals(request.isDone()))
        );
    }

    @PostMapping("/feedback")
    public ResponseEntity<Void> saveFeedback(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(value = "userId", required = false) Long queryUserId,
            @Valid @RequestBody DailyFeedbackRequest request
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        dailyTransitsService.saveFeedback(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    private Long resolveUserId(Long headerUserId, Long queryUserId) {
        if (headerUserId != null && headerUserId > 0) {
            return headerUserId;
        }
        if (queryUserId != null && queryUserId > 0) {
            return queryUserId;
        }
        throw new IllegalArgumentException("Kullanıcı doğrulaması bulunamadı.");
    }
}
