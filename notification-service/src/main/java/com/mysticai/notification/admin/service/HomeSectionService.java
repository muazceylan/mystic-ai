package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.HomeSectionSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.HomeSection;
import com.mysticai.notification.repository.HomeSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HomeSectionService {

    private final HomeSectionRepository repository;
    private final AuditLogService auditLogService;

    public Page<HomeSection> findAll(HomeSection.SectionType type, HomeSection.Status status,
                                     Boolean isActive, String locale, Pageable pageable) {
        return repository.findAll(HomeSectionSpec.filter(type, status, isActive, locale), pageable);
    }

    public HomeSection findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HomeSection not found: " + id));
    }

    @Transactional
    public HomeSection create(HomeSection section, Long adminId, String adminEmail, AdminUser.Role role) {
        if (repository.existsBySectionKey(section.getSectionKey()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "sectionKey already exists: " + section.getSectionKey());
        section.setCreatedByAdminId(adminId);
        section.setUpdatedByAdminId(adminId);
        HomeSection saved = repository.save(section);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.HOME_SECTION_CREATED, AuditLog.EntityType.HOME_SECTION,
                saved.getId().toString(), saved.getSectionKey(), null, saved);
        return saved;
    }

    @Transactional
    public HomeSection update(Long id, HomeSection updates, Long adminId, String adminEmail, AdminUser.Role role) {
        HomeSection existing = findById(id);
        String old = snapshot(existing);
        existing.setTitle(updates.getTitle());
        existing.setSubtitle(updates.getSubtitle());
        existing.setType(updates.getType());
        existing.setSortOrder(updates.getSortOrder());
        existing.setRouteKey(updates.getRouteKey());
        existing.setFallbackRouteKey(updates.getFallbackRouteKey());
        existing.setIcon(updates.getIcon());
        existing.setImageUrl(updates.getImageUrl());
        existing.setCtaLabel(updates.getCtaLabel());
        existing.setBadgeLabel(updates.getBadgeLabel());
        existing.setStartDate(updates.getStartDate());
        existing.setEndDate(updates.getEndDate());
        existing.setLocale(updates.getLocale());
        existing.setPayloadJson(updates.getPayloadJson());
        existing.setUpdatedByAdminId(adminId);
        HomeSection saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.HOME_SECTION_UPDATED, AuditLog.EntityType.HOME_SECTION,
                saved.getId().toString(), saved.getSectionKey(), old, snapshot(saved));
        return saved;
    }

    @Transactional
    public HomeSection publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        HomeSection section = findById(id);
        if (section.getTitle() == null || section.getTitle().isBlank())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "title is required to publish");
        section.setStatus(HomeSection.Status.PUBLISHED);
        section.setActive(true);
        section.setPublishedAt(LocalDateTime.now());
        section.setUpdatedByAdminId(adminId);
        HomeSection saved = repository.save(section);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.HOME_SECTION_PUBLISHED, AuditLog.EntityType.HOME_SECTION,
                saved.getId().toString(), saved.getSectionKey(), null, null);
        return saved;
    }

    @Transactional
    public HomeSection archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        HomeSection section = findById(id);
        section.setStatus(HomeSection.Status.ARCHIVED);
        section.setActive(false);
        section.setUpdatedByAdminId(adminId);
        HomeSection saved = repository.save(section);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.HOME_SECTION_ARCHIVED, AuditLog.EntityType.HOME_SECTION,
                saved.getId().toString(), saved.getSectionKey(), null, null);
        return saved;
    }

    @Transactional
    public HomeSection activate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        HomeSection section = findById(id);
        section.setActive(true);
        section.setUpdatedByAdminId(adminId);
        HomeSection saved = repository.save(section);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.HOME_SECTION_ACTIVATED, AuditLog.EntityType.HOME_SECTION,
                saved.getId().toString(), saved.getSectionKey(), null, null);
        return saved;
    }

    @Transactional
    public HomeSection deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        HomeSection section = findById(id);
        section.setActive(false);
        section.setUpdatedByAdminId(adminId);
        HomeSection saved = repository.save(section);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.HOME_SECTION_DEACTIVATED, AuditLog.EntityType.HOME_SECTION,
                saved.getId().toString(), saved.getSectionKey(), null, null);
        return saved;
    }


    /** Public endpoint: PUBLISHED + active + within date window, locale-first with fallback */
    public java.util.List<HomeSection> findPublishedActive(String locale, java.time.LocalDateTime now) {
        java.util.List<HomeSection> sections = repository
                .findByStatusAndIsActiveTrueAndLocaleOrderBySortOrderAsc(HomeSection.Status.PUBLISHED, locale);
        if (sections.isEmpty())
            sections = repository.findByStatusAndIsActiveTrueOrderBySortOrderAsc(HomeSection.Status.PUBLISHED);
        return sections.stream()
                .filter(s -> s.getStartDate() == null || !s.getStartDate().isAfter(now))
                .filter(s -> s.getEndDate() == null || !s.getEndDate().isBefore(now))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void reorder(Map<Long, Integer> orderMap, Long adminId) {
        orderMap.forEach((sectionId, sortOrder) ->
                repository.findById(sectionId).ifPresent(s -> {
                    s.setSortOrder(sortOrder);
                    s.setUpdatedByAdminId(adminId);
                    repository.save(s);
                })
        );
    }

    private String snapshot(HomeSection s) {
        return "{\"title\":\"" + s.getTitle() + "\",\"status\":\"" + s.getStatus() + "\",\"isActive\":" + s.isActive() + "}";
    }
}
