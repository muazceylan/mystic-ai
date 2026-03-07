package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import com.mysticai.auth.dto.ChangePasswordRequest;
import com.mysticai.auth.dto.SetPasswordRequest;
import com.mysticai.auth.dto.UserDTO;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.exception.domain.PasswordAlreadySetException;
import com.mysticai.auth.exception.domain.PasswordMismatchException;
import com.mysticai.auth.exception.domain.WrongPasswordException;
import com.mysticai.auth.messaging.EmailVerificationPublisher;
import com.mysticai.auth.messaging.PasswordResetEmailPublisher;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.repository.token.EmailVerificationTokenRepository;
import com.mysticai.auth.repository.token.PasswordResetTokenRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordUnitTest {

    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationTokenRepository verificationTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailVerificationPublisher emailVerificationPublisher;
    @Mock private PasswordResetEmailPublisher passwordResetEmailPublisher;
    @Mock private VerificationProperties verificationProperties;
    private PasswordResetProperties passwordResetProperties;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private SocialTokenVerifier socialTokenVerifier;
    @Mock private NatalChartProvisioningService natalChartProvisioningService;

    private AuthService authService;

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-01-01T12:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        passwordResetProperties = new PasswordResetProperties("reset-pepper", 48, 30, 60, 5, 3, 30);
        authService = new AuthService(
                userRepository, verificationTokenRepository, passwordResetTokenRepository, emailVerificationPublisher,
                passwordResetEmailPublisher, verificationProperties, passwordResetProperties, passwordEncoder, jwtTokenProvider,
                authenticationManager, socialTokenVerifier, natalChartProvisioningService,
                FIXED_CLOCK
        );
    }

    private User socialUser() {
        return User.builder()
                .id(1L)
                .username("google_123")
                .email("social@test.com")
                .password("placeholder")
                .provider("google")
                .socialId("123")
                .hasLocalPassword(false)
                .roles(Set.of("USER"))
                .enabled(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
    }

    private User localUser() {
        return User.builder()
                .id(2L)
                .username("local@test.com")
                .email("local@test.com")
                .password("encoded_old_pass")
                .hasLocalPassword(true)
                .roles(Set.of("USER"))
                .enabled(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
    }

    // ── setPassword tests ──

    @Test
    void setPassword_succeeds_for_social_user() {
        User user = socialUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPass123")).thenReturn("encoded_new");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDTO result = authService.setPassword(1L, new SetPasswordRequest("NewPass123", "NewPass123"));

        assertThat(result.hasPassword()).isTrue();
        assertThat(user.getHasLocalPassword()).isTrue();
    }

    @Test
    void setPassword_throws_PasswordMismatchException_when_passwords_dont_match() {
        assertThatThrownBy(() ->
                authService.setPassword(1L, new SetPasswordRequest("NewPass123", "Different1"))
        ).isInstanceOf(PasswordMismatchException.class);
    }

    @Test
    void setPassword_throws_PasswordAlreadySetException_when_hasLocalPassword_true() {
        User user = localUser();
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() ->
                authService.setPassword(2L, new SetPasswordRequest("NewPass123", "NewPass123"))
        ).isInstanceOf(PasswordAlreadySetException.class);
    }

    // ── changePassword tests ──

    @Test
    void changePassword_succeeds_for_local_user() {
        User user = localUser();
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldpass", "encoded_old_pass")).thenReturn(true);
        when(passwordEncoder.matches("NewPass123", "encoded_old_pass")).thenReturn(false);
        when(passwordEncoder.encode("NewPass123")).thenReturn("encoded_new");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDTO result = authService.changePassword(2L,
                new ChangePasswordRequest("oldpass", "NewPass123", "NewPass123"));

        assertThat(result.hasPassword()).isTrue();
    }

    @Test
    void changePassword_throws_PasswordMismatchException_when_new_passwords_dont_match() {
        assertThatThrownBy(() ->
                authService.changePassword(2L,
                        new ChangePasswordRequest("oldpass", "NewPass123", "Different1"))
        ).isInstanceOf(PasswordMismatchException.class);
    }

    @Test
    void changePassword_throws_WrongPasswordException_when_current_password_wrong() {
        User user = localUser();
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "encoded_old_pass")).thenReturn(false);

        assertThatThrownBy(() ->
                authService.changePassword(2L,
                        new ChangePasswordRequest("wrongpass", "NewPass123", "NewPass123"))
        ).isInstanceOf(WrongPasswordException.class);
    }

    @Test
    void changePassword_throws_IllegalArgumentException_when_no_local_password() {
        User user = socialUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() ->
                authService.changePassword(1L,
                        new ChangePasswordRequest("oldpass", "NewPass123", "NewPass123"))
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void changePassword_throws_IllegalArgumentException_when_new_equals_current() {
        User user = localUser();
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldpass", "encoded_old_pass")).thenReturn(true);
        when(passwordEncoder.matches("oldpass", "encoded_old_pass")).thenReturn(true);

        assertThatThrownBy(() ->
                authService.changePassword(2L,
                        new ChangePasswordRequest("oldpass", "oldpass", "oldpass"))
        ).isInstanceOf(IllegalArgumentException.class);
    }
}
