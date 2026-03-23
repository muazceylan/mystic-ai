package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.GuruProductCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface GuruProductCatalogRepository
        extends JpaRepository<GuruProductCatalog, Long>, JpaSpecificationExecutor<GuruProductCatalog> {

    Optional<GuruProductCatalog> findByProductKey(String productKey);

    List<GuruProductCatalog> findAllByIsEnabledTrueOrderBySortOrderAsc();

    List<GuruProductCatalog> findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(
            GuruProductCatalog.RolloutStatus rolloutStatus);

    boolean existsByProductKey(String productKey);

    boolean existsByIosProductId(String iosProductId);

    boolean existsByAndroidProductId(String androidProductId);
}
