package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionEntitlementRepository extends JpaRepository<SubscriptionEntitlement, Long> {

    List<SubscriptionEntitlement> findAllByUserId(Long userId);

    Optional<SubscriptionEntitlement> findFirstByUserIdAndEntitlementKeyOrderByUpdatedAtDesc(
            Long userId, String entitlementKey);

    Optional<SubscriptionEntitlement> findFirstByProviderAndOriginalTransactionIdOrderByUpdatedAtDesc(
            SubscriptionEntitlement.BillingProvider provider, String originalTransactionId);
}
