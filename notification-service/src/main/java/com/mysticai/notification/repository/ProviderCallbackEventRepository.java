package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.ProviderCallbackEvent;
import com.mysticai.notification.entity.monetization.RewardProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProviderCallbackEventRepository extends JpaRepository<ProviderCallbackEvent, UUID> {

    /** Idempotency anchor: (provider, providerTransactionId) is unique. */
    Optional<ProviderCallbackEvent> findByProviderAndProviderTransactionId(
            RewardProvider provider, String providerTransactionId);

    boolean existsByProviderAndProviderTransactionId(
            RewardProvider provider, String providerTransactionId);
}
