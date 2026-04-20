package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.token.PasswordResetToken;
import com.mysticai.auth.messaging.EmailVerificationPublisher;
import com.mysticai.auth.messaging.PasswordResetEmailPublisher;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.repository.token.EmailVerificationTokenRepository;
import com.mysticai.auth.repository.token.LinkAccountOtpRepository;
import com.mysticai.auth.repository.token.PasswordResetTokenRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import org.springframework.mail.javamail.JavaMailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetUnitTest {

    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationTokenRepository verificationTokenRepository;
    @Mock private LinkAccountOtpRepository linkAccountOtpRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private JavaMailSender mailSender;
    @Mock private EmailVerificationPublisher emailVerificationPublisher;
    @Mock private PasswordResetEmailPublisher passwordResetEmailPublisher;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private SocialTokenVerifier socialTokenVerifier;
    @Mock private NatalChartProvisioningService natalChartProvisioningService;
    @Mock private SignupBonusSyncService signupBonusSyncService;
    @Mock private AvatarStorageService avatarStorageService;
    @Mock private PublicUrlProperties publicUrlProperties;

    private AuthService authService;
    private Clock fixedClock;

    @BeforeEach
    void setUp() {
        VerificationProperties verificationProperties = new VerificationProperties("pepper", 48, 24, 60, 5, 3, 30);
        PasswordResetProperties passwordResetProperties = new PasswordResetProperties("reset-pepper", 48, 30, 60, 5, 3, 30);
        fixedClock = Clock.fixed(Instant.parse("2026-03-07T10:00:00Z"), ZoneOffset.UTC);
        authService = new AuthService(
                userRepository,
                verificationTokenRepository,
                linkAccountOtpRepository,
                passwordResetTokenRepository,
                mailSender,
                emailVerificationPublisher,
                passwordResetEmailPublisher,
                verificationProperties,
                passwordResetProperties,
                passwordEncoder,
                jwtTokenProvider,
                authenticationManager,
                socialTokenVerifier,
                natalChartProvisioningService,
                signupBonusSyncService,
                avatarStorageService,
                publicUrlProperties,
                fixedClock
        );
    }

    @Test
    void requestPasswordReset_returnsOkAndSkipsWhenUserNotFound() {
        when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

        assertThat(authService.requestPasswordReset("missing@example.com").ok()).isTrue();
        verify(passwordResetEmailPublisher, never()).publish(any());
    }

    @Test
    void requestPasswordReset_sendsEmailForActiveUser() {
        User user = User.builder()
                .id(22L)
                .username("user")
                .email("user@example.com")
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findTopByUserIdOrderByCreatedAtDesc(22L)).thenReturn(Optional.empty());
        when(passwordResetTokenRepository.countByUserIdAndCreatedAtAfter(any(), any())).thenReturn(0L);

        assertThat(authService.requestPasswordReset("user@example.com").ok()).isTrue();
        verify(passwordResetEmailPublisher).publish(any());
    }

    @Test
    void resetPassword_updatesPasswordWhenTokenValid() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        User user = User.builder()
                .id(33L)
                .username("reset-user")
                .email("reset@example.com")
                .password("encoded-old")
                .hasLocalPassword(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        String tokenHash = hash("valid-token", "reset-pepper");
        PasswordResetToken token = PasswordResetToken.builder()
                .id(100L)
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(now.plusMinutes(15))
                .build();

        when(passwordResetTokenRepository.consumeTokenIfValid(tokenHash, now)).thenReturn(1);
        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
        when(passwordEncoder.matches("NewP@ss123", "encoded-old")).thenReturn(false);
        when(passwordEncoder.encode("NewP@ss123")).thenReturn("encoded-new");

        AuthService.PasswordResetOutcome outcome = authService.resetPassword("valid-token", "NewP@ss123", "NewP@ss123");

        assertThat(outcome).isEqualTo(AuthService.PasswordResetOutcome.SUCCESS);
        assertThat(user.getPassword()).isEqualTo("encoded-new");
        assertThat(user.getHasLocalPassword()).isTrue();
        verify(userRepository).save(user);
        verify(passwordResetTokenRepository).revokeActiveTokensByUserId(33L, now);
    }

    private static String hash(String raw, String pepper) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((raw + pepper).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
