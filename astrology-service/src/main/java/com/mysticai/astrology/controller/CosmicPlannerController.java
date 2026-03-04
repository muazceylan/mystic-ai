package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.cosmicplanner.CosmicPlannerDayCategoriesDTO;
import com.mysticai.astrology.dto.cosmicplanner.CosmicPlannerDayDTO;
import com.mysticai.astrology.dto.cosmicplanner.CosmicPlannerMonthDTO;
import com.mysticai.astrology.service.CosmicPlannerFacadeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/cosmic-planner")
@RequiredArgsConstructor
public class CosmicPlannerController {

    private final CosmicPlannerFacadeService cosmicPlannerFacadeService;

    @GetMapping("/month")
    public ResponseEntity<CosmicPlannerMonthDTO> getMonth(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month 1 ile 12 arasında olmalıdır.");
        }
        if (year < 2000 || year > 2100) {
            throw new IllegalArgumentException("year 2000 ile 2100 arasında olmalıdır.");
        }
        Long userId = resolveUserId(headerUserId, queryUserId);
        return ResponseEntity.ok(
                cosmicPlannerFacadeService.getMonth(userId, year, month, locale, gender, maritalStatus)
        );
    }

    @GetMapping("/day")
    public ResponseEntity<CosmicPlannerDayDTO> getDay(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(
                cosmicPlannerFacadeService.getDay(userId, targetDate, locale, gender, maritalStatus)
        );
    }

    @GetMapping("/day/categories")
    public ResponseEntity<CosmicPlannerDayCategoriesDTO> getDayCategories(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String maritalStatus
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(
                cosmicPlannerFacadeService.getDayCategories(userId, targetDate, locale, gender, maritalStatus)
        );
    }

    private Long resolveUserId(String headerUserId, String queryUserId) {
        Long parsedHeader = parsePositiveLong(headerUserId);
        if (parsedHeader != null) {
            return parsedHeader;
        }
        Long parsedQuery = parsePositiveLong(queryUserId);
        if (parsedQuery != null) {
            return parsedQuery;
        }
        throw new IllegalArgumentException("Kullanıcı doğrulaması bulunamadı.");
    }

    private Long parsePositiveLong(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(raw.trim());
            return value > 0 ? value : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
