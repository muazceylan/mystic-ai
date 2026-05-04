package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseEventRepository
        extends JpaRepository<PurchaseEvent, UUID>, JpaSpecificationExecutor<PurchaseEvent> {

    Optional<PurchaseEvent> findByProviderAndEventId(
            SubscriptionEntitlement.BillingProvider provider, String eventId);

    boolean existsByProviderAndEventId(
            SubscriptionEntitlement.BillingProvider provider, String eventId);

    Page<PurchaseEvent> findAllByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
