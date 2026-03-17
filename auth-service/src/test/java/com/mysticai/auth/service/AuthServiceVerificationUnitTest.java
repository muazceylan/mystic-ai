package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import com.mysticai.auth.dto.LoginResponse;
import com.mysticai.auth.dto.SocialLoginRequest;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.entity.token.EmailVerificationToken;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceVerificationUnitTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationTokenRepository tokenRepository;

    @Mock
    private LinkAccountOtpRepository linkAccountOtpRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailVerificationPublisher emailVerificationPublisher;

    @Mock
    private PasswordResetEmailPublisher passwordResetEmailPublisher;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private SocialTokenVerifier socialTokenVerifier;

    @Mock
    private NatalChartProvisioningService natalChartProvisioningService;

    @Mock
    private AvatarStorageService avatarStorageService;

    @Mock
    private PublicUrlProperties publicUrlProperties;

    private VerificationProperties verificationProperties;
    private PasswordResetProperties passwordResetProperties;
    private Clock fixedClock;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        verificationProperties = new VerificationProperties("pepper", 48, 24, 60, 5, 3, 30);
        passwordResetProperties = new PasswordResetProperties("reset-pepper", 48, 30, 60, 5, 3, 30);
        fixedClock = Clock.fixed(Instant.parse("2026-03-05T10:15:30Z"), ZoneOffset.UTC);

        authService = new AuthService(
                userRepository,
                tokenRepository,
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
                avatarStorageService,
                publicUrlProperties,
                fixedClock
        );
    }

    @Test
    void verifyEmailToken_returnsInvalidWhenTokenNotFound() {
        String rawToken = "raw-token";
        String tokenHash = hash(rawToken, "pepper");
        when(tokenRepository.consumeTokenIfValid(tokenHash, LocalDateTime.now(fixedClock))).thenReturn(0);
        when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

        AuthService.VerificationOutcome result = authService.verifyEmailToken(rawToken);

        assertThat(result).isEqualTo(AuthService.VerificationOutcome.INVALID);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifyEmailToken_returnsExpiredWhenTokenExpired() {
        User user = User.builder()
                .id(99L)
                .email("expired@example.com")
                .username("expired")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        LocalDateTime now = LocalDateTime.now(fixedClock);
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(11L)
                .user(user)
                .tokenHash(hash("expired-token", "pepper"))
                .expiresAt(now.minusMinutes(1))
                .build();

        when(tokenRepository.consumeTokenIfValid(token.getTokenHash(), now)).thenReturn(0);
        when(tokenRepository.findByTokenHash(token.getTokenHash())).thenReturn(Optional.of(token));

        AuthService.VerificationOutcome result = authService.verifyEmailToken("expired-token");

        assertThat(result).isEqualTo(AuthService.VerificationOutcome.EXPIRED);
        assertThat(token.getRevokedAt()).isEqualTo(now);
        verify(tokenRepository).save(token);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifyEmailToken_activatesUserOnValidToken() {
        User user = User.builder()
                .id(42L)
                .email("user@example.com")
                .username("user")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        LocalDateTime now = LocalDateTime.now(fixedClock);
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(10L)
                .user(user)
                .tokenHash(hash("valid-token", "pepper"))
                .expiresAt(now.plusHours(2))
                .build();

        when(tokenRepository.consumeTokenIfValid(token.getTokenHash(), now)).thenReturn(1);
        when(tokenRepository.findByTokenHash(token.getTokenHash())).thenReturn(Optional.of(token));

        AuthService.VerificationOutcome result = authService.verifyEmailToken("valid-token");

        assertThat(result).isEqualTo(AuthService.VerificationOutcome.SUCCESS);
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.getEmailVerifiedAt()).isEqualTo(now);

        verify(tokenRepository).revokeActiveTokensByUserId(42L, now);
        verify(userRepository).save(user);
    }

    @Test
    void verifyEmailToken_returnsInvalidWhenTokenAlreadyUsed() {
        User user = User.builder()
                .id(55L)
                .email("used@example.com")
                .username("used")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        LocalDateTime now = LocalDateTime.now(fixedClock);
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(33L)
                .user(user)
                .tokenHash(hash("used-token", "pepper"))
                .expiresAt(now.plusHours(1))
                .usedAt(now.minusMinutes(5))
                .revokedAt(now.minusMinutes(5))
                .build();

        when(tokenRepository.consumeTokenIfValid(token.getTokenHash(), now)).thenReturn(0);
        when(tokenRepository.findByTokenHash(token.getTokenHash())).thenReturn(Optional.of(token));

        AuthService.VerificationOutcome result = authService.verifyEmailToken("used-token");

        assertThat(result).isEqualTo(AuthService.VerificationOutcome.INVALID);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resendVerification_respectsCooldownAndSkipsPublish() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        User user = User.builder()
                .id(77L)
                .email("pending@example.com")
                .username("pending")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        EmailVerificationToken latest = EmailVerificationToken.builder()
                .id(991L)
                .user(user)
                .tokenHash("hash")
                .expiresAt(now.plusHours(24))
                .createdAt(now)
                .build();

        when(userRepository.findByEmailIgnoreCase("pending@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findTopByUserIdOrderByCreatedAtDesc(77L)).thenReturn(Optional.of(latest));

        assertThat(authService.resendVerification("pending@example.com").ok()).isTrue();

        verify(emailVerificationPublisher, never()).publish(any());
        verify(tokenRepository, never()).countByUserIdAndCreatedAtAfter(any(), any());
    }

    @Test
    void socialLogin_newGoogleUser_assignsPlaceholderPasswordBeforeSave() {
        SocialLoginRequest request = new SocialLoginRequest("google", "google-id-token");
        SocialTokenVerifier.SocialUserInfo socialUser = new SocialTokenVerifier.SocialUserInfo(
                "social-123",
                "new-social@example.com",
                "New",
                "Social"
        );

        when(socialTokenVerifier.verifyGoogleToken("google-id-token")).thenReturn(socialUser);
        when(userRepository.findByProviderAndSocialId("google", "social-123")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("new-social@example.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("new-social@example.com")).thenReturn(false);
        when(passwordEncoder.encode(any(String.class))).thenReturn("encoded-social-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0, User.class);
            saved.setId(501L);
            return saved;
        });
        when(jwtTokenProvider.generateToken(anyLong(), any(String.class), any(String.class), any(UserType.class))).thenReturn("jwt-token");
        when(jwtTokenProvider.getJwtExpiration()).thenReturn(3600000L);

        LoginResponse response = authService.socialLogin(request);

        assertThat(response.user().id()).isEqualTo(501L);
        assertThat(response.user().email()).isEqualTo("new-social@example.com");

        org.mockito.ArgumentCaptor<User> savedUserCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUserCaptor.capture());
        assertThat(savedUserCaptor.getValue().getPassword()).isEqualTo("encoded-social-password");
    }

    // ─── verifyEmailOtp tests ────────────────────────────────────────────────

    @Test
    void verifyEmailOtp_activatesAccountAndReturnsTokens() {
        User user = User.builder()
                .id(10L)
                .email("otp@example.com")
                .username("otp@example.com")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        String rawCode = "123456";
        String tokenHash = hash(user.getId() + ":" + rawCode, "pepper");
        LocalDateTime now = LocalDateTime.now(fixedClock);

        when(userRepository.findByEmailIgnoreCase("otp@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.consumeTokenIfValid(tokenHash, now)).thenReturn(1);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(anyLong(), any(), any(), any())).thenReturn("jwt-token");
        when(jwtTokenProvider.getJwtExpiration()).thenReturn(3600000L);

        LoginResponse response = authService.verifyEmailOtp("otp@example.com", rawCode);

        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.getEmailVerifiedAt()).isEqualTo(now);
        assertThat(response.accessToken()).isEqualTo("jwt-token");
        verify(tokenRepository).revokeActiveTokensByUserId(10L, now);
        verify(userRepository).save(user);
    }

    @Test
    void verifyEmailOtp_throwsAlreadyVerifiedWhenAccountActive() {
        User user = User.builder()
                .id(20L)
                .email("active@example.com")
                .username("active@example.com")
                .accountStatus(AccountStatus.ACTIVE)
                .enabled(true)
                .build();

        when(userRepository.findByEmailIgnoreCase("active@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.verifyEmailOtp("active@example.com", "123456"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("ALREADY_VERIFIED");

        verify(tokenRepository, never()).consumeTokenIfValid(any(), any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyEmailOtp_throwsOtpInvalidWhenUserNotFound() {
        when(userRepository.findByEmailIgnoreCase("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifyEmailOtp("ghost@example.com", "000000"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OTP_INVALID");
    }

    @Test
    void verifyEmailOtp_throwsOtpExpiredWhenTokenExpired() {
        User user = User.builder()
                .id(30L)
                .email("expired@example.com")
                .username("expired@example.com")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        String rawCode = "654321";
        String tokenHash = hash(user.getId() + ":" + rawCode, "pepper");
        LocalDateTime now = LocalDateTime.now(fixedClock);

        EmailVerificationToken expiredToken = EmailVerificationToken.builder()
                .id(50L)
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(now.minusMinutes(5))
                .createdAt(now.minusMinutes(15))
                .build();

        when(userRepository.findByEmailIgnoreCase("expired@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.consumeTokenIfValid(tokenHash, now)).thenReturn(0);
        when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(expiredToken));

        assertThatThrownBy(() -> authService.verifyEmailOtp("expired@example.com", rawCode))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OTP_EXPIRED");

        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyEmailOtp_throwsOtpInvalidWhenTokenNotFound() {
        User user = User.builder()
                .id(40L)
                .email("notfound@example.com")
                .username("notfound@example.com")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .enabled(true)
                .build();

        String rawCode = "999999";
        String tokenHash = hash(user.getId() + ":" + rawCode, "pepper");
        LocalDateTime now = LocalDateTime.now(fixedClock);

        when(userRepository.findByEmailIgnoreCase("notfound@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.consumeTokenIfValid(tokenHash, now)).thenReturn(0);
        when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifyEmailOtp("notfound@example.com", rawCode))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OTP_INVALID");

        verify(userRepository, never()).save(any());
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
