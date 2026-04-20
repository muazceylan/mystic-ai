package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import com.mysticai.auth.dto.RegisterRequest;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.messaging.EmailVerificationPublisher;
import com.mysticai.auth.messaging.PasswordResetEmailPublisher;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.repository.token.EmailVerificationTokenRepository;
import com.mysticai.auth.repository.token.LinkAccountOtpRepository;
import com.mysticai.auth.repository.token.PasswordResetTokenRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegistrationUnitTest {

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
    private VerificationProperties verificationProperties;

    @BeforeEach
    void setUp() {
        verificationProperties = new VerificationProperties("pepper", 48, 24, 60, 5, 3, 30);
        authService = new AuthService(
                userRepository,
                verificationTokenRepository,
                linkAccountOtpRepository,
                passwordResetTokenRepository,
                mailSender,
                emailVerificationPublisher,
                passwordResetEmailPublisher,
                verificationProperties,
                new PasswordResetProperties("reset-pepper", 48, 30, 60, 5, 3, 30),
                passwordEncoder,
                jwtTokenProvider,
                authenticationManager,
                socialTokenVerifier,
                natalChartProvisioningService,
                signupBonusSyncService,
                avatarStorageService,
                publicUrlProperties,
                Clock.fixed(Instant.parse("2026-04-13T10:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void register_triggersSignupBonusRequest() {
        RegisterRequest request = new RegisterRequest(
                "newuser",
                "new@example.com",
                "StrongP@ss1",
                "Ada",
                "Lovelace",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("StrongP@ss1")).thenReturn("encoded");
        when(verificationTokenRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0, User.class);
            saved.setId(501L);
            return saved;
        });

        authService.register(request);

        verify(signupBonusSyncService).scheduleSignupBonus(any(User.class), eq("EMAIL_REGISTER"));
        verify(mailSender).send(any(MimeMessage.class));
    }
}
