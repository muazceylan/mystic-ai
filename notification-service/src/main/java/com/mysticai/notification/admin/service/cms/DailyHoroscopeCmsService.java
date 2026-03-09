package com.mysticai.notification.admin.service.cms;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.admin.spec.DailyHoroscopeSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.DailyHoroscopeCms;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import com.mysticai.notification.repository.DailyHoroscopeCmsRepository;
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
public class DailyHoroscopeCmsService {

    private final DailyHoroscopeCmsRepository repository;
    private final AuditLogService auditLogService;

    public Page<DailyHoroscopeCms> findAll(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign,
            DailyHoroscopeCms.Status status,
            DailyHoroscopeCms.SourceType sourceType,
            String locale,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {
        return repository.findAll(
                DailyHoroscopeSpec.filter(zodiacSign, status, sourceType, locale, dateFrom, dateTo),
                pageable);
    }

    public DailyHoroscopeCms findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Daily horoscope not found: " + id));
    }

    @Transactional
    public DailyHoroscopeCms create(DailyHoroscopeCms data, Long adminId, String adminEmail, AdminUser.Role role) {
        if (data.getZodiacSign() == null) throw new IllegalArgumentException("zodiacSign is required");
        if (data.getDate() == null) throw new IllegalArgumentException("date is required");
        if (data.getLocale() == null || data.getLocale().isBlank()) throw new IllegalArgumentException("locale is required");

        repository.findByZodiacSignAndDateAndLocale(data.getZodiacSign(), data.getDate(), data.getLocale())
                .ifPresent(e -> {
                    throw new IllegalArgumentException(
                            "Daily horoscope already exists for " + data.getZodiacSign()
                                    + " / " + data.getDate() + " / " + data.getLocale());
                });

        data.setCreatedByAdminId(adminId);
        data.setUpdatedByAdminId(adminId);
        if (data.getStatus() == null) data.setStatus(DailyHoroscopeCms.Status.DRAFT);
        if (data.getSourceType() == null) data.setSourceType(DailyHoroscopeCms.SourceType.ADMIN_CREATED);

        DailyHoroscopeCms saved = repository.save(data);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.DAILY_HOROSCOPE_CREATED, AuditLog.EntityType.DAILY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getDate(), null, saved);
        return saved;
    }

    @Transactional
    public DailyHoroscopeCms update(Long id, DailyHoroscopeCms updates,
                                     Long adminId, String adminEmail, AdminUser.Role role) {
        DailyHoroscopeCms existing = findById(id);
        if (existing.getStatus() == DailyHoroscopeCms.Status.ARCHIVED) {
            throw new IllegalArgumentException("Cannot update an ARCHIVED horoscope");
        }

        DailyHoroscopeCms old = cloneForAudit(existing);

        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getShortSummary() != null) existing.setShortSummary(updates.getShortSummary());
        if (updates.getFullContent() != null) existing.setFullContent(updates.getFullContent());
        if (updates.getLove() != null) existing.setLove(updates.getLove());
        if (updates.getCareer() != null) existing.setCareer(updates.getCareer());
        if (updates.getMoney() != null) existing.setMoney(updates.getMoney());
        if (updates.getHealth() != null) existing.setHealth(updates.getHealth());
        if (updates.getLuckyColor() != null) existing.setLuckyColor(updates.getLuckyColor());
        if (updates.getLuckyNumber() != null) existing.setLuckyNumber(updates.getLuckyNumber());
        existing.setOverrideActive(updates.isOverrideActive());
        existing.setUpdatedByAdminId(adminId);
        existing.setIngestError(null); // clear any previous ingest error on admin save

        // Mark as admin-overridden whenever admin touches an API-sourced record
        if (existing.getSourceType() == DailyHoroscopeCms.SourceType.EXTERNAL_API) {
            existing.setSourceType(DailyHoroscopeCms.SourceType.ADMIN_OVERRIDDEN);
        }

        DailyHoroscopeCms saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.DAILY_HOROSCOPE_UPDATED, AuditLog.EntityType.DAILY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getDate(), old, saved);
        return saved;
    }

    @Transactional
    public DailyHoroscopeCms publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        DailyHoroscopeCms existing = findById(id);
        if (existing.getStatus() == DailyHoroscopeCms.Status.ARCHIVED) {
            throw new IllegalArgumentException("Cannot publish an ARCHIVED horoscope");
        }
        existing.setStatus(DailyHoroscopeCms.Status.PUBLISHED);
        existing.setUpdatedByAdminId(adminId);
        DailyHoroscopeCms saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.DAILY_HOROSCOPE_PUBLISHED, AuditLog.EntityType.DAILY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getDate(), null, saved);
        return saved;
    }

    @Transactional
    public DailyHoroscopeCms archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        DailyHoroscopeCms existing = findById(id);
        existing.setStatus(DailyHoroscopeCms.Status.ARCHIVED);
        existing.setUpdatedByAdminId(adminId);
        DailyHoroscopeCms saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.DAILY_HOROSCOPE_ARCHIVED, AuditLog.EntityType.DAILY_HOROSCOPE,
                saved.getId().toString(), saved.getZodiacSign() + " " + saved.getDate(), null, null);
        return saved;
    }

    private DailyHoroscopeCms cloneForAudit(DailyHoroscopeCms src) {
        return DailyHoroscopeCms.builder()
                .id(src.getId()).zodiacSign(src.getZodiacSign()).date(src.getDate())
                .locale(src.getLocale()).status(src.getStatus()).sourceType(src.getSourceType())
                .title(src.getTitle()).shortSummary(src.getShortSummary()).fullContent(src.getFullContent())
                .love(src.getLove()).career(src.getCareer()).money(src.getMoney()).health(src.getHealth())
                .isOverrideActive(src.isOverrideActive())
                .build();
    }
}
