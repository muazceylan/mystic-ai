package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GuruWalletServiceTest {

    @Mock GuruWalletRepository walletRepository;
    @Mock GuruLedgerRepository ledgerRepository;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) MeterRegistry meterRegistry;

    @InjectMocks GuruWalletService service;

    private static final Long USER_ID = 42L;
    private static final String IDEM_KEY = "reward-abc-123";

    // ── earnReward ────────────────────────────────────────────────────────────

    @Test
    void earnReward_happyPath_updatesBalanceAndCreatesLedger() {
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(10).lifetimeEarned(10).build();
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuruLedger result = service.earnReward(USER_ID, 5, "ad_01", "dreams", "view_interpretation",
                "ios", "tr", IDEM_KEY);

        assertThat(wallet.getCurrentBalance()).isEqualTo(15);
        assertThat(wallet.getLifetimeEarned()).isEqualTo(15);
        assertThat(result.getTransactionType()).isEqualTo(GuruLedger.TransactionType.REWARD_EARNED);
        assertThat(result.getSourceType()).isEqualTo(GuruLedger.SourceType.REWARDED_AD);
        assertThat(result.getAmount()).isEqualTo(5);
        assertThat(result.getBalanceBefore()).isEqualTo(10);
        assertThat(result.getBalanceAfter()).isEqualTo(15);
        assertThat(result.getIdempotencyKey()).isEqualTo(IDEM_KEY);
        verify(walletRepository).save(wallet);
        verify(ledgerRepository).save(any(GuruLedger.class));
    }

    @Test
    void earnReward_duplicateIdempotencyKey_returnsExistingWithoutDoubleCredit() {
        GuruLedger existing = GuruLedger.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .amount(5)
                .idempotencyKey(IDEM_KEY)
                .transactionType(GuruLedger.TransactionType.REWARD_EARNED)
                .sourceType(GuruLedger.SourceType.REWARDED_AD)
                .balanceBefore(10)
                .balanceAfter(15)
                .build();

        when(ledgerRepository.existsByIdempotencyKey(IDEM_KEY)).thenReturn(true);
        when(ledgerRepository.findByIdempotencyKey(IDEM_KEY)).thenReturn(Optional.of(existing));

        GuruLedger result = service.earnReward(USER_ID, 5, "ad_01", "dreams", "view",
                "ios", "tr", IDEM_KEY);

        assertThat(result).isSameAs(existing);
        verify(walletRepository, never()).findByUserIdForUpdate(any());
        verify(walletRepository, never()).save(any());
    }

    // ── spendGuru ─────────────────────────────────────────────────────────────

    @Test
    void spendGuru_happyPath_decrementsBalanceAndCreatesLedger() {
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(10).lifetimeSpent(5).build();
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuruLedger result = service.spendGuru(USER_ID, 3, "dreams", "view_interpretation",
                "ios", "tr", "spend-xyz");

        assertThat(wallet.getCurrentBalance()).isEqualTo(7);
        assertThat(wallet.getLifetimeSpent()).isEqualTo(8);
        assertThat(result.getTransactionType()).isEqualTo(GuruLedger.TransactionType.GURU_SPENT);
        assertThat(result.getSourceType()).isEqualTo(GuruLedger.SourceType.ACTION_UNLOCK);
        assertThat(result.getAmount()).isEqualTo(-3);
        assertThat(result.getBalanceBefore()).isEqualTo(10);
        assertThat(result.getBalanceAfter()).isEqualTo(7);
    }

    @Test
    void spendGuru_insufficientBalance_throwsIllegalArgument() {
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(2).build();
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));

        assertThatThrownBy(() -> service.spendGuru(USER_ID, 5, "dreams", "view",
                "ios", "tr", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Insufficient Guru balance");
    }

    @Test
    void spendGuru_duplicateIdempotencyKey_returnsExistingWithoutDoubleSpend() {
        String spendIdem = "spend-dup-1";
        GuruLedger existing = GuruLedger.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .amount(-3)
                .idempotencyKey(spendIdem)
                .transactionType(GuruLedger.TransactionType.GURU_SPENT)
                .sourceType(GuruLedger.SourceType.ACTION_UNLOCK)
                .balanceBefore(10)
                .balanceAfter(7)
                .build();

        when(ledgerRepository.existsByIdempotencyKey(spendIdem)).thenReturn(true);
        when(ledgerRepository.findByIdempotencyKey(spendIdem)).thenReturn(Optional.of(existing));

        GuruLedger result = service.spendGuru(USER_ID, 3, "dreams", "view",
                "ios", "tr", spendIdem);

        assertThat(result).isSameAs(existing);
        verify(walletRepository, never()).findByUserIdForUpdate(any());
        verify(walletRepository, never()).save(any());
    }

    // ── processPurchase ───────────────────────────────────────────────────────

    @Test
    void processPurchase_happyPath_updatesLifetimePurchased() {
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(5).lifetimePurchased(0).build();
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuruLedger result = service.processPurchase(USER_ID, 100, "guru_pack_100",
                "android", "en", "purchase-001");

        assertThat(wallet.getCurrentBalance()).isEqualTo(105);
        assertThat(wallet.getLifetimePurchased()).isEqualTo(100);
        assertThat(result.getTransactionType()).isEqualTo(GuruLedger.TransactionType.PURCHASE_COMPLETED);
        assertThat(result.getSourceType()).isEqualTo(GuruLedger.SourceType.GURU_PURCHASE);
        assertThat(result.getSourceKey()).isEqualTo("guru_pack_100");
        assertThat(result.getAmount()).isEqualTo(100);
        assertThat(result.getBalanceBefore()).isEqualTo(5);
        assertThat(result.getBalanceAfter()).isEqualTo(105);
    }

    @Test
    void processPurchase_duplicateIdempotencyKey_idempotent() {
        String purchaseIdem = "purchase-dup-1";
        GuruLedger existing = GuruLedger.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .amount(100)
                .idempotencyKey(purchaseIdem)
                .transactionType(GuruLedger.TransactionType.PURCHASE_COMPLETED)
                .sourceType(GuruLedger.SourceType.GURU_PURCHASE)
                .balanceBefore(5)
                .balanceAfter(105)
                .build();

        when(ledgerRepository.existsByIdempotencyKey(purchaseIdem)).thenReturn(true);
        when(ledgerRepository.findByIdempotencyKey(purchaseIdem)).thenReturn(Optional.of(existing));

        GuruLedger result = service.processPurchase(USER_ID, 100, "guru_pack_100",
                "android", "en", purchaseIdem);

        assertThat(result).isSameAs(existing);
        verify(walletRepository, never()).save(any());
    }

    // ── adminAdjust ───────────────────────────────────────────────────────────

    @Test
    void adminAdjust_grantPositiveAmount_increasesBalance() {
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(10).build();
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuruLedger result = service.adminAdjust(USER_ID, 50,
                GuruLedger.TransactionType.ADMIN_GRANT, "loyalty bonus", 1L);

        assertThat(wallet.getCurrentBalance()).isEqualTo(60);
        assertThat(result.getSourceType()).isEqualTo(GuruLedger.SourceType.ADMIN);
        assertThat(result.getAmount()).isEqualTo(50);
        assertThat(result.getBalanceBefore()).isEqualTo(10);
        assertThat(result.getBalanceAfter()).isEqualTo(60);
        assertThat(result.getSourceKey()).isEqualTo("admin:1");
    }

    @Test
    void adminAdjust_revokeThatWouldGoBelowZero_throwsException() {
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(10).build();
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));

        assertThatThrownBy(() -> service.adminAdjust(USER_ID, -20,
                GuruLedger.TransactionType.ADMIN_REVOKE, "fraud", 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("negative balance");
    }

    // ── getBalance ────────────────────────────────────────────────────────────

    @Test
    void getBalance_nonExistentUser_returnsZero() {
        when(walletRepository.findByUserId(999L)).thenReturn(Optional.empty());

        int balance = service.getBalance(999L);

        assertThat(balance).isEqualTo(0);
    }
}
