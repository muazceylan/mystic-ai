package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.monetization.AdminPurchaseEventService;
import com.mysticai.notification.admin.service.monetization.AdminPurchaseEventService.PurchaseEventFilter;
import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/v1/monetization/purchase-events")
@RequiredArgsConstructor
public class AdminPurchaseEventController {

    private final AdminPurchaseEventService service;

    @GetMapping
    public ResponseEntity<Page<PurchaseEvent>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) SubscriptionEntitlement.BillingProvider provider,
            @RequestParam(required = false) SubscriptionEntitlement.Store store,
            @RequestParam(required = false) String productId,
            @RequestParam(required = false) PurchaseEvent.EventType eventType,
            @RequestParam(required = false) PurchaseEvent.ProcessedStatus processedStatus,
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo) {

        var filter = new PurchaseEventFilter(
                userId, provider, store, productId, eventType, processedStatus,
                transactionId, dateFrom, dateTo);
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(service.list(filter, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseEvent> get(@PathVariable UUID id) {
        return ResponseEntity.ok(service.get(id));
    }
}
