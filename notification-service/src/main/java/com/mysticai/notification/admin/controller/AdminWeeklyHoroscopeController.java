package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.cms.HoroscopeIngestService;
import com.mysticai.notification.admin.service.cms.WeeklyHoroscopeCmsService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.cms.IngestLog;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import com.mysticai.notification.repository.IngestLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/v1/weekly-horoscopes")
@RequiredArgsConstructor
public class AdminWeeklyHoroscopeController {

    private final WeeklyHoroscopeCmsService service;
    private final HoroscopeIngestService ingestService;
    private final AdminAuthService authService;
    private final IngestLogRepository ingestLogRepository;

    @GetMapping
    public ResponseEntity<Page<WeeklyHoroscopeCms>> list(
            @RequestParam(required = false) WeeklyHoroscopeCms.ZodiacSign zodiacSign,
            @RequestParam(required = false) WeeklyHoroscopeCms.Status status,
            @RequestParam(required = false) WeeklyHoroscopeCms.SourceType sourceType,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.findAll(zodiacSign, status, sourceType, locale,
                weekStartFrom, weekStartTo,
                PageRequest.of(page, size, Sort.by("weekStartDate").descending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WeeklyHoroscopeCms> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<WeeklyHoroscopeCms> create(@RequestBody WeeklyHoroscopeCms data,
                                                      Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.create(data, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<WeeklyHoroscopeCms> update(@PathVariable Long id,
                                                      @RequestBody WeeklyHoroscopeCms updates,
                                                      Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.update(id, updates, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<WeeklyHoroscopeCms> publish(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.publish(id, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<WeeklyHoroscopeCms> archive(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        return ResponseEntity.ok(service.archive(id, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @GetMapping("/ingest-status")
    public ResponseEntity<Map<String, Object>> ingestStatus(
            @RequestParam(defaultValue = "tr") String locale) {
        Optional<IngestLog> log = ingestLogRepository.findByIngestTypeAndLocale(
                IngestLog.IngestType.WEEKLY_HOROSCOPE, locale);
        // Next Monday at midnight
        LocalDate today = LocalDate.now();
        LocalDate nextMonday = today.getDayOfWeek() == DayOfWeek.MONDAY
                ? today.plusWeeks(1)
                : today.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDateTime nextScheduled = nextMonday.atTime(LocalTime.MIDNIGHT);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("apiSource", "Astroloji Servisi");
        result.put("schedule", "Her Pazartesi 00:00");
        result.put("nextScheduledAt", nextScheduled.toString());
        log.ifPresentOrElse(l -> {
            result.put("lastIngestDate", l.getLastIngestDate().toString());
            result.put("lastIngestAt", l.getLastIngestAt().toString());
            result.put("successCount", l.getSuccessCount());
            result.put("failureCount", l.getFailureCount());
        }, () -> {
            result.put("lastIngestDate", null);
            result.put("lastIngestAt", null);
            result.put("successCount", 0);
            result.put("failureCount", 0);
        });
        return ResponseEntity.ok(result);
    }

    @PostMapping("/ingest")
    public ResponseEntity<?> ingest(@RequestBody Map<String, String> body, Authentication auth) {
        String signStr = body.get("zodiacSign");
        String weekStartStr = body.get("weekStartDate");
        String locale = body.getOrDefault("locale", "tr");

        if (signStr == null || weekStartStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "zodiacSign and weekStartDate are required"));
        }
        try {
            WeeklyHoroscopeCms.ZodiacSign sign = WeeklyHoroscopeCms.ZodiacSign.valueOf(signStr.toUpperCase());
            LocalDate weekStart = LocalDate.parse(weekStartStr);
            AdminUser admin = adminUser(auth);
            WeeklyHoroscopeCms result = ingestService.ingestWeeklyAsAdmin(
                    sign, weekStart, locale, admin.getId(), admin.getEmail(), admin.getRole());
            return result != null
                    ? ResponseEntity.ok(result)
                    : ResponseEntity.status(502).body(Map.of("error", "Astrology service unavailable"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private AdminUser adminUser(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
