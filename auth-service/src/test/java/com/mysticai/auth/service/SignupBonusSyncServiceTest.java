package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.SignupBonusSyncProperties;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.SignupBonusSyncStatus;
import com.mysticai.auth.repository.UserRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SignupBonusSyncServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private MonetizationSignupBonusClient monetizationSignupBonusClient;

    private SignupBonusSyncService signupBonusSyncService;
    private Clock fixedClock;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-04-13T12:00:00Z"), ZoneOffset.UTC);
        SignupBonusSyncProperties properties = new SignupBonusSyncProperties(60, 90, 120, 50);
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        ObjectProvider<SignupBonusSyncService> selfProvider = new ObjectProvider<>() {
            @Override
            public SignupBonusSyncService getObject(Object... args) {
                return signupBonusSyncService;
            }

            @Override
            public SignupBonusSyncService getIfAvailable() {
                return signupBonusSyncService;
            }

            @Override
            public SignupBonusSyncService getIfUnique() {
                return signupBonusSyncService;
            }

            @Override
            public SignupBonusSyncService getObject() {
                return signupBonusSyncService;
            }
        };
        signupBonusSyncService = new SignupBonusSyncService(
                userRepository,
                monetizationSignupBonusClient,
                properties,
                fixedClock,
                meterRegistry,
                selfProvider
        );
    }

    @Test
    void attemptSignupBonusSync_marksGranted_whenClientSucceeds() {
        User user = pendingUser(101L);
        when(userRepository.findById(101L)).thenReturn(Optional.of(user));
        when(monetizationSignupBonusClient.grantSignupBonus(101L, "EMAIL_REGISTER", "tr"))
                .thenReturn(new MonetizationSignupBonusClient.SignupBonusResponse(
                        true, true, 10, 10, "signup_bonus_granted", "SIGNUP_BONUS", "EMAIL_REGISTER"));

        SignupBonusSyncService.SyncAttemptResult result = signupBonusSyncService.attemptSignupBonusSync(101L, "test");

        assertThat(result.status()).isEqualTo("granted");
        assertThat(user.getSignupBonusSyncStatus()).isEqualTo(SignupBonusSyncStatus.GRANTED);
        assertThat(user.getSignupBonusGrantedAt()).isEqualTo(LocalDateTime.now(fixedClock));
        assertThat(user.getSignupBonusNextRetryAt()).isNull();
    }

    @Test
    void attemptSignupBonusSync_schedulesRetry_whenClientFails() {
        User user = pendingUser(102L);
        when(userRepository.findById(102L)).thenReturn(Optional.of(user));
        when(monetizationSignupBonusClient.grantSignupBonus(102L, "EMAIL_REGISTER", "tr"))
                .thenThrow(new IllegalStateException("notification unavailable"));

        SignupBonusSyncService.SyncAttemptResult result = signupBonusSyncService.attemptSignupBonusSync(102L, "test");

        assertThat(result.status()).isEqualTo("retry_scheduled");
        assertThat(user.getSignupBonusSyncStatus()).isEqualTo(SignupBonusSyncStatus.PENDING);
        assertThat(user.getSignupBonusRetryCount()).isEqualTo(1);
        assertThat(user.getSignupBonusNextRetryAt()).isEqualTo(LocalDateTime.now(fixedClock).plusSeconds(60));
        assertThat(user.getSignupBonusLastError()).contains("notification unavailable");
    }

    @Test
    void attemptSignupBonusSync_marksSkipped_whenServerReturnsTerminalSkip() {
        User user = pendingUser(103L);
        when(userRepository.findById(103L)).thenReturn(Optional.of(user));
        when(monetizationSignupBonusClient.grantSignupBonus(103L, "EMAIL_REGISTER", "tr"))
                .thenReturn(new MonetizationSignupBonusClient.SignupBonusResponse(
                        false, false, 0, 0, "signup_bonus_disabled", "SIGNUP_BONUS", "EMAIL_REGISTER"));

        SignupBonusSyncService.SyncAttemptResult result = signupBonusSyncService.attemptSignupBonusSync(103L, "test");

        assertThat(result.status()).isEqualTo("signup_bonus_disabled");
        assertThat(user.getSignupBonusSyncStatus()).isEqualTo(SignupBonusSyncStatus.SKIPPED);
        assertThat(user.getSignupBonusNextRetryAt()).isNull();
    }

    @Test
    void findRetryCandidateIds_delegatesToRepository() {
        when(userRepository.findSignupBonusRetryCandidateIds(eq(SignupBonusSyncStatus.PENDING), any(), any()))
                .thenReturn(List.of(201L, 202L));

        List<Long> result = signupBonusSyncService.findRetryCandidateIds();

        assertThat(result).containsExactly(201L, 202L);
    }

    @Test
    void attemptSignupBonusSync_skipsAlreadyGrantedUsers() {
        User user = pendingUser(104L);
        user.setSignupBonusSyncStatus(SignupBonusSyncStatus.GRANTED);
        user.setSignupBonusGrantedAt(LocalDateTime.now(fixedClock));
        when(userRepository.findById(104L)).thenReturn(Optional.of(user));

        SignupBonusSyncService.SyncAttemptResult result = signupBonusSyncService.attemptSignupBonusSync(104L, "test");

        assertThat(result.status()).isEqualTo("already_granted");
        verify(monetizationSignupBonusClient, never()).grantSignupBonus(any(), any(), any());
    }

    private User pendingUser(Long id) {
        return User.builder()
                .id(id)
                .username("user-" + id)
                .email("user-" + id + "@example.com")
                .preferredLanguage("tr")
                .signupBonusSyncStatus(SignupBonusSyncStatus.PENDING)
                .signupBonusRegistrationSource("EMAIL_REGISTER")
                .signupBonusRetryCount(0)
                .signupBonusNextRetryAt(LocalDateTime.now(fixedClock).minusMinutes(1))
                .build();
    }
}
