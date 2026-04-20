package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SignupBonusServiceTest {

    @Mock MonetizationSettingsRepository settingsRepository;
    @Mock GuruWalletRepository walletRepository;
    @Mock GuruLedgerRepository ledgerRepository;
    @Mock GuruWalletService guruWalletService;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) MeterRegistry meterRegistry;

    @InjectMocks SignupBonusService service;

    @Test
    void grantSignupBonus_grantsConfiguredAmountOnce() {
        MonetizationSettings settings = MonetizationSettings.builder()
                .settingsKey("default")
                .isEnabled(true)
                .isSignupBonusEnabled(true)
                .signupBonusTokenAmount(10)
                .signupBonusLedgerReason("SIGNUP_BONUS")
                .isSignupBonusOneTimeOnly(true)
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();
        GuruLedger ledger = GuruLedger.builder()
                .id(UUID.randomUUID())
                .transactionType(GuruLedger.TransactionType.WELCOME_BONUS)
                .idempotencyKey("signup_bonus:77")
                .build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(ledgerRepository.existsByIdempotencyKey("signup_bonus:77")).thenReturn(false);
        doReturn(ledger).when(guruWalletService)
                .grantGuru(anyLong(), anyInt(), any(), any(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        when(walletRepository.findByUserId(77L)).thenReturn(Optional.of(GuruWallet.builder().userId(77L).currentBalance(10).build()));

        SignupBonusService.SignupBonusResult result = service.grantSignupBonus(77L, "EMAIL_REGISTER", "AUTH_SERVICE", "tr");

        assertThat(result.granted()).isTrue();
        assertThat(result.amountGranted()).isEqualTo(10);
        assertThat(result.currentBalance()).isEqualTo(10);
    }

    @Test
    void grantSignupBonus_duplicateReplayDoesNotGrantAgain() {
        MonetizationSettings settings = MonetizationSettings.builder()
                .settingsKey("default")
                .isEnabled(true)
                .isSignupBonusEnabled(true)
                .signupBonusTokenAmount(10)
                .signupBonusLedgerReason("SIGNUP_BONUS")
                .isSignupBonusOneTimeOnly(true)
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();
        GuruLedger ledger = GuruLedger.builder()
                .id(UUID.randomUUID())
                .transactionType(GuruLedger.TransactionType.WELCOME_BONUS)
                .idempotencyKey("signup_bonus:77")
                .build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(ledgerRepository.existsByIdempotencyKey("signup_bonus:77")).thenReturn(true);
        doReturn(ledger).when(guruWalletService)
                .grantGuru(anyLong(), anyInt(), any(), any(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        when(walletRepository.findByUserId(77L)).thenReturn(Optional.of(GuruWallet.builder().userId(77L).currentBalance(10).build()));

        SignupBonusService.SignupBonusResult result = service.grantSignupBonus(77L, "EMAIL_REGISTER", "AUTH_SERVICE", "tr");

        assertThat(result.granted()).isFalse();
        assertThat(result.status()).isEqualTo("signup_bonus_already_granted");
    }

    @Test
    void grantSignupBonus_skipsWhenRegistrationSourceFilteredOut() {
        MonetizationSettings settings = MonetizationSettings.builder()
                .settingsKey("default")
                .isEnabled(true)
                .isSignupBonusEnabled(true)
                .signupBonusTokenAmount(10)
                .signupBonusRegistrationSource("SOCIAL_GOOGLE")
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));

        SignupBonusService.SignupBonusResult result = service.grantSignupBonus(77L, "EMAIL_REGISTER", "AUTH_SERVICE", "tr");

        assertThat(result.granted()).isFalse();
        assertThat(result.status()).isEqualTo("registration_source_filtered");
        verify(guruWalletService, never()).grantGuru(anyLong(), anyInt(), any(), any(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }
}
