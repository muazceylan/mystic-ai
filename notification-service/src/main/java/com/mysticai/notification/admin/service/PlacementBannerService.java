package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.PlacementBannerSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.PlacementBanner;
import com.mysticai.notification.repository.PlacementBannerRepository;
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
public class PlacementBannerService {

    private final PlacementBannerRepository repository;
    private final AuditLogService auditLogService;

    public Page<PlacementBanner> findAll(PlacementBanner.PlacementType placementType, PlacementBanner.Status status,
                                          Boolean isActive, String locale, Pageable pageable) {
        return repository.findAll(PlacementBannerSpec.filter(placementType, status, isActive, locale), pageable);
    }

    public PlacementBanner findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PlacementBanner not found: " + id));
    }

    @Transactional
    public PlacementBanner create(PlacementBanner banner, Long adminId, String adminEmail, AdminUser.Role role) {
        if (repository.existsByBannerKey(banner.getBannerKey()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "bannerKey already exists: " + banner.getBannerKey());
        if (banner.getImageUrl() == null || banner.getImageUrl().isBlank())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "imageUrl is required");
        banner.setCreatedByAdminId(adminId);
        banner.setUpdatedByAdminId(adminId);
        PlacementBanner saved = repository.save(banner);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.BANNER_CREATED, AuditLog.EntityType.BANNER,
                saved.getId().toString(), saved.getBannerKey(), null, saved);
        return saved;
    }

    @Transactional
    public PlacementBanner update(Long id, PlacementBanner updates, Long adminId, String adminEmail, AdminUser.Role role) {
        PlacementBanner existing = findById(id);
        existing.setPlacementType(updates.getPlacementType());
        existing.setTitle(updates.getTitle());
        existing.setSubtitle(updates.getSubtitle());
        existing.setImageUrl(updates.getImageUrl());
        existing.setCtaLabel(updates.getCtaLabel());
        existing.setRouteKey(updates.getRouteKey());
        existing.setFallbackRouteKey(updates.getFallbackRouteKey());
        existing.setPriority(updates.getPriority());
        existing.setStartDate(updates.getStartDate());
        existing.setEndDate(updates.getEndDate());
        existing.setLocale(updates.getLocale());
        existing.setUpdatedByAdminId(adminId);
        PlacementBanner saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.BANNER_UPDATED, AuditLog.EntityType.BANNER,
                saved.getId().toString(), saved.getBannerKey(), null, null);
        return saved;
    }

    @Transactional
    public PlacementBanner publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        PlacementBanner banner = findById(id);
        if (banner.getImageUrl() == null || banner.getImageUrl().isBlank())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "imageUrl is required to publish");
        banner.setStatus(PlacementBanner.Status.PUBLISHED);
        banner.setActive(true);
        banner.setPublishedAt(LocalDateTime.now());
        banner.setUpdatedByAdminId(adminId);
        PlacementBanner saved = repository.save(banner);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.BANNER_PUBLISHED, AuditLog.EntityType.BANNER,
                saved.getId().toString(), saved.getBannerKey(), null, null);
        return saved;
    }

    @Transactional
    public PlacementBanner archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        PlacementBanner banner = findById(id);
        banner.setStatus(PlacementBanner.Status.ARCHIVED);
        banner.setActive(false);
        banner.setUpdatedByAdminId(adminId);
        PlacementBanner saved = repository.save(banner);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.BANNER_ARCHIVED, AuditLog.EntityType.BANNER,
                saved.getId().toString(), saved.getBannerKey(), null, null);
        return saved;
    }

    @Transactional
    public PlacementBanner activate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        PlacementBanner banner = findById(id);
        banner.setActive(true);
        banner.setUpdatedByAdminId(adminId);
        PlacementBanner saved = repository.save(banner);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.BANNER_ACTIVATED, AuditLog.EntityType.BANNER,
                saved.getId().toString(), saved.getBannerKey(), null, null);
        return saved;
    }

    @Transactional
    public PlacementBanner deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        PlacementBanner banner = findById(id);
        banner.setActive(false);
        banner.setUpdatedByAdminId(adminId);
        PlacementBanner saved = repository.save(banner);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.BANNER_DEACTIVATED, AuditLog.EntityType.BANNER,
                saved.getId().toString(), saved.getBannerKey(), null, null);
        return saved;
    }


    /** Public endpoint: PUBLISHED + active + placementType + date window */
    public java.util.List<PlacementBanner> findPublishedActive(
            PlacementBanner.PlacementType placementType, String locale, java.time.LocalDateTime now) {
        java.util.List<PlacementBanner> banners = repository
                .findByPlacementTypeAndStatusAndIsActiveTrueAndLocaleOrderByPriorityAsc(
                        placementType, PlacementBanner.Status.PUBLISHED, locale);
        if (banners.isEmpty())
            banners = repository.findByPlacementTypeAndStatusAndIsActiveTrueOrderByPriorityAsc(
                    placementType, PlacementBanner.Status.PUBLISHED);
        return banners.stream()
                .filter(b -> b.getStartDate() == null || !b.getStartDate().isAfter(now))
                .filter(b -> b.getEndDate() == null || !b.getEndDate().isBefore(now))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void reorder(Map<Long, Integer> priorityMap, Long adminId) {
        priorityMap.forEach((bannerId, priority) ->
                repository.findById(bannerId).ifPresent(b -> {
                    b.setPriority(priority);
                    b.setUpdatedByAdminId(adminId);
                    repository.save(b);
                })
        );
    }
}
