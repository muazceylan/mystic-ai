package com.mysticai.notification.admin.service.cms;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.DailyHoroscopeCms;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import com.mysticai.notification.repository.DailyHoroscopeCmsRepository;
import com.mysticai.notification.repository.WeeklyHoroscopeCmsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Calls astrology-service horoscope endpoint and persists the response to the CMS DB.
 * Respects admin overrides: if isOverrideActive=true on the existing record, ingest is skipped.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HoroscopeIngestService {

    private final DailyHoroscopeCmsRepository dailyRepo;
    private final WeeklyHoroscopeCmsRepository weeklyRepo;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${services.astrology.base-url:http://localhost:8083}")
    private String astrologyBaseUrl;

    // ----- Daily Horoscope Ingest -----

    @Transactional
    public DailyHoroscopeCms ingestDaily(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate date, String locale) {
        return ingestDailyInternal(sign, date, locale, null, null, null);
    }

    @Transactional
    public DailyHoroscopeCms ingestDailyAsAdmin(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate date, String locale,
                                                  Long adminId, String adminEmail, AdminUser.Role role) {
        return ingestDailyInternal(sign, date, locale, adminId, adminEmail, role);
    }

    private DailyHoroscopeCms ingestDailyInternal(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate date, String locale,
                                                    Long adminId, String adminEmail, AdminUser.Role role) {
        // Check existing — skip if already published with content (admin edits are preserved)
        var existing = dailyRepo.findByZodiacSignAndDateAndLocale(sign, date, locale);
        if (existing.isPresent()) {
            DailyHoroscopeCms rec = existing.get();
            if (rec.isOverrideActive()
                    || (rec.getStatus() == DailyHoroscopeCms.Status.PUBLISHED && rec.getIngestError() == null)) {
                log.debug("Skipping ingest for daily {} {} {} — already published or override active", sign, date, locale);
                return rec;
            }
        }

        // Call astrology-service
        String url = astrologyBaseUrl + "/api/v1/horoscope?sign=" + sign.name().toLowerCase()
                + "&period=daily&lang=" + locale;
        String fetchError = null;
        AstrologyHoroscopeResponse fetchedResponse = null;
        try {
            fetchedResponse = fetchFromAstrologyOrThrow(url);
        } catch (Exception e) {
            fetchError = e.getMessage();
            log.warn("Failed to fetch daily {} {} {} from astrology-service: {}", sign, date, locale, fetchError);
        }

        // If fetch failed — save placeholder with error info
        if (fetchedResponse == null) {
            final String error = fetchError;
            if (existing.isPresent()) {
                existing.get().setIngestError(error);
                return dailyRepo.save(existing.get());
            }
            return dailyRepo.save(DailyHoroscopeCms.builder()
                    .zodiacSign(sign).date(date).locale(locale)
                    .status(DailyHoroscopeCms.Status.DRAFT)
                    .sourceType(DailyHoroscopeCms.SourceType.EXTERNAL_API)
                    .ingestError(error)
                    .ingestedAt(LocalDateTime.now())
                    .build());
        }

        final AstrologyHoroscopeResponse response = fetchedResponse;
        String snapshotJson = toJson(response);
        DailyHoroscopeCms record = existing.map(e -> {
            e.setTitle(response.sections() != null ? response.sections().getOrDefault("title", null) : null);
            e.setFullContent(response.sections() != null ? response.sections().getOrDefault("general", null) : null);
            e.setLove(response.sections() != null ? response.sections().getOrDefault("love", null) : null);
            e.setCareer(response.sections() != null ? response.sections().getOrDefault("career", null) : null);
            e.setMoney(response.sections() != null ? response.sections().getOrDefault("money", null) : null);
            e.setHealth(response.sections() != null ? response.sections().getOrDefault("health", null) : null);
            e.setLuckyColor(response.meta() != null ? response.meta().getOrDefault("lucky_color", null) : null);
            e.setLuckyNumber(response.meta() != null ? response.meta().getOrDefault("lucky_number", null) : null);
            e.setExternalSnapshotJson(snapshotJson);
            e.setIngestedAt(LocalDateTime.now());
            e.setIngestError(null); // clear previous error on success
            e.setSourceType(DailyHoroscopeCms.SourceType.EXTERNAL_API);
            e.setStatus(DailyHoroscopeCms.Status.PUBLISHED);
            return e;
        }).orElseGet(() -> DailyHoroscopeCms.builder()
                .zodiacSign(sign)
                .date(date)
                .locale(locale)
                .title(response.sections() != null ? response.sections().getOrDefault("title", null) : null)
                .fullContent(response.sections() != null ? response.sections().getOrDefault("general", null) : null)
                .love(response.sections() != null ? response.sections().getOrDefault("love", null) : null)
                .career(response.sections() != null ? response.sections().getOrDefault("career", null) : null)
                .money(response.sections() != null ? response.sections().getOrDefault("money", null) : null)
                .health(response.sections() != null ? response.sections().getOrDefault("health", null) : null)
                .luckyColor(response.meta() != null ? response.meta().getOrDefault("lucky_color", null) : null)
                .luckyNumber(response.meta() != null ? response.meta().getOrDefault("lucky_number", null) : null)
                .externalSnapshotJson(snapshotJson)
                .ingestedAt(LocalDateTime.now())
                .sourceType(DailyHoroscopeCms.SourceType.EXTERNAL_API)
                .status(DailyHoroscopeCms.Status.PUBLISHED)
                .build());

        DailyHoroscopeCms saved = dailyRepo.save(record);
        if (adminId != null) {
            auditLogService.log(adminId, adminEmail, role,
                    AuditLog.ActionType.DAILY_HOROSCOPE_INGESTED, AuditLog.EntityType.DAILY_HOROSCOPE,
                    saved.getId().toString(), sign + " " + date, null, null);
        }
        return saved;
    }

    // ----- Weekly Horoscope Ingest -----

    @Transactional
    public WeeklyHoroscopeCms ingestWeekly(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate weekStart, String locale) {
        return ingestWeeklyInternal(sign, weekStart, locale, null, null, null);
    }

    @Transactional
    public WeeklyHoroscopeCms ingestWeeklyAsAdmin(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate weekStart,
                                                   String locale, Long adminId, String adminEmail, AdminUser.Role role) {
        return ingestWeeklyInternal(sign, weekStart, locale, adminId, adminEmail, role);
    }

    private WeeklyHoroscopeCms ingestWeeklyInternal(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate weekStart,
                                                     String locale, Long adminId, String adminEmail, AdminUser.Role role) {
        var existing = weeklyRepo.findByZodiacSignAndWeekStartDateAndLocale(sign, weekStart, locale);
        if (existing.isPresent()) {
            WeeklyHoroscopeCms rec = existing.get();
            if (rec.isOverrideActive()
                    || (rec.getStatus() == WeeklyHoroscopeCms.Status.PUBLISHED && rec.getIngestError() == null)) {
                log.debug("Skipping ingest for weekly {} {} {} — already published or override active", sign, weekStart, locale);
                return rec;
            }
        }

        String url = astrologyBaseUrl + "/api/v1/horoscope?sign=" + sign.name().toLowerCase()
                + "&period=weekly&lang=" + locale;
        String fetchError = null;
        AstrologyHoroscopeResponse fetchedResponse = null;
        try {
            fetchedResponse = fetchFromAstrologyOrThrow(url);
        } catch (Exception e) {
            fetchError = e.getMessage();
            log.warn("Failed to fetch weekly {} {} {} from astrology-service: {}", sign, weekStart, locale, fetchError);
        }

        if (fetchedResponse == null) {
            final String error = fetchError;
            if (existing.isPresent()) {
                existing.get().setIngestError(error);
                return weeklyRepo.save(existing.get());
            }
            LocalDate weekEnd = weekStart.plusDays(6);
            return weeklyRepo.save(WeeklyHoroscopeCms.builder()
                    .zodiacSign(sign).weekStartDate(weekStart).weekEndDate(weekEnd).locale(locale)
                    .status(WeeklyHoroscopeCms.Status.DRAFT)
                    .sourceType(WeeklyHoroscopeCms.SourceType.EXTERNAL_API)
                    .ingestError(error)
                    .ingestedAt(LocalDateTime.now())
                    .build());
        }

        final AstrologyHoroscopeResponse response = fetchedResponse;
        String snapshotJson = toJson(response);
        LocalDate weekEnd = weekStart.plusDays(6);

        WeeklyHoroscopeCms record = existing.map(e -> {
            e.setFullContent(response.sections() != null ? response.sections().getOrDefault("general", null) : null);
            e.setLove(response.sections() != null ? response.sections().getOrDefault("love", null) : null);
            e.setCareer(response.sections() != null ? response.sections().getOrDefault("career", null) : null);
            e.setMoney(response.sections() != null ? response.sections().getOrDefault("money", null) : null);
            e.setHealth(response.sections() != null ? response.sections().getOrDefault("health", null) : null);
            e.setSocial(response.sections() != null ? response.sections().getOrDefault("advice", null) : null);
            e.setLuckyColor(response.meta() != null ? response.meta().getOrDefault("lucky_color", null) : null);
            e.setLuckyNumber(response.meta() != null ? response.meta().getOrDefault("lucky_number", null) : null);
            e.setExternalSnapshotJson(snapshotJson);
            e.setIngestedAt(LocalDateTime.now());
            e.setIngestError(null); // clear previous error on success
            e.setSourceType(WeeklyHoroscopeCms.SourceType.EXTERNAL_API);
            e.setStatus(WeeklyHoroscopeCms.Status.PUBLISHED);
            return e;
        }).orElseGet(() -> WeeklyHoroscopeCms.builder()
                .zodiacSign(sign)
                .weekStartDate(weekStart)
                .weekEndDate(weekEnd)
                .locale(locale)
                .fullContent(response.sections() != null ? response.sections().getOrDefault("general", null) : null)
                .love(response.sections() != null ? response.sections().getOrDefault("love", null) : null)
                .career(response.sections() != null ? response.sections().getOrDefault("career", null) : null)
                .money(response.sections() != null ? response.sections().getOrDefault("money", null) : null)
                .health(response.sections() != null ? response.sections().getOrDefault("health", null) : null)
                .social(response.sections() != null ? response.sections().getOrDefault("advice", null) : null)
                .luckyColor(response.meta() != null ? response.meta().getOrDefault("lucky_color", null) : null)
                .luckyNumber(response.meta() != null ? response.meta().getOrDefault("lucky_number", null) : null)
                .externalSnapshotJson(snapshotJson)
                .ingestedAt(LocalDateTime.now())
                .sourceType(WeeklyHoroscopeCms.SourceType.EXTERNAL_API)
                .status(WeeklyHoroscopeCms.Status.PUBLISHED)
                .build());

        WeeklyHoroscopeCms saved = weeklyRepo.save(record);
        if (adminId != null) {
            auditLogService.log(adminId, adminEmail, role,
                    AuditLog.ActionType.WEEKLY_HOROSCOPE_INGESTED, AuditLog.EntityType.WEEKLY_HOROSCOPE,
                    saved.getId().toString(), sign + " " + weekStart, null, null);
        }
        return saved;
    }

    // ----- Internal helpers -----

    /** Throws on any error so callers can capture the message and persist it. */
    private AstrologyHoroscopeResponse fetchFromAstrologyOrThrow(String url) {
        ResponseEntity<AstrologyHoroscopeResponse> resp =
                restTemplate.getForEntity(url, AstrologyHoroscopeResponse.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("HTTP " + resp.getStatusCode() + " — empty body");
        }
        return resp.getBody();
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AstrologyHoroscopeResponse(
            String sign,
            String period,
            Map<String, String> sections,
            java.util.List<String> highlights,
            Map<String, String> meta
    ) {}
}
