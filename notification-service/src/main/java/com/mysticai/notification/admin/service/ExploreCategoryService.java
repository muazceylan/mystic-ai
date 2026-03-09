package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.ExploreCategorySpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.ExploreCategory;
import com.mysticai.notification.repository.ExploreCategoryRepository;
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
public class ExploreCategoryService {

    private final ExploreCategoryRepository repository;
    private final AuditLogService auditLogService;

    public Page<ExploreCategory> findAll(ExploreCategory.Status status, Boolean isActive,
                                          String locale, Pageable pageable) {
        return repository.findAll(ExploreCategorySpec.filter(status, isActive, locale), pageable);
    }

    public ExploreCategory findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ExploreCategory not found: " + id));
    }

    @Transactional
    public ExploreCategory create(ExploreCategory category, Long adminId, String adminEmail, AdminUser.Role role) {
        if (repository.existsByCategoryKey(category.getCategoryKey()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "categoryKey already exists: " + category.getCategoryKey());
        category.setCreatedByAdminId(adminId);
        category.setUpdatedByAdminId(adminId);
        ExploreCategory saved = repository.save(category);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CATEGORY_CREATED, AuditLog.EntityType.EXPLORE_CATEGORY,
                saved.getId().toString(), saved.getCategoryKey(), null, saved);
        return saved;
    }

    @Transactional
    public ExploreCategory update(Long id, ExploreCategory updates, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCategory existing = findById(id);
        existing.setTitle(updates.getTitle());
        existing.setSubtitle(updates.getSubtitle());
        existing.setIcon(updates.getIcon());
        existing.setSortOrder(updates.getSortOrder());
        existing.setStartDate(updates.getStartDate());
        existing.setEndDate(updates.getEndDate());
        existing.setLocale(updates.getLocale());
        existing.setUpdatedByAdminId(adminId);
        ExploreCategory saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CATEGORY_UPDATED, AuditLog.EntityType.EXPLORE_CATEGORY,
                saved.getId().toString(), saved.getCategoryKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCategory publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCategory category = findById(id);
        if (category.getTitle() == null || category.getTitle().isBlank())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "title is required to publish");
        category.setStatus(ExploreCategory.Status.PUBLISHED);
        category.setActive(true);
        category.setPublishedAt(LocalDateTime.now());
        category.setUpdatedByAdminId(adminId);
        ExploreCategory saved = repository.save(category);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CATEGORY_PUBLISHED, AuditLog.EntityType.EXPLORE_CATEGORY,
                saved.getId().toString(), saved.getCategoryKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCategory archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCategory category = findById(id);
        category.setStatus(ExploreCategory.Status.ARCHIVED);
        category.setActive(false);
        category.setUpdatedByAdminId(adminId);
        ExploreCategory saved = repository.save(category);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CATEGORY_ARCHIVED, AuditLog.EntityType.EXPLORE_CATEGORY,
                saved.getId().toString(), saved.getCategoryKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCategory activate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCategory category = findById(id);
        category.setActive(true);
        category.setUpdatedByAdminId(adminId);
        ExploreCategory saved = repository.save(category);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CATEGORY_ACTIVATED, AuditLog.EntityType.EXPLORE_CATEGORY,
                saved.getId().toString(), saved.getCategoryKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCategory deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCategory category = findById(id);
        category.setActive(false);
        category.setUpdatedByAdminId(adminId);
        ExploreCategory saved = repository.save(category);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CATEGORY_DEACTIVATED, AuditLog.EntityType.EXPLORE_CATEGORY,
                saved.getId().toString(), saved.getCategoryKey(), null, null);
        return saved;
    }


    /** Public endpoint: PUBLISHED + active + within date window */
    public java.util.List<ExploreCategory> findPublishedActive(String locale, java.time.LocalDateTime now) {
        java.util.List<ExploreCategory> cats = repository
                .findByStatusAndIsActiveTrueAndLocaleOrderBySortOrderAsc(ExploreCategory.Status.PUBLISHED, locale);
        if (cats.isEmpty())
            cats = repository.findByStatusAndIsActiveTrueOrderBySortOrderAsc(ExploreCategory.Status.PUBLISHED);
        return cats.stream()
                .filter(c -> c.getStartDate() == null || !c.getStartDate().isAfter(now))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(now))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void reorder(Map<Long, Integer> orderMap, Long adminId) {
        orderMap.forEach((catId, sortOrder) ->
                repository.findById(catId).ifPresent(c -> {
                    c.setSortOrder(sortOrder);
                    c.setUpdatedByAdminId(adminId);
                    repository.save(c);
                })
        );
    }
}
