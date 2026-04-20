package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import com.mysticai.auth.dto.LoginResponse;
import com.mysticai.auth.dto.SocialLoginRequest;
import com.mysticai.auth.dto.verification.OkResponse;
import jakarta.mail.internet.MimeMessage;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.messaging.EmailVerificationPublisher;
import com.mysticai.auth.messaging.PasswordResetEmailPublisher;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.repository.token.EmailVerificationTokenRepository;
import com.mysticai.auth.repository.token.LinkAccountOtpRepository;
import com.mysticai.auth.repository.token.PasswordResetTokenRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import org.springframework.mail.javamail.JavaMailSender;
import com.mysticai.auth.security.SocialTokenVerifier.SocialUserInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceQuickStartUnitTest {

    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationTokenRepository verificationTokenRepository;
    @Mock private LinkAccountOtpRepository linkAccountOtpRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private JavaMailSender mailSender;
    @Mock private MimeMessage mockMimeMessage;
    @Mock private EmailVerificationPublisher emailVerificationPublisher;
    @Mock private PasswordResetEmailPublisher passwordResetEmailPublisher;
    @Mock private VerificationProperties verificationProperties;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private SocialTokenVerifier socialTokenVerifier;
    @Mock private NatalChartProvisioningService natalChartProvisioningService;
    @Mock private SignupBonusSyncService signupBonusSyncService;
    @Mock private AvatarStorageService avatarStorageService;
    @Mock private PublicUrlProperties publicUrlProperties;

    private AuthService authService;

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        PasswordResetProperties passwordResetProperties =
                new PasswordResetProperties("reset-pepper", 48, 30, 60, 5, 3, 30);
        authService = new AuthService(
                userRepository, verificationTokenRepository, linkAccountOtpRepository,
                passwordResetTokenRepository, mailSender, emailVerificationPublisher,
                passwordResetEmailPublisher, verificationProperties, passwordResetProperties,
                passwordEncoder, jwtTokenProvider, authenticationManager, socialTokenVerifier,
                natalChartProvisioningService, signupBonusSyncService, avatarStorageService, publicUrlProperties,
                FIXED_CLOCK
        );
        // @Value fields are not injected in pure unit tests; set via reflection
        try {
            Field fromAddressField = AuthService.class.getDeclaredField("fromAddress");
            fromAddressField.setAccessible(true);
            fromAddressField.set(authService, "test@mystic-ai.internal");
        } catch (Exception ignored) {
            // field name mismatch — test will fail with a descriptive error
        }
    }

    // ── createQuickSession ────────────────────────────────────────────────────

    @Test
    void createQuickSession_creates_guest_user_with_correct_fields() {
        when(passwordEncoder.encode(anyString())).thenReturn("encoded_placeholder");
        when(jwtTokenProvider.generateToken(anyLong(), anyString(), anyString(), eq(UserType.GUEST)))
                .thenReturn("guest.access.token", "guest.refresh.token");
        when(jwtTokenProvider.getJwtExpiration()).thenReturn(3600L);

        ArgumentCaptor<User> savedUserCaptor = ArgumentCaptor.forClass(User.class);
        User savedUser = guestUser(42L);
        when(userRepository.save(savedUserCaptor.capture())).thenReturn(savedUser);

        LoginResponse response = authService.createQuickSession();

        User captured = savedUserCaptor.getValue();
        assertThat(captured.getUserType()).isEqualTo(UserType.GUEST);
        assertThat(captured.getIsAnonymous()).isTrue();
        assertThat(captured.getIsAccountLinked()).isFalse();
        assertThat(captured.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(captured.getUsername()).startsWith("guest_");
        assertThat(captured.getEmail()).endsWith("@anon.mystic-ai.internal");

        assertThat(response.accessToken()).isEqualTo("guest.access.token");
        assertThat(response.user().userType()).isEqualTo("GUEST");
        assertThat(response.user().isAnonymous()).isTrue();
    }

    // ── linkAccountWithSocial ─────────────────────────────────────────────────

    @Test
    void linkAccountWithSocial_upgrades_guest_to_registered() {
        User guest = guestUser(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(guest));
        when(socialTokenVerifier.verifyGoogleToken("id_token"))
                .thenReturn(new SocialUserInfo("google_sub_123", "linked@example.com", "Ada", "Lovelace"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(anyLong(), anyString(), anyString(), eq(UserType.REGISTERED)))
                .thenReturn("registered.access.token", "registered.refresh.token");
        when(jwtTokenProvider.getJwtExpiration()).thenReturn(3600L);

        LoginResponse response = authService.linkAccountWithSocial(
                1L, new SocialLoginRequest("google", "id_token"));

        assertThat(response.user().userType()).isEqualTo("REGISTERED");
        assertThat(response.user().isAccountLinked()).isTrue();
        assertThat(response.user().isAnonymous()).isFalse();
        assertThat(response.accessToken()).isEqualTo("registered.access.token");
    }

    @Test
    void linkAccountWithSocial_throws_when_already_registered() {
        User registered = registeredUser(5L);
        when(userRepository.findById(5L)).thenReturn(Optional.of(registered));

        assertThatThrownBy(() ->
                authService.linkAccountWithSocial(5L, new SocialLoginRequest("google", "tok")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("ACCOUNT_ALREADY_LINKED");
    }

    @Test
    void linkAccountWithSocial_throws_when_social_account_taken_by_another_user() {
        User guest = guestUser(1L);
        User otherUser = registeredUser(99L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(guest));
        when(socialTokenVerifier.verifyGoogleToken("id_token"))
                .thenReturn(new SocialUserInfo("google_sub_taken", "other@example.com", null, null));
        when(userRepository.findByProviderAndSocialId("google", "google_sub_taken"))
                .thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() ->
                authService.linkAccountWithSocial(1L, new SocialLoginRequest("google", "id_token")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("SOCIAL_ACCOUNT_ALREADY_LINKED");
    }

    @Test
    void linkAccountWithSocial_throws_when_email_taken_by_another_user() {
        User guest = guestUser(1L);
        User otherUser = registeredUser(88L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(guest));
        when(socialTokenVerifier.verifyGoogleToken("id_token"))
                .thenReturn(new SocialUserInfo("google_sub_new", "taken@example.com", null, null));
        when(userRepository.findByProviderAndSocialId("google", "google_sub_new")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("taken@example.com")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() ->
                authService.linkAccountWithSocial(1L, new SocialLoginRequest("google", "id_token")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("EMAIL_ALREADY_REGISTERED");
    }

    // ── linkAccountWithEmail ──────────────────────────────────────────────────

    @Test
    void linkAccountWithEmail_sends_otp_and_returns_ok() {
        User guest = guestUser(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(guest));
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("StrongP@ss1")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(verificationProperties.tokenPepper()).thenReturn("test-pepper");
        when(mailSender.createMimeMessage()).thenReturn(mockMimeMessage);

        OkResponse response = authService.linkAccountWithEmail(2L, "new@example.com", "StrongP@ss1", null, null);

        assertThat(response.ok()).isTrue();
        verify(linkAccountOtpRepository).save(any());
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void linkAccountWithEmail_throws_when_email_taken_by_another_user() {
        User guest = guestUser(3L);
        User otherUser = registeredUser(77L);
        when(userRepository.findById(3L)).thenReturn(Optional.of(guest));
        when(userRepository.findByEmailIgnoreCase("conflict@example.com")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() ->
                authService.linkAccountWithEmail(3L, "conflict@example.com", "StrongP@ss1", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("EMAIL_ALREADY_REGISTERED");
    }

    @Test
    void linkAccountWithEmail_throws_when_already_registered() {
        User registered = registeredUser(4L);
        when(userRepository.findById(4L)).thenReturn(Optional.of(registered));

        assertThatThrownBy(() ->
                authService.linkAccountWithEmail(4L, "some@example.com", "StrongP@ss1", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("ACCOUNT_ALREADY_LINKED");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private User guestUser(Long id) {
        return User.builder()
                .id(id)
                .username("guest_abc123")
                .email("guest_abc123@anon.mystic-ai.internal")
                .password("encoded_placeholder")
                .roles(Set.of("USER"))
                .enabled(true)
                .accountStatus(AccountStatus.ACTIVE)
                .userType(UserType.GUEST)
                .isAnonymous(true)
                .isAccountLinked(false)
                .hasLocalPassword(false)
                .build();
    }

    private User registeredUser(Long id) {
        return User.builder()
                .id(id)
                .username("registered@example.com")
                .email("registered@example.com")
                .password("encoded_pass")
                .roles(Set.of("USER"))
                .enabled(true)
                .accountStatus(AccountStatus.ACTIVE)
                .userType(UserType.REGISTERED)
                .isAnonymous(false)
                .isAccountLinked(false)
                .hasLocalPassword(true)
                .build();
    }
}
