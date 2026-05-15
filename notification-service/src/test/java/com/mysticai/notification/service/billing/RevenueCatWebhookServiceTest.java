package com.mysticai.notification.service.billing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruProductCatalog;
import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruProductCatalogRepository;
import com.mysticai.notification.repository.PurchaseEventRepository;
import com.mysticai.notification.repository.SubscriptionEntitlementRepository;
import com.mysticai.notification.service.monetization.EntitlementService;
import com.mysticai.notification.service.monetization.GuruWalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevenueCatWebhookServiceTest {

    @Mock PurchaseEventRepository purchaseEventRepository;
    @Mock SubscriptionEntitlementRepository entitlementRepository;
    @Mock GuruProductCatalogRepository productRepository;
    @Mock GuruLedgerRepository ledgerRepository;
    @Mock GuruWalletService walletService;
    @Mock EntitlementService entitlementService;

    RevenueCatWebhookService service;

    @BeforeEach
    void setUp() {
        RevenueCatWebhookProperties properties = new RevenueCatWebhookProperties();
        service = new RevenueCatWebhookService(
                new RevenueCatEventNormalizer(new ObjectMapper()),
                properties,
                purchaseEventRepository,
                entitlementRepository,
                productRepository,
                ledgerRepository,
                walletService,
                entitlementService);

        lenient().when(purchaseEventRepository.save(any(PurchaseEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void tokenPurchase_guruTokens50_creditsFiftyGuruOnce() {
        String payload = revenueCatPayload("event-token-50", "NON_RENEWING_PURCHASE", "42",
                "guru_tokens_50", "tx-token-50", null);
        GuruProductCatalog product = product("token_50", GuruProductCatalog.ProductType.CONSUMABLE,
                "guru_tokens_50", null, 50);
        GuruLedger ledger = GuruLedger.builder().amount(50).idempotencyKey("iap").build();

        when(purchaseEventRepository.findByProviderAndEventId(
                SubscriptionEntitlement.BillingProvider.REVENUECAT, "event-token-50"))
                .thenReturn(Optional.empty());
        when(productRepository.findByProductKey("guru_tokens_50")).thenReturn(Optional.empty());
        when(productRepository.findAll()).thenReturn(List.of(product));
        when(walletService.grantGuru(eq(42L), eq(50), eq(GuruLedger.TransactionType.PURCHASE_COMPLETED),
                eq(GuruLedger.SourceType.PURCHASE_IAP), eq("token_50"), eq(null), eq(null),
                eq("PLAY_STORE"), eq(null),
                eq("iap:REVENUECAT:PLAY_STORE:tx-token-50:guru_tokens_50"), eq(null)))
                .thenReturn(ledger);

        RevenueCatWebhookService.DispatchResult result = service.process(payload);

        assertThat(result).isEqualTo(RevenueCatWebhookService.DispatchResult.PROCESSED);
        verify(walletService).grantGuru(eq(42L), eq(50), any(), any(), eq("token_50"),
                eq(null), eq(null), eq("PLAY_STORE"), eq(null),
                eq("iap:REVENUECAT:PLAY_STORE:tx-token-50:guru_tokens_50"), eq(null));
    }

    @Test
    void duplicateWebhookEvent_doesNotCreditWalletTwice() {
        PurchaseEvent existing = PurchaseEvent.builder()
                .provider(SubscriptionEntitlement.BillingProvider.REVENUECAT)
                .eventId("event-dup")
                .processedStatus(PurchaseEvent.ProcessedStatus.PROCESSED)
                .build();

        when(purchaseEventRepository.findByProviderAndEventId(
                SubscriptionEntitlement.BillingProvider.REVENUECAT, "event-dup"))
                .thenReturn(Optional.of(existing));

        RevenueCatWebhookService.DispatchResult result = service.process(
                revenueCatPayload("event-dup", "NON_RENEWING_PURCHASE", "42",
                        "guru_tokens_50", "tx-dup", null));

        assertThat(result).isEqualTo(RevenueCatWebhookService.DispatchResult.DUPLICATE);
        verify(walletService, never()).grantGuru(any(), anyInt(), any(), any(), any(),
                any(), any(), any(), any(), any(), any());
    }

    @Test
    void unknownProductId_returnsFailedWithoutCrashing() {
        String payload = revenueCatPayload("event-unknown", "NON_RENEWING_PURCHASE", "42",
                "unknown_product", "tx-unknown", null);

        when(purchaseEventRepository.findByProviderAndEventId(
                SubscriptionEntitlement.BillingProvider.REVENUECAT, "event-unknown"))
                .thenReturn(Optional.empty());
        when(productRepository.findByProductKey("unknown_product")).thenReturn(Optional.empty());
        when(productRepository.findAll()).thenReturn(List.of());

        RevenueCatWebhookService.DispatchResult result = service.process(payload);

        assertThat(result).isEqualTo(RevenueCatWebhookService.DispatchResult.FAILED);
        verify(walletService, never()).grantGuru(any(), anyInt(), any(), any(), any(),
                any(), any(), any(), any(), any(), any());
    }

    @Test
    void subscriptionProductWithBasePlanSuffix_normalizesToMonthlyCatalogProduct() {
        String payload = revenueCatPayload("event-monthly", "INITIAL_PURCHASE", "42",
                "astroguru_premium_monthly:monthly-autorenewing", "tx-monthly", null);
        GuruProductCatalog monthly = product("premium_monthly", GuruProductCatalog.ProductType.SUBSCRIPTION,
                "astroguru_premium_monthly", EntitlementService.DEFAULT_ENTITLEMENT_KEY, 0);
        SubscriptionEntitlement entitlement = SubscriptionEntitlement.builder()
                .userId(42L)
                .entitlementKey(EntitlementService.DEFAULT_ENTITLEMENT_KEY)
                .provider(SubscriptionEntitlement.BillingProvider.REVENUECAT)
                .build();

        when(purchaseEventRepository.findByProviderAndEventId(
                SubscriptionEntitlement.BillingProvider.REVENUECAT, "event-monthly"))
                .thenReturn(Optional.empty());
        when(productRepository.findByProductKey("astroguru_premium_monthly")).thenReturn(Optional.empty());
        when(productRepository.findAll()).thenReturn(List.of(monthly));
        when(entitlementService.findOrCreateForWebhook(eq(42L), eq(EntitlementService.DEFAULT_ENTITLEMENT_KEY),
                eq(SubscriptionEntitlement.BillingProvider.REVENUECAT), eq("tx-monthly")))
                .thenReturn(entitlement);
        when(entitlementService.applyAndSave(eq(entitlement), any(), any()))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    Consumer<SubscriptionEntitlement> mutator = invocation.getArgument(2);
                    mutator.accept(entitlement);
                    return entitlement;
                });

        RevenueCatWebhookService.DispatchResult result = service.process(payload);

        assertThat(result).isEqualTo(RevenueCatWebhookService.DispatchResult.PROCESSED);
        verify(entitlementService).findOrCreateForWebhook(eq(42L), eq("Astro Guru Pro"),
                eq(SubscriptionEntitlement.BillingProvider.REVENUECAT), eq("tx-monthly"));
    }

    @Test
    void subscriptionProductWithoutSuffix_stillWorks() {
        String payload = revenueCatPayload("event-yearly", "INITIAL_PURCHASE", "42",
                "astroguru_premium_yearly", "tx-yearly", "Astro Guru Pro");
        SubscriptionEntitlement entitlement = SubscriptionEntitlement.builder()
                .userId(42L)
                .entitlementKey("Astro Guru Pro")
                .provider(SubscriptionEntitlement.BillingProvider.REVENUECAT)
                .build();

        when(purchaseEventRepository.findByProviderAndEventId(
                SubscriptionEntitlement.BillingProvider.REVENUECAT, "event-yearly"))
                .thenReturn(Optional.empty());
        when(entitlementService.findOrCreateForWebhook(eq(42L), eq("Astro Guru Pro"),
                eq(SubscriptionEntitlement.BillingProvider.REVENUECAT), eq("tx-yearly")))
                .thenReturn(entitlement);
        when(entitlementService.applyAndSave(eq(entitlement), any(), any()))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    Consumer<SubscriptionEntitlement> mutator = invocation.getArgument(2);
                    mutator.accept(entitlement);
                    return entitlement;
                });

        RevenueCatWebhookService.DispatchResult result = service.process(payload);

        assertThat(result).isEqualTo(RevenueCatWebhookService.DispatchResult.PROCESSED);
        verify(entitlementService).findOrCreateForWebhook(eq(42L), eq("Astro Guru Pro"),
                eq(SubscriptionEntitlement.BillingProvider.REVENUECAT), eq("tx-yearly"));
    }

    @Test
    void tokenPurchase_guruTokens1200_creditsTwelveHundredGuru() {
        String payload = revenueCatPayload("event-token-1200", "NON_RENEWING_PURCHASE", "42",
                "guru_tokens_1200", "tx-token-1200", null);
        GuruProductCatalog product = product("token_1200", GuruProductCatalog.ProductType.CONSUMABLE,
                "guru_tokens_1200", null, 1200);

        when(purchaseEventRepository.findByProviderAndEventId(
                SubscriptionEntitlement.BillingProvider.REVENUECAT, "event-token-1200"))
                .thenReturn(Optional.empty());
        when(productRepository.findByProductKey("guru_tokens_1200")).thenReturn(Optional.empty());
        when(productRepository.findAll()).thenReturn(List.of(product));
        when(walletService.grantGuru(eq(42L), eq(1200), any(), any(), eq("token_1200"),
                eq(null), eq(null), eq("PLAY_STORE"), eq(null),
                eq("iap:REVENUECAT:PLAY_STORE:tx-token-1200:guru_tokens_1200"), eq(null)))
                .thenReturn(GuruLedger.builder().amount(1200).build());

        RevenueCatWebhookService.DispatchResult result = service.process(payload);

        assertThat(result).isEqualTo(RevenueCatWebhookService.DispatchResult.PROCESSED);
        verify(walletService).grantGuru(eq(42L), eq(1200), any(), any(), eq("token_1200"),
                eq(null), eq(null), eq("PLAY_STORE"), eq(null),
                eq("iap:REVENUECAT:PLAY_STORE:tx-token-1200:guru_tokens_1200"), eq(null));
    }

    private static GuruProductCatalog product(String productKey,
                                               GuruProductCatalog.ProductType type,
                                               String productId,
                                               String entitlementKey,
                                               int guruAmount) {
        return GuruProductCatalog.builder()
                .productKey(productKey)
                .productType(type)
                .revenueCatProductId(productId)
                .androidProductId(productId)
                .iosProductId(productId)
                .entitlementKey(entitlementKey)
                .guruAmount(guruAmount)
                .bonusGuruAmount(0)
                .title(productKey)
                .build();
    }

    private static String revenueCatPayload(String eventId,
                                            String type,
                                            String appUserId,
                                            String productId,
                                            String transactionId,
                                            String entitlementId) {
        long purchasedAtMs = LocalDateTime.of(2026, 5, 15, 12, 0)
                .toInstant(ZoneOffset.UTC)
                .toEpochMilli();
        String entitlementField = entitlementId == null
                ? ""
                : ",\"entitlement_ids\":[\"" + entitlementId + "\"]";
        return """
                {
                  "event": {
                    "id": "%s",
                    "type": "%s",
                    "app_user_id": "%s",
                    "product_id": "%s",
                    "transaction_id": "%s",
                    "original_transaction_id": "%s",
                    "store": "PLAY_STORE",
                    "environment": "SANDBOX",
                    "purchased_at_ms": %d
                    %s
                  }
                }
                """.formatted(eventId, type, appUserId, productId, transactionId, transactionId,
                purchasedAtMs, entitlementField);
    }
}
