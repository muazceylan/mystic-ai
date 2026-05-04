package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import com.mysticai.notification.repository.PurchaseEventRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Admin observability for the {@link PurchaseEvent} log. Read-only;
 * filtering is done with a {@link Specification} so the admin UI can mix
 * any subset of {userId, provider, store, productId, eventType,
 * processedStatus, dateFrom, dateTo} without N hand-written queries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminPurchaseEventService {

    private final PurchaseEventRepository repository;

    @Transactional(readOnly = true)
    public Page<PurchaseEvent> list(PurchaseEventFilter filter, Pageable pageable) {
        return repository.findAll(toSpec(filter), pageable);
    }

    @Transactional(readOnly = true)
    public PurchaseEvent get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("PurchaseEvent not found: " + id));
    }

    private Specification<PurchaseEvent> toSpec(PurchaseEventFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (filter.userId() != null) {
                predicates.add(cb.equal(root.get("userId"), filter.userId()));
            }
            if (filter.provider() != null) {
                predicates.add(cb.equal(root.get("provider"), filter.provider()));
            }
            if (filter.store() != null) {
                predicates.add(cb.equal(root.get("store"), filter.store()));
            }
            if (filter.productId() != null && !filter.productId().isBlank()) {
                predicates.add(cb.equal(root.get("productId"), filter.productId()));
            }
            if (filter.eventType() != null) {
                predicates.add(cb.equal(root.get("eventType"), filter.eventType()));
            }
            if (filter.processedStatus() != null) {
                predicates.add(cb.equal(root.get("processedStatus"), filter.processedStatus()));
            }
            if (filter.transactionId() != null && !filter.transactionId().isBlank()) {
                predicates.add(cb.or(
                        cb.equal(root.get("transactionId"), filter.transactionId()),
                        cb.equal(root.get("originalTransactionId"), filter.transactionId())
                ));
            }
            if (filter.dateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.dateFrom()));
            }
            if (filter.dateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.dateTo()));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public record PurchaseEventFilter(
            Long userId,
            SubscriptionEntitlement.BillingProvider provider,
            SubscriptionEntitlement.Store store,
            String productId,
            PurchaseEvent.EventType eventType,
            PurchaseEvent.ProcessedStatus processedStatus,
            String transactionId,
            LocalDateTime dateFrom,
            LocalDateTime dateTo
    ) {}
}
