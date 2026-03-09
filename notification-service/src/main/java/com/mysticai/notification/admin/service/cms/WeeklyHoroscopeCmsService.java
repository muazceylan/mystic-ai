package com.mysticai.notification.admin.service.cms;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.admin.spec.WeeklyHoroscopeSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import com.mysticai.notification.repository.WeeklyHoroscopeCmsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklyHoroscopeCmsService {

    private final WeeklyHoroscopeCmsRepository repository;
    private final AuditLogService auditLogService;

    public Page<WeeklyHoroscopeCms> findAll(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign,
            WeeklyHoroscopeCms.Status status,
            WeeklyHoroscopeCms.SourceType sourceType,
            String locale,
            LocalDate weekStartFrom,
            LocalDate weekStartTo,
            Pageable pageable) {
        return repository.findAll(
                WeeklyHoroscopeSpec.filter(zodiacSign, status, sourceType, locale, weekStartFrom, weekStartTo),
                pageable);
    }

    public WeeklyHoroscopeCms findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Weekly horoscope not found: " + id));
    }

    @Transactional
    public WeeklyHoroscopeCms create(WeeklyHoroscopeCms data, Long adminId, String adminEmail, AdminUser.Role role) {
        if (data.getWeekStartDate() == null || data.getWeekEndDate() == null) {
            throw new IllegalArgumentException("weekStartDate and weekEndDate are required");
        }
        if (data.getWeekEndDate().isBefore(data.getWeekStartDate())) {
            throw new IllegalArgumentException("weekEndDate must be after weekStartDate");
        }
        if (data.getZodiacSign() == null) throw new IllegalArgumentException("zodiacSign is required");
        if (data.getLocale() == null || data.getLocale().isBlank()) throw new IllegalArgumentException("locale is required");

        // Check uniqueness
        repository.findByZodiacSignAndWeekStartDateAndLocale(
                data.getZodiacSign(), data.getWeekStartDate(), data.getLocale())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            "Weekly horoscope already exists for " + data.getZodiacSign()
                                    + " / " + data.getWeekStartDate() + " / " + data.getLocale());
                });

        data.setCreatedByAdminId(adminId);
        data.setUpdatedByAdminId(adminId);
        if (data.getStatus() == null) data.setStatus(WeeklyHoroscopeCms.Status.DRAFT);
        if (data.getSourceType() == null) data.setSourceType(WeeklyHoroscopeCms.SourceType.ADMIN_CREATED);

        WeeklyHoroscopeCms saved = repository.save(data);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.WEEKLY_HOROSCOPE_CREATED, AuditLog.EntityType.WEEKLY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getWeekStartDate(), null, saved);
        return saved;
    }

    @Transactional
    public WeeklyHoroscopeCms update(Long id, WeeklyHoroscopeCms updates,
                                      Long adminId, String adminEmail, AdminUser.Role role) {
        WeeklyHoroscopeCms existing = findById(id);

        if (existing.getStatus() == WeeklyHoroscopeCms.Status.ARCHIVED) {
            throw new IllegalArgumentException("Cannot update an ARCHIVED horoscope");
        }

        WeeklyHoroscopeCms old = cloneForAudit(existing);

        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getShortSummary() != null) existing.setShortSummary(updates.getShortSummary());
        if (updates.getFullContent() != null) existing.setFullContent(updates.getFullContent());
        if (updates.getLove() != null) existing.setLove(updates.getLove());
        if (updates.getCareer() != null) existing.setCareer(updates.getCareer());
        if (updates.getMoney() != null) existing.setMoney(updates.getMoney());
        if (updates.getHealth() != null) existing.setHealth(updates.getHealth());
        if (updates.getSocial() != null) existing.setSocial(updates.getSocial());
        if (updates.getLuckyDay() != null) existing.setLuckyDay(updates.getLuckyDay());
        if (updates.getCautionDay() != null) existing.setCautionDay(updates.getCautionDay());
        if (updates.getLuckyColor() != null) existing.setLuckyColor(updates.getLuckyColor());
        if (updates.getLuckyNumber() != null) existing.setLuckyNumber(updates.getLuckyNumber());
        existing.setOverrideActive(updates.isOverrideActive());
        existing.setUpdatedByAdminId(adminId);
        existing.setIngestError(null); // clear any previous ingest error on admin save

        // Mark as admin-overridden whenever admin touches an API-sourced record
        if (existing.getSourceType() == WeeklyHoroscopeCms.SourceType.EXTERNAL_API) {
            existing.setSourceType(WeeklyHoroscopeCms.SourceType.ADMIN_OVERRIDDEN);
        }

        WeeklyHoroscopeCms saved = repository.save(existing);
        AuditLog.ActionType actionType = updates.isOverrideActive()
                ? AuditLog.ActionType.WEEKLY_HOROSCOPE_OVERRIDE_SET
                : AuditLog.ActionType.WEEKLY_HOROSCOPE_UPDATED;
        auditLogService.log(adminId, adminEmail, role, actionType,
                AuditLog.EntityType.WEEKLY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getWeekStartDate(), old, saved);
        return saved;
    }

    @Transactional
    public WeeklyHoroscopeCms publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        WeeklyHoroscopeCms existing = findById(id);
        if (existing.getStatus() == WeeklyHoroscopeCms.Status.ARCHIVED) {
            throw new IllegalArgumentException("Cannot publish an ARCHIVED horoscope");
        }
        existing.setStatus(WeeklyHoroscopeCms.Status.PUBLISHED);
        existing.setUpdatedByAdminId(adminId);
        WeeklyHoroscopeCms saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.WEEKLY_HOROSCOPE_PUBLISHED, AuditLog.EntityType.WEEKLY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getWeekStartDate(), null, saved);
        return saved;
    }

    @Transactional
    public WeeklyHoroscopeCms archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        WeeklyHoroscopeCms existing = findById(id);
        existing.setStatus(WeeklyHoroscopeCms.Status.ARCHIVED);
        existing.setUpdatedByAdminId(adminId);
        WeeklyHoroscopeCms saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.WEEKLY_HOROSCOPE_ARCHIVED, AuditLog.EntityType.WEEKLY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getWeekStartDate(), null, null);
        return saved;
    }

    private WeeklyHoroscopeCms cloneForAudit(WeeklyHoroscopeCms src) {
        return WeeklyHoroscopeCms.builder()
                .id(src.getId()).zodiacSign(src.getZodiacSign()).weekStartDate(src.getWeekStartDate())
                .locale(src.getLocale()).status(src.getStatus()).sourceType(src.getSourceType())
                .title(src.getTitle()).shortSummary(src.getShortSummary()).fullContent(src.getFullContent())
                .love(src.getLove()).career(src.getCareer()).money(src.getMoney())
                .health(src.getHealth()).social(src.getSocial())
                .luckyDay(src.getLuckyDay()).cautionDay(src.getCautionDay())
                .isOverrideActive(src.isOverrideActive())
                .build();
    }
}
