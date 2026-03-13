package com.mysticai.spiritual.controller;

import com.mysticai.spiritual.dto.common.PagedResponse;
import com.mysticai.spiritual.dto.content.ContentReportResponse;
import com.mysticai.spiritual.dto.content.CreateContentReportRequest;
import com.mysticai.spiritual.dto.daily.AsmaDetailResponse;
import com.mysticai.spiritual.dto.daily.AsmaListItemResponse;
import com.mysticai.spiritual.dto.daily.DailyAsmaResponse;
import com.mysticai.spiritual.dto.daily.DailyMeditationResponse;
import com.mysticai.spiritual.dto.daily.DailyPrayerSetResponse;
import com.mysticai.spiritual.dto.daily.PrayerDetailResponse;
import com.mysticai.spiritual.dto.daily.ShortPrayerItemResponse;
import com.mysticai.spiritual.dto.log.*;
import com.mysticai.spiritual.dto.stats.WeeklyStatsResponse;
import com.mysticai.spiritual.dto.user.FavoriteStatusResponse;
import com.mysticai.spiritual.dto.user.UpdateUserPreferencesRequest;
import com.mysticai.spiritual.dto.user.UserPreferencesResponse;
import com.mysticai.spiritual.service.SpiritualDailyService;
import com.mysticai.spiritual.service.SpiritualLogService;
import com.mysticai.spiritual.service.SpiritualUserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/spiritual")
@RequiredArgsConstructor
@Slf4j
public class SpiritualController {

    private final SpiritualDailyService dailyService;
    private final SpiritualLogService logService;
    private final SpiritualUserService userService;

    @Value("${spiritual.security.permit-all:false}")
    private boolean permitAll;

    @GetMapping("/daily/prayers")
    public ResponseEntity<DailyPrayerSetResponse> getDailyPrayers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage,
            @RequestHeader(value = "X-Timezone", required = false) String timezone
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(dailyService.getDailyPrayerSet(userId, date, acceptLanguage, timezone));
    }

    @GetMapping("/prayers/{id}")
    public ResponseEntity<PrayerDetailResponse> getPrayerDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(dailyService.getPrayerDetail(userId, id));
    }

    @GetMapping("/prayers/short")
    public ResponseEntity<List<ShortPrayerItemResponse>> getShortPrayers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "8") @Min(1) @Max(20) int limit
    ) {
        resolveUserId(jwt); // ownership/auth check path remains consistent
        return ResponseEntity.ok(dailyService.getShortPrayers(category, limit));
    }

    @PostMapping("/log/prayer")
    public ResponseEntity<DhikrLogResponse> logPrayer(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePrayerLogRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(logService.logPrayer(userId, request, idempotencyKey));
    }

    @GetMapping("/log/prayer")
    public ResponseEntity<PagedResponse<DhikrLogResponse>> getPrayerLogs(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(logService.getPrayerLogs(userId, from, to, page, pageSize));
    }

    @GetMapping("/daily/asma")
    public ResponseEntity<DailyAsmaResponse> getDailyAsma(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(dailyService.getDailyAsma(userId, date));
    }

    @GetMapping("/asma")
    public ResponseEntity<PagedResponse<AsmaListItemResponse>> getAsmaList(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String theme,
            @RequestParam(required = false, defaultValue = "order") String sort,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize
    ) {
        resolveUserId(jwt);
        return ResponseEntity.ok(dailyService.getAsmaList(search, theme, sort, page, pageSize));
    }

    @GetMapping("/asma/{id}")
    public ResponseEntity<AsmaDetailResponse> getAsmaDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        resolveUserId(jwt);
        return ResponseEntity.ok(dailyService.getAsmaDetail(id));
    }

    @PostMapping("/log/asma")
    public ResponseEntity<DhikrLogResponse> logAsma(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateAsmaLogRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(logService.logAsma(userId, request, idempotencyKey));
    }

    @GetMapping("/daily/meditation")
    public ResponseEntity<DailyMeditationResponse> getDailyMeditation(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(dailyService.getDailyMeditation(userId, date));
    }

    @PostMapping("/log/meditation")
    public ResponseEntity<MeditationLogResponse> logMeditation(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateMeditationLogRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(logService.logMeditation(userId, request, idempotencyKey));
    }

    @GetMapping("/stats/weekly")
    public ResponseEntity<WeeklyStatsResponse> getWeeklyStats(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("week") String week
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(logService.getWeeklyStats(userId, week));
    }

    @GetMapping("/preferences")
    public ResponseEntity<UserPreferencesResponse> getPreferences(@AuthenticationPrincipal Jwt jwt) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(userService.getPreferences(userId));
    }

    @PutMapping("/preferences")
    public ResponseEntity<UserPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateUserPreferencesRequest request
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(userService.updatePreferences(userId, request));
    }

    @PostMapping("/prayers/{id}/favorite")
    public ResponseEntity<FavoriteStatusResponse> addPrayerFavorite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(userService.addFavorite(userId, id));
    }

    @DeleteMapping("/prayers/{id}/favorite")
    public ResponseEntity<FavoriteStatusResponse> removePrayerFavorite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(userService.removeFavorite(userId, id));
    }

    @PostMapping("/content/report")
    public ResponseEntity<ContentReportResponse> createContentReport(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateContentReportRequest request
    ) {
        Long userId = resolveUserId(jwt);
        return ResponseEntity.ok(userService.createContentReport(userId, request));
    }

    private Long resolveUserId(Jwt jwt) {
        Long jwtUserId = resolveUserIdFromJwt(jwt);
        if (jwtUserId != null) {
            return jwtUserId;
        }

        if (permitAll) {
            Long headerUserId = resolveUserIdFromHeader();
            if (headerUserId != null) {
                return headerUserId;
            }
            return 1L;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
    }

    private Long resolveUserIdFromJwt(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        Object claimUserId = jwt.getClaim("userId");
        if (claimUserId instanceof Number n) {
            return n.longValue();
        }
        if (claimUserId instanceof String s && !s.isBlank()) {
            return Long.parseLong(s);
        }
        return Long.parseLong(jwt.getSubject());
    }

    private Long resolveUserIdFromHeader() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest request = attrs.getRequest();
            String value = request.getHeader("X-User-Id");
            if (value == null || value.isBlank()) return null;
            return Long.parseLong(value);
        } catch (Exception e) {
            log.debug("Could not resolve X-User-Id header in permit-all mode", e);
            return null;
        }
    }
}
