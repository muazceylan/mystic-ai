package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.CosmicPlannerResponse;
import com.mysticai.astrology.dto.CosmicSummaryResponse;
import com.mysticai.astrology.dto.CosmicDayDetailResponse;
import com.mysticai.astrology.dto.CosmicCategoryDetailsResponse;
import com.mysticai.astrology.service.CosmicScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/cosmic")
@RequiredArgsConstructor
public class CosmicController {

    private final CosmicScoringService cosmicScoringService;

    @GetMapping("/summary")
    public ResponseEntity<CosmicSummaryResponse> getDailySummary(
            @RequestParam Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        return ResponseEntity.ok(cosmicScoringService.getDailySummary(userId, date, locale, gender, maritalStatus));
    }

    @GetMapping("/planner")
    public ResponseEntity<CosmicPlannerResponse> getPlannerMonth(
            @RequestParam Long userId,
            @RequestParam(required = false, name = "month") String month,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        return ResponseEntity.ok(cosmicScoringService.getPlannerMonth(userId, month, locale, gender, maritalStatus));
    }

    @GetMapping("/day-detail")
    public ResponseEntity<CosmicDayDetailResponse> getDayDetail(
            @RequestParam Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        return ResponseEntity.ok(cosmicScoringService.getDayDetail(userId, date, locale, gender, maritalStatus));
    }

    @GetMapping("/details")
    public ResponseEntity<CosmicCategoryDetailsResponse> getCategoryDetails(
            @RequestParam Long userId,
            @RequestParam String categoryKey,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        return ResponseEntity.ok(cosmicScoringService.getCategoryDetails(userId, date, locale, gender, maritalStatus, categoryKey));
    }
}
