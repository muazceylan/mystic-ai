package com.mysticai.notification.admin.service.cms;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.admin.spec.PrayerContentSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.PrayerContent;
import com.mysticai.notification.repository.PrayerContentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrayerContentService {

    private final PrayerContentRepository repository;
    private final AuditLogService auditLogService;

    public Page<PrayerContent> findAll(PrayerContent.Status status, PrayerContent.Category category,
                                       PrayerContent.ContentType contentType,
                                       String locale, Boolean isFeatured, Boolean isPremium,
                                       Pageable pageable) {
        return repository.findAll(
                PrayerContentSpec.filter(status, category, contentType, locale, isFeatured, isPremium),
                pageable);
    }

    public PrayerContent findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prayer not found: " + id));
    }

    public List<PrayerContent> findPublishedForLocale(String locale) {
        return repository.findByLocaleAndStatusAndIsActiveTrueOrderByIdAsc(locale, PrayerContent.Status.PUBLISHED);
    }

    public List<PrayerContent> findFeaturedForLocale(String locale) {
        return repository.findByLocaleAndStatusAndIsFeaturedTrueAndIsActiveTrueOrderByIdAsc(locale, PrayerContent.Status.PUBLISHED);
    }

    @Transactional
    public PrayerContent create(PrayerContent data, Long adminId, String adminEmail, AdminUser.Role role) {
        if (data.getTitle() == null || data.getTitle().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }
        if (data.getLocale() == null || data.getLocale().isBlank()) {
            throw new IllegalArgumentException("locale is required");
        }

        data.setCreatedByAdminId(adminId);
        data.setUpdatedByAdminId(adminId);
        if (data.getStatus() == null) data.setStatus(PrayerContent.Status.DRAFT);
        if (data.getCategory() == null) data.setCategory(PrayerContent.Category.GENERAL);

        PrayerContent saved = repository.save(data);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.PRAYER_CREATED, AuditLog.EntityType.PRAYER,
                saved.getId().toString(), saved.getTitle(), null, saved);
        return saved;
    }

    @Transactional
    public PrayerContent update(Long id, PrayerContent updates,
                                 Long adminId, String adminEmail, AdminUser.Role role) {
        PrayerContent existing = findById(id);
        if (existing.getStatus() == PrayerContent.Status.ARCHIVED) {
            throw new IllegalArgumentException("Cannot update an ARCHIVED prayer");
        }

        PrayerContent old = cloneForAudit(existing);

        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getArabicText() != null) existing.setArabicText(updates.getArabicText());
        if (updates.getTransliteration() != null) existing.setTransliteration(updates.getTransliteration());
        if (updates.getMeaning() != null) existing.setMeaning(updates.getMeaning());
        if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
        if (updates.getSuggestedCount() != null) existing.setSuggestedCount(updates.getSuggestedCount());
        if (updates.getTags() != null) existing.setTags(updates.getTags());
        if (updates.getAudioUrl() != null) existing.setAudioUrl(updates.getAudioUrl());
        existing.setPremium(updates.isPremium());
        existing.setActive(updates.isActive());
        existing.setUpdatedByAdminId(adminId);

        PrayerContent saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.PRAYER_UPDATED, AuditLog.EntityType.PRAYER,
                saved.getId().toString(), saved.getTitle(), old, saved);
        return saved;
    }

    @Transactional
    public PrayerContent publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        PrayerContent existing = findById(id);
        if (existing.getStatus() == PrayerContent.Status.ARCHIVED) {
            throw new IllegalArgumentException("Cannot publish an ARCHIVED prayer");
        }
        existing.setStatus(PrayerContent.Status.PUBLISHED);
        existing.setUpdatedByAdminId(adminId);
        PrayerContent saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.PRAYER_PUBLISHED, AuditLog.EntityType.PRAYER,
                saved.getId().toString(), saved.getTitle(), null, saved);
        return saved;
    }

    @Transactional
    public PrayerContent archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        PrayerContent existing = findById(id);
        existing.setStatus(PrayerContent.Status.ARCHIVED);
        existing.setActive(false);
        existing.setUpdatedByAdminId(adminId);
        PrayerContent saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.PRAYER_ARCHIVED, AuditLog.EntityType.PRAYER,
                saved.getId().toString(), saved.getTitle(), null, null);
        return saved;
    }

    @Transactional
    public PrayerContent setFeatured(Long id, boolean featured, Long adminId, String adminEmail, AdminUser.Role role) {
        PrayerContent existing = findById(id);
        existing.setFeatured(featured);
        existing.setUpdatedByAdminId(adminId);
        PrayerContent saved = repository.save(existing);
        AuditLog.ActionType action = featured
                ? AuditLog.ActionType.PRAYER_FEATURED
                : AuditLog.ActionType.PRAYER_UNFEATURED;
        auditLogService.log(adminId, adminEmail, role, action, AuditLog.EntityType.PRAYER,
                saved.getId().toString(), saved.getTitle(), null, null);
        return saved;
    }

    private PrayerContent cloneForAudit(PrayerContent src) {
        return PrayerContent.builder()
                .id(src.getId()).title(src.getTitle()).category(src.getCategory())
                .locale(src.getLocale()).status(src.getStatus())
                .isFeatured(src.isFeatured()).isPremium(src.isPremium()).isActive(src.isActive())
                .suggestedCount(src.getSuggestedCount()).tags(src.getTags())
                .build();
    }
}
