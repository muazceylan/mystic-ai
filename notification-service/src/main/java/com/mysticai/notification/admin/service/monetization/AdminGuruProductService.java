package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.monetization.GuruProductCatalog;
import com.mysticai.notification.repository.GuruProductCatalogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminGuruProductService {

    private final GuruProductCatalogRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<GuruProductCatalog> findAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public GuruProductCatalog findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("GuruProductCatalog not found: " + id));
    }

    @Transactional
    public GuruProductCatalog create(GuruProductCatalog product,
                                      Long adminId, String adminEmail, AdminUser.Role role) {
        if (repository.existsByProductKey(product.getProductKey())) {
            throw new IllegalStateException("Product key already exists: " + product.getProductKey());
        }

        product.setCreatedByAdminId(adminId);
        product.setUpdatedByAdminId(adminId);

        GuruProductCatalog saved = repository.save(product);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.GURU_PRODUCT_CREATED,
                AuditLog.EntityType.GURU_PRODUCT,
                saved.getId().toString(), saved.getProductKey(),
                null, saved);

        log.info("Guru product created: productKey={}", saved.getProductKey());
        return saved;
    }

    @Transactional
    public GuruProductCatalog update(Long id, GuruProductCatalog updates,
                                      Long adminId, String adminEmail, AdminUser.Role role) {
        GuruProductCatalog existing = findById(id);

        existing.setTitle(updates.getTitle());
        existing.setDescription(updates.getDescription());
        existing.setProductType(updates.getProductType());
        existing.setGuruAmount(updates.getGuruAmount());
        existing.setBonusGuruAmount(updates.getBonusGuruAmount());
        existing.setPrice(updates.getPrice());
        existing.setCurrency(updates.getCurrency());
        existing.setIosProductId(updates.getIosProductId());
        existing.setAndroidProductId(updates.getAndroidProductId());
        existing.setEnabled(updates.isEnabled());
        existing.setSortOrder(updates.getSortOrder());
        existing.setBadge(updates.getBadge());
        existing.setCampaignLabel(updates.getCampaignLabel());
        existing.setRolloutStatus(updates.getRolloutStatus());
        existing.setLocaleTargetingJson(updates.getLocaleTargetingJson());
        existing.setRegionTargetingJson(updates.getRegionTargetingJson());
        existing.setStartDate(updates.getStartDate());
        existing.setEndDate(updates.getEndDate());
        existing.setUpdatedByAdminId(adminId);

        GuruProductCatalog saved = repository.save(existing);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.GURU_PRODUCT_UPDATED,
                AuditLog.EntityType.GURU_PRODUCT,
                saved.getId().toString(), saved.getProductKey(),
                null, saved);

        return saved;
    }

    @Transactional
    public GuruProductCatalog enable(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        GuruProductCatalog product = findById(id);
        product.setEnabled(true);
        product.setUpdatedByAdminId(adminId);

        GuruProductCatalog saved = repository.save(product);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.GURU_PRODUCT_ENABLED,
                AuditLog.EntityType.GURU_PRODUCT,
                saved.getId().toString(), saved.getProductKey(),
                null, saved);

        return saved;
    }

    @Transactional
    public GuruProductCatalog disable(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        GuruProductCatalog product = findById(id);
        product.setEnabled(false);
        product.setUpdatedByAdminId(adminId);

        GuruProductCatalog saved = repository.save(product);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.GURU_PRODUCT_DISABLED,
                AuditLog.EntityType.GURU_PRODUCT,
                saved.getId().toString(), saved.getProductKey(),
                null, saved);

        return saved;
    }
}
