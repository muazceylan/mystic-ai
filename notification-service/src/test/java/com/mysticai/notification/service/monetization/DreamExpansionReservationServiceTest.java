package com.mysticai.notification.service.monetization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruTokenReservation;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.repository.GuruTokenReservationRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DreamExpansionReservationServiceTest {

    @Mock GuruTokenReservationRepository reservationRepository;
    @Mock GuruWalletRepository walletRepository;
    @Mock MonetizationActionRepository actionRepository;
    @Mock EntitlementService entitlementService;
    @Mock GuruWalletService walletService;

    DreamExpansionReservationService service;
    GuruWallet wallet;
    EntitlementService.EntitlementSnapshot entitlement;

    @BeforeEach
    void setUp() {
        service = new DreamExpansionReservationService(
                reservationRepository,
                walletRepository,
                actionRepository,
                entitlementService,
                walletService,
                new ObjectMapper()
        );
        wallet = GuruWallet.builder().userId(42L).currentBalance(3).build();
        entitlement = entitlement(true);
        lenient().when(entitlementService.getSnapshot(42L)).thenReturn(entitlement);
        lenient().when(walletService.getOrCreateWallet(42L)).thenReturn(wallet);
        lenient().when(walletRepository.findByUserIdForUpdate(42L)).thenReturn(Optional.of(wallet));
        lenient().when(walletService.getBalance(42L)).thenReturn(3);
        lenient().when(reservationRepository.sumActivePendingCost(eq(42L), any())).thenReturn(0L);
        lenient().when(actionRepository.findByActionKeyAndModuleKey(anyString(), eq("dreams")))
                .thenAnswer(invocation -> Optional.of(action(invocation.getArgument(0), 1)));
        lenient().when(reservationRepository.save(any())).thenAnswer(invocation -> {
            GuruTokenReservation row = invocation.getArgument(0);
            if (row.getId() == null) row.setId(UUID.randomUUID());
            if (row.getCreatedAt() == null) {
                row.setCreatedAt(LocalDateTime.now());
                row.setUpdatedAt(LocalDateTime.now());
            }
            return row;
        });
    }

    @Test
    void reserve_usesServerConfiguredCostAndCreatesPendingHold() {
        when(actionRepository.findByActionKeyAndModuleKey(
                "dream_expansion_emotional_analysis", "dreams"))
                .thenReturn(Optional.of(action("dream_expansion_emotional_analysis", 2)));

        var response = service.reserve(request("idem-1"));

        assertThat(response.cost()).isEqualTo(2);
        assertThat(response.status()).isEqualTo("PENDING");
        verify(reservationRepository).save(argThat(row ->
                row.getCost() == 2 && row.getDreamId().equals(99L)));
    }

    @Test
    void reserve_rejectsInsufficientAvailableBalanceIncludingPendingHolds() {
        when(reservationRepository.sumActivePendingCost(eq(42L), any())).thenReturn(3L);

        assertThatThrownBy(() -> service.reserve(request("idem-2")))
                .isInstanceOf(DreamExpansionReservationService.ReservationException.class)
                .extracting("code")
                .isEqualTo("INSUFFICIENT_GURU_BALANCE");
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void reserve_requiresPremiumEvenWhenWalletHasTokens() {
        entitlement = entitlement(false);
        when(entitlementService.getSnapshot(42L)).thenReturn(entitlement);

        assertThatThrownBy(() -> service.reserve(request("idem-3")))
                .isInstanceOf(DreamExpansionReservationService.ReservationException.class)
                .extracting("code")
                .isEqualTo("PREMIUM_REQUIRED");
    }

    @Test
    void reserve_sameIdempotencyReturnsExistingWithoutSecondHold() {
        GuruTokenReservation existing = reservation("idem-4", GuruTokenReservation.Status.PENDING);
        when(reservationRepository.findByIdempotencyKey("idem-4")).thenReturn(Optional.of(existing));

        var response = service.reserve(request("idem-4"));

        assertThat(response.reservationId()).isEqualTo(existing.getId());
        verify(walletRepository, never()).findByUserIdForUpdate(anyLong());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void expiredReservationCanBeRetriedWithSameIdempotencyKey() {
        GuruTokenReservation existing = reservation("idem-5", GuruTokenReservation.Status.PENDING);
        existing.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(reservationRepository.findByIdempotencyKey("idem-5")).thenReturn(Optional.of(existing));

        var response = service.reserve(request("idem-5"));

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.expiresAt()).isAfter(LocalDateTime.now());
        verify(reservationRepository).save(existing);
    }

    @Test
    void reservationUsesLatestAdminPriceAfterConfigWasViewed() {
        when(actionRepository.findByActionKeyAndModuleKey(
                "dream_expansion_emotional_analysis", "dreams"))
                .thenReturn(
                        Optional.of(action("dream_expansion_emotional_analysis", 1)),
                        Optional.of(action("dream_expansion_emotional_analysis", 2))
                );

        var config = service.getConfig(42L);

        assertThat(config.costs().get("EMOTIONAL_ANALYSIS")).isEqualTo(1);
        assertThatThrownBy(() -> service.reserve(new DreamExpansionReservationService.ReserveRequest(
                42L, 99L, "EMOTIONAL_ANALYSIS", "idem-price-change", config.pricingVersion())))
                .isInstanceOf(DreamExpansionReservationService.ReservationException.class)
                .satisfies(error -> {
                    var reservationError =
                            (DreamExpansionReservationService.ReservationException) error;
                    assertThat(reservationError.getCode()).isEqualTo("DREAM_EXPANSION_PRICE_CHANGED");
                    assertThat(reservationError.getCurrentCost()).isEqualTo(2);
                });
    }

    @Test
    void commitIsIdempotentAndCancelRefundsCommittedSpend() {
        GuruTokenReservation existing = reservation("idem-6", GuruTokenReservation.Status.PENDING);
        when(reservationRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        UUID ledgerId = UUID.randomUUID();
        when(walletService.commitDreamExpansion(anyLong(), anyInt(), anyString(), anyString(), anyString()))
                .thenReturn(GuruLedger.builder().id(ledgerId).build());

        var committed = service.commit(existing.getId(), settlement());
        var replay = service.commit(existing.getId(), settlement());
        var refunded = service.cancel(existing.getId(), settlement());

        assertThat(committed.ledgerTransactionId()).isEqualTo(ledgerId);
        assertThat(replay.status()).isEqualTo("COMMITTED");
        assertThat(refunded.status()).isEqualTo("REFUNDED");
        verify(walletService, times(1))
                .commitDreamExpansion(anyLong(), anyInt(), anyString(), anyString(), anyString());
        verify(walletService, times(1))
                .refundDreamExpansion(anyLong(), anyInt(), anyString(), anyString(), anyString());
    }

    private DreamExpansionReservationService.ReserveRequest request(String key) {
        String pricingVersion = service.getConfig(42L).pricingVersion();
        return new DreamExpansionReservationService.ReserveRequest(
                42L, 99L, "EMOTIONAL_ANALYSIS", key, pricingVersion);
    }

    private DreamExpansionReservationService.SettlementRequest settlement() {
        return new DreamExpansionReservationService.SettlementRequest(
                42L, UUID.randomUUID(), "dream-expansion-v1.0");
    }

    private GuruTokenReservation reservation(String key, GuruTokenReservation.Status status) {
        return GuruTokenReservation.builder()
                .id(UUID.randomUUID())
                .userId(42L)
                .dreamId(99L)
                .expansionType("EMOTIONAL_ANALYSIS")
                .actionKey("dream_expansion_emotional_analysis")
                .cost(1)
                .status(status)
                .idempotencyKey(key)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();
    }

    private MonetizationAction action(String actionKey, int cost) {
        return MonetizationAction.builder()
                .actionKey(actionKey)
                .moduleKey("dreams")
                .guruCost(cost)
                .isEnabled(true)
                .build();
    }

    private EntitlementService.EntitlementSnapshot entitlement(boolean premium) {
        return new EntitlementService.EntitlementSnapshot(
                premium,
                false,
                premium ? "ACTIVE" : "NONE",
                premium ? EntitlementService.DEFAULT_ENTITLEMENT_KEY : null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                premium ? java.util.List.of(EntitlementService.DEFAULT_ENTITLEMENT_KEY) : java.util.List.of(),
                3
        );
    }
}
