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
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timezone
    ) {
        return ResponseEntity.ok(dailyTransitsService.getDailyTransits(userId, date, timezone));
    }

    @GetMapping("/daily/transits/actions")
    public ResponseEntity<DailyActionsDTO> getDailyActions(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timezone
    ) {
        return ResponseEntity.ok(dailyTransitsService.getDailyActions(userId, date, timezone));
    }

    @PostMapping("/daily/transits/actions/{actionId}/done")
    public ResponseEntity<DailyActionToggleResponse> markActionDone(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable String actionId,
            @Valid @RequestBody DailyActionToggleRequest request
    ) {
        return ResponseEntity.ok(
                dailyTransitsService.toggleAction(userId, actionId, request.date(), Boolean.TRUE.equals(request.isDone()))
        );
    }

    @PostMapping("/feedback")
    public ResponseEntity<Void> saveFeedback(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody DailyFeedbackRequest request
    ) {
        dailyTransitsService.saveFeedback(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
