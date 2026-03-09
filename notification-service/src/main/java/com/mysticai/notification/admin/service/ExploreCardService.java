package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.ExploreCardSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.cms.ExploreCard;
import com.mysticai.notification.repository.ExploreCardRepository;
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
public class ExploreCardService {

    private final ExploreCardRepository repository;
    private final AuditLogService auditLogService;

    public Page<ExploreCard> findAll(String categoryKey, ExploreCard.Status status, Boolean isActive,
                                      Boolean isFeatured, Boolean isPremium, String locale, Pageable pageable) {
        return repository.findAll(ExploreCardSpec.filter(categoryKey, status, isActive, isFeatured, isPremium, locale), pageable);
    }

    public ExploreCard findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ExploreCard not found: " + id));
    }

    @Transactional
    public ExploreCard create(ExploreCard card, Long adminId, String adminEmail, AdminUser.Role role) {
        if (repository.existsByCardKey(card.getCardKey()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cardKey already exists: " + card.getCardKey());
        card.setCreatedByAdminId(adminId);
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_CREATED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, saved);
        return saved;
    }

    @Transactional
    public ExploreCard update(Long id, ExploreCard updates, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard existing = findById(id);
        if (updates.getCategoryKey() != null && !updates.getCategoryKey().isBlank())
            existing.setCategoryKey(updates.getCategoryKey());
        existing.setTitle(updates.getTitle());
        existing.setSubtitle(updates.getSubtitle());
        existing.setDescription(updates.getDescription());
        existing.setImageUrl(updates.getImageUrl());
        existing.setRouteKey(updates.getRouteKey());
        existing.setFallbackRouteKey(updates.getFallbackRouteKey());
        existing.setCtaLabel(updates.getCtaLabel());
        existing.setSortOrder(updates.getSortOrder());
        existing.setStartDate(updates.getStartDate());
        existing.setEndDate(updates.getEndDate());
        existing.setLocale(updates.getLocale());
        existing.setPayloadJson(updates.getPayloadJson());
        existing.setPremium(updates.isPremium());
        existing.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_UPDATED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCard publish(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard card = findById(id);
        if (card.getTitle() == null || card.getTitle().isBlank())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "title is required to publish");
        card.setStatus(ExploreCard.Status.PUBLISHED);
        card.setActive(true);
        card.setPublishedAt(LocalDateTime.now());
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_PUBLISHED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCard archive(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard card = findById(id);
        card.setStatus(ExploreCard.Status.ARCHIVED);
        card.setActive(false);
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_ARCHIVED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCard activate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard card = findById(id);
        card.setActive(true);
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_ACTIVATED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCard deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard card = findById(id);
        card.setActive(false);
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_DEACTIVATED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCard feature(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard card = findById(id);
        card.setFeatured(true);
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_FEATURED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }

    @Transactional
    public ExploreCard unfeature(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        ExploreCard card = findById(id);
        card.setFeatured(false);
        card.setUpdatedByAdminId(adminId);
        ExploreCard saved = repository.save(card);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.EXPLORE_CARD_UNFEATURED, AuditLog.EntityType.EXPLORE_CARD,
                saved.getId().toString(), saved.getCardKey(), null, null);
        return saved;
    }


    /** Public endpoint: PUBLISHED + active + optional categoryKey filter + date window */
    public java.util.List<ExploreCard> findPublishedActive(String categoryKey, String locale, java.time.LocalDateTime now) {
        java.util.List<ExploreCard> cards;
        if (categoryKey != null && !categoryKey.isBlank()) {
            cards = repository.findByStatusAndIsActiveTrueAndCategoryKeyAndLocaleOrderBySortOrderAsc(
                    ExploreCard.Status.PUBLISHED, categoryKey, locale);
            if (cards.isEmpty())
                cards = repository.findByStatusAndIsActiveTrueAndCategoryKeyOrderBySortOrderAsc(
                        ExploreCard.Status.PUBLISHED, categoryKey);
        } else {
            cards = repository.findByStatusAndIsActiveTrueAndLocaleOrderBySortOrderAsc(
                    ExploreCard.Status.PUBLISHED, locale);
        }
        return cards.stream()
                .filter(c -> c.getStartDate() == null || !c.getStartDate().isAfter(now))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(now))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void reorder(Map<Long, Integer> orderMap, Long adminId) {
        orderMap.forEach((cardId, sortOrder) ->
                repository.findById(cardId).ifPresent(c -> {
                    c.setSortOrder(sortOrder);
                    c.setUpdatedByAdminId(adminId);
                    repository.save(c);
                })
        );
    }
}
