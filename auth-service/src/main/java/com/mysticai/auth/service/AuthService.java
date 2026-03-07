package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import com.mysticai.auth.dto.ChangePasswordRequest;
import com.mysticai.auth.dto.LoginRequest;
import com.mysticai.auth.dto.LoginResponse;
import com.mysticai.auth.dto.RegisterRequest;
import com.mysticai.auth.dto.SetPasswordRequest;
import com.mysticai.auth.dto.SocialLoginRequest;
import com.mysticai.auth.dto.UpdateProfileRequest;
import com.mysticai.auth.dto.UserDTO;
import com.mysticai.auth.dto.verification.OkResponse;
import com.mysticai.auth.dto.verification.RegisterResponse;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.token.EmailVerificationToken;
import com.mysticai.auth.entity.token.PasswordResetToken;
import com.mysticai.auth.exception.domain.EmailNotVerifiedException;
import com.mysticai.auth.exception.domain.PasswordAlreadySetException;
import com.mysticai.auth.exception.domain.PasswordMismatchException;
import com.mysticai.auth.exception.domain.WrongPasswordException;
import com.mysticai.auth.messaging.EmailVerificationMessage;
import com.mysticai.auth.messaging.EmailVerificationPublisher;
import com.mysticai.auth.messaging.PasswordResetEmailMessage;
import com.mysticai.auth.messaging.PasswordResetEmailPublisher;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.repository.token.EmailVerificationTokenRepository;
import com.mysticai.auth.repository.token.PasswordResetTokenRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import com.mysticai.auth.security.SocialTokenVerifier.SocialUserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import static com.mysticai.auth.validation.PasswordPolicy.STRONG_PASSWORD_REGEX;
import static com.mysticai.auth.validation.PasswordPolicy.WEAK_PASSWORD_CODE;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile(STRONG_PASSWORD_REGEX);

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository verificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationPublisher emailVerificationPublisher;
    private final PasswordResetEmailPublisher passwordResetEmailPublisher;
    private final VerificationProperties verificationProperties;
    private final PasswordResetProperties passwordResetProperties;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final SocialTokenVerifier socialTokenVerifier;
    private final NatalChartProvisioningService natalChartProvisioningService;
    private final Clock clock;

    public enum VerificationOutcome {
        SUCCESS,
        EXPIRED,
        INVALID
    }

    public enum PasswordResetOutcome {
        SUCCESS,
        EXPIRED,
        INVALID
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String normalizedUsername = normalizeIdentifier(request.username());
        String normalizedEmail = normalizeIdentifier(request.email());
        ensureStrongPassword(request.password());

        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .username(normalizedUsername)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.password()))
                .firstName(trimToNull(request.firstName()))
                .lastName(trimToNull(request.lastName()))
                .name(buildName(request.firstName(), request.lastName()))
                .birthDate(request.birthDate())
                .birthTime(request.birthTime())
                .birthLocation(request.birthLocation())
                .birthCountry(request.birthCountry())
                .birthCity(request.birthCity())
                .birthTimeUnknown(request.birthTimeUnknown())
                .timezone(request.timezone())
                .gender(request.gender())
                .maritalStatus(request.maritalStatus())
                .focusPoint(request.focusPoint())
                .zodiacSign(request.zodiacSign())
                .roles(Set.of("USER"))
                .enabled(true)
                .hasLocalPassword(true)
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .emailVerifiedAt(null)
                .build();

        User savedUser = userRepository.save(user);
        issueVerificationToken(savedUser);

        return new RegisterResponse(AccountStatus.PENDING_VERIFICATION.name());
    }

    public LoginResponse login(LoginRequest request) {
        String loginIdentifier = normalizeIdentifier(request.username());

        Optional<User> loginUserOpt = userRepository.findByUsernameIgnoreCase(loginIdentifier)
                .or(() -> userRepository.findByEmailIgnoreCase(loginIdentifier));

        if (loginUserOpt.isPresent() && loginUserOpt.get().getAccountStatus() != AccountStatus.ACTIVE) {
            throw new EmailNotVerifiedException();
        }

        String principal = loginUserOpt.map(User::getUsername).orElse(loginIdentifier);
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(principal, request.password())
        );

        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

        User user = userRepository.findByUsernameIgnoreCase(principal)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!requiresOnboarding(user)) {
            natalChartProvisioningService.ensureNatalChartIfEligible(user);
        }

        return new LoginResponse(
                accessToken,
                refreshToken,
                jwtTokenProvider.getJwtExpiration(),
                toUserDTO(user)
        );
    }

    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmailIgnoreCase(normalizeIdentifier(email));
    }

    @Transactional
    public OkResponse resendVerification(String email) {
        if (email == null || email.isBlank()) {
            return new OkResponse(true);
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizeIdentifier(email));
        if (userOpt.isEmpty()) {
            return new OkResponse(true);
        }

        User user = userOpt.get();
        if (user.getAccountStatus() == AccountStatus.ACTIVE) {
            return new OkResponse(true);
        }

        LocalDateTime now = LocalDateTime.now(clock);

        Optional<EmailVerificationToken> latestToken = verificationTokenRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (latestToken.isPresent() && latestToken.get().getCreatedAt() != null) {
            LocalDateTime effectiveCreatedAt = safeCreatedAt(latestToken.get().getCreatedAt(), now);
            LocalDateTime cooldownUntil = effectiveCreatedAt.plus(verificationProperties.resendCooldown());
            if (cooldownUntil.isAfter(now)) {
                return new OkResponse(true);
            }
        }

        long dailyCount = verificationTokenRepository.countByUserIdAndCreatedAtAfter(user.getId(), now.minusHours(24));
        if (dailyCount >= verificationProperties.resendDailyLimit()) {
            return new OkResponse(true);
        }

        issueVerificationToken(user);
        return new OkResponse(true);
    }

    @Transactional
    public OkResponse requestPasswordReset(String email) {
        if (email == null || email.isBlank()) {
            log.info("Password reset skipped: email is blank");
            return new OkResponse(true);
        }

        String normalizedEmail = normalizeIdentifier(email);
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (userOpt.isEmpty()) {
            log.info("Password reset skipped: user not found. email={}", normalizedEmail);
            return new OkResponse(true);
        }

        User user = userOpt.get();
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            log.info("Password reset skipped: user not active. userId={}, status={}", user.getId(), user.getAccountStatus());
            return new OkResponse(true);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        Optional<PasswordResetToken> latestToken =
                passwordResetTokenRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (latestToken.isPresent() && latestToken.get().getCreatedAt() != null) {
            LocalDateTime effectiveCreatedAt = safeCreatedAt(latestToken.get().getCreatedAt(), now);
            LocalDateTime cooldownUntil = effectiveCreatedAt.plus(passwordResetProperties.requestCooldown());
            if (cooldownUntil.isAfter(now)) {
                log.info("Password reset skipped: cooldown active. userId={}, cooldownUntil={}, now={}",
                        user.getId(), cooldownUntil, now);
                return new OkResponse(true);
            }
        }

        long dailyCount = passwordResetTokenRepository.countByUserIdAndCreatedAtAfter(user.getId(), now.minusHours(24));
        if (dailyCount >= passwordResetProperties.requestDailyLimit()) {
            log.info("Password reset skipped: daily limit reached. userId={}, dailyCount={}, limit={}",
                    user.getId(), dailyCount, passwordResetProperties.requestDailyLimit());
            return new OkResponse(true);
        }

        issuePasswordResetToken(user);
        log.info("Password reset token issued. userId={}, email={}", user.getId(), user.getEmail());
        return new OkResponse(true);
    }

    @Transactional
    public VerificationOutcome verifyEmailToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return VerificationOutcome.INVALID;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        String tokenHash = hashToken(rawToken, verificationProperties.tokenPepper());

        int consumed = verificationTokenRepository.consumeTokenIfValid(tokenHash, now);
        if (consumed == 0) {
            Optional<EmailVerificationToken> notConsumableToken = verificationTokenRepository.findByTokenHash(tokenHash);
            if (notConsumableToken.isEmpty()) {
                return VerificationOutcome.INVALID;
            }

            EmailVerificationToken token = notConsumableToken.get();
            if (token.isExpired(now)) {
                if (!token.isUsed() && !token.isRevoked()) {
                    token.setRevokedAt(now);
                    verificationTokenRepository.save(token);
                }
                return VerificationOutcome.EXPIRED;
            }
            return VerificationOutcome.INVALID;
        }

        EmailVerificationToken token = verificationTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalStateException("Consumed token cannot be loaded: " + tokenHash));

        User user = token.getUser();
        user.setAccountStatus(AccountStatus.ACTIVE);
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(now);
        }

        verificationTokenRepository.revokeActiveTokensByUserId(user.getId(), now);
        userRepository.save(user);

        return VerificationOutcome.SUCCESS;
    }

    @Transactional
    public PasswordResetOutcome resetPassword(String rawToken, String newPassword, String confirmPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            return PasswordResetOutcome.INVALID;
        }
        if (newPassword == null || confirmPassword == null || !newPassword.equals(confirmPassword)) {
            throw new PasswordMismatchException();
        }
        ensureStrongPassword(newPassword);

        LocalDateTime now = LocalDateTime.now(clock);
        String tokenHash = hashToken(rawToken, passwordResetProperties.tokenPepper());

        int consumed = passwordResetTokenRepository.consumeTokenIfValid(tokenHash, now);
        if (consumed == 0) {
            Optional<PasswordResetToken> notConsumableToken = passwordResetTokenRepository.findByTokenHash(tokenHash);
            if (notConsumableToken.isEmpty()) {
                return PasswordResetOutcome.INVALID;
            }

            PasswordResetToken token = notConsumableToken.get();
            if (token.isExpired(now)) {
                if (!token.isUsed() && !token.isRevoked()) {
                    token.setRevokedAt(now);
                    passwordResetTokenRepository.save(token);
                }
                return PasswordResetOutcome.EXPIRED;
            }
            return PasswordResetOutcome.INVALID;
        }

        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalStateException("Consumed reset token cannot be loaded: " + tokenHash));

        User user = token.getUser();
        if (user.getPassword() != null && passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setHasLocalPassword(true);
        userRepository.save(user);
        passwordResetTokenRepository.revokeActiveTokensByUserId(user.getId(), now);

        return PasswordResetOutcome.SUCCESS;
    }

    @Transactional
    public LoginResponse socialLogin(SocialLoginRequest request) {
        SocialUserInfo userInfo;
        switch (request.provider().toLowerCase(Locale.ROOT)) {
            case "google" -> userInfo = socialTokenVerifier.verifyGoogleToken(request.idToken());
            case "apple" -> userInfo = socialTokenVerifier.verifyAppleToken(request.idToken());
            default -> throw new IllegalArgumentException("Unsupported provider: " + request.provider());
        }

        String provider = request.provider().toLowerCase(Locale.ROOT);
        LocalDateTime now = LocalDateTime.now(clock);

        Optional<User> existingUser = userRepository.findByProviderAndSocialId(provider, userInfo.socialId());
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            ensureSocialUserHasPassword(user, provider, userInfo.socialId());
            ensureSocialUserIsActive(user, now);
            userRepository.save(user);
            boolean onboardingRequired = requiresOnboarding(user);
            if (!onboardingRequired) {
                natalChartProvisioningService.ensureNatalChartIfEligible(user);
            }
            return buildSocialLoginResponse(user, onboardingRequired);
        }

        if (userInfo.email() != null) {
            Optional<User> emailUser = userRepository.findByEmailIgnoreCase(userInfo.email());
            if (emailUser.isPresent()) {
                User user = emailUser.get();
                user.setProvider(provider);
                user.setSocialId(userInfo.socialId());
                ensureSocialUserHasPassword(user, provider, userInfo.socialId());
                ensureSocialUserIsActive(user, now);
                userRepository.save(user);
                boolean onboardingRequired = requiresOnboarding(user);
                if (!onboardingRequired) {
                    natalChartProvisioningService.ensureNatalChartIfEligible(user);
                }
                return buildSocialLoginResponse(user, onboardingRequired);
            }
        }

        String email = userInfo.email() != null
                ? normalizeIdentifier(userInfo.email())
                : (userInfo.socialId() + "@" + provider + ".social").toLowerCase(Locale.ROOT);

        String username = email;
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            username = provider + "_" + userInfo.socialId();
        }

        User newUser = User.builder()
                .username(username)
                .email(email)
                .password(buildSocialPlaceholderPassword(provider, userInfo.socialId()))
                .provider(provider)
                .socialId(userInfo.socialId())
                .firstName(userInfo.firstName())
                .lastName(userInfo.lastName())
                .name(buildName(userInfo.firstName(), userInfo.lastName()))
                .roles(Set.of("USER"))
                .enabled(true)
                .hasLocalPassword(false)
                .accountStatus(AccountStatus.ACTIVE)
                .emailVerifiedAt(now)
                .build();

        User savedUser = userRepository.save(newUser);
        return buildSocialLoginResponse(savedUser, true);
    }

    @Transactional
    public UserDTO updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.firstName() != null) user.setFirstName(request.firstName());
        if (request.lastName() != null) user.setLastName(request.lastName());
        if (request.firstName() != null || request.lastName() != null) {
            user.setName(buildName(
                    request.firstName() != null ? request.firstName() : user.getFirstName(),
                    request.lastName() != null ? request.lastName() : user.getLastName()
            ));
        }
        if (request.birthDate() != null) user.setBirthDate(request.birthDate());
        if (request.birthTime() != null) user.setBirthTime(request.birthTime());
        if (request.birthLocation() != null) user.setBirthLocation(request.birthLocation());
        if (request.birthCountry() != null) user.setBirthCountry(request.birthCountry());
        if (request.birthCity() != null) user.setBirthCity(request.birthCity());
        if (request.birthTimeUnknown() != null) user.setBirthTimeUnknown(request.birthTimeUnknown());
        if (request.timezone() != null) user.setTimezone(request.timezone());
        if (request.gender() != null) user.setGender(request.gender());
        if (request.maritalStatus() != null) user.setMaritalStatus(request.maritalStatus());
        if (request.focusPoint() != null) user.setFocusPoint(request.focusPoint());
        if (request.zodiacSign() != null) user.setZodiacSign(request.zodiacSign());
        if (request.preferredLanguage() != null) user.setPreferredLanguage(request.preferredLanguage());

        User saved = userRepository.save(user);
        if (!requiresOnboarding(saved)) {
            natalChartProvisioningService.ensureNatalChartIfEligible(saved);
        }
        return toUserDTO(saved);
    }

    @Transactional
    public UserDTO setPassword(Long userId, SetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new PasswordMismatchException();
        }
        ensureStrongPassword(request.newPassword());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (Boolean.TRUE.equals(user.getHasLocalPassword())) {
            throw new PasswordAlreadySetException();
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setHasLocalPassword(true);
        User saved = userRepository.save(user);
        return toUserDTO(saved);
    }

    @Transactional
    public UserDTO changePassword(Long userId, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new PasswordMismatchException();
        }
        ensureStrongPassword(request.newPassword());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!Boolean.TRUE.equals(user.getHasLocalPassword())) {
            throw new IllegalArgumentException("No local password set. Use set-password instead.");
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new WrongPasswordException();
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        User saved = userRepository.save(user);
        return toUserDTO(saved);
    }

    private LoginResponse buildSocialLoginResponse(User user, boolean isNewUser) {
        String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(user), isNewUser);
    }

    private boolean requiresOnboarding(User user) {
        return user.getBirthDate() == null
                || isBlank(user.getBirthCountry())
                || isBlank(user.getBirthCity())
                || isBlank(user.getGender())
                || isBlank(user.getFocusPoint());
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void ensureSocialUserHasPassword(User user, String provider, String socialId) {
        if (!isBlank(user.getPassword())) {
            return;
        }
        user.setPassword(buildSocialPlaceholderPassword(provider, socialId));
    }

    private String buildSocialPlaceholderPassword(String provider, String socialId) {
        String raw = "social:" + provider + ":" + socialId + ":" + UUID.randomUUID();
        return passwordEncoder.encode(raw);
    }

    private void ensureSocialUserIsActive(User user, LocalDateTime now) {
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            user.setAccountStatus(AccountStatus.ACTIVE);
            user.setEmailVerifiedAt(now);
        } else if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(now);
        }
    }

    private void issueVerificationToken(User user) {
        LocalDateTime now = LocalDateTime.now(clock);

        verificationTokenRepository.revokeActiveTokensByUserId(user.getId(), now);

        String rawToken = generateRawToken(verificationProperties.tokenBytes());
        String tokenHash = hashToken(rawToken, verificationProperties.tokenPepper());

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(now.plus(verificationProperties.tokenTtl()))
                .createdAt(now)
                .build();

        verificationTokenRepository.save(verificationToken);

        EmailVerificationMessage message = new EmailVerificationMessage(
                user.getId(),
                user.getEmail(),
                rawToken,
                UUID.randomUUID().toString()
        );

        emailVerificationPublisher.publish(message);
    }

    private void issuePasswordResetToken(User user) {
        LocalDateTime now = LocalDateTime.now(clock);
        passwordResetTokenRepository.revokeActiveTokensByUserId(user.getId(), now);

        String rawToken = generateRawToken(passwordResetProperties.tokenBytes());
        String tokenHash = hashToken(rawToken, passwordResetProperties.tokenPepper());

        PasswordResetToken passwordResetToken = PasswordResetToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(now.plus(passwordResetProperties.tokenTtl()))
                .createdAt(now)
                .build();
        passwordResetTokenRepository.save(passwordResetToken);

        PasswordResetEmailMessage message = new PasswordResetEmailMessage(
                user.getId(),
                user.getEmail(),
                rawToken,
                UUID.randomUUID().toString()
        );
        passwordResetEmailPublisher.publish(message);
    }

    private String generateRawToken(int bytesLength) {
        byte[] bytes = new byte[bytesLength];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken, String pepper) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest((rawToken + pepper)
                    .getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash token", ex);
        }
    }

    private String normalizeIdentifier(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String buildName(String firstName, String lastName) {
        String safeFirstName = trimToNull(firstName);
        String safeLastName = trimToNull(lastName);

        if (safeFirstName == null && safeLastName == null) return null;
        if (safeFirstName == null) return safeLastName;
        if (safeLastName == null) return safeFirstName;
        return safeFirstName + " " + safeLastName;
    }

    private void ensureStrongPassword(String password) {
        if (password == null || !STRONG_PASSWORD_PATTERN.matcher(password).matches()) {
            throw new IllegalArgumentException(WEAK_PASSWORD_CODE);
        }
    }

    private LocalDateTime safeCreatedAt(LocalDateTime createdAt, LocalDateTime now) {
        if (createdAt == null) {
            return now;
        }
        if (!createdAt.isAfter(now)) {
            return createdAt;
        }

        // created_at may be written by DB in local timezone while app clock is UTC.
        int systemOffsetSeconds = ZoneId.systemDefault()
                .getRules()
                .getOffset(Instant.now(clock))
                .getTotalSeconds();
        LocalDateTime normalized = createdAt.minusSeconds(systemOffsetSeconds);
        return normalized.isAfter(now) ? now : normalized;
    }

    private UserDTO toUserDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .accountStatus(user.getAccountStatus() != null ? user.getAccountStatus().name() : null)
                .emailVerifiedAt(user.getEmailVerifiedAt())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .birthTime(user.getBirthTime())
                .birthLocation(user.getBirthLocation())
                .birthCountry(user.getBirthCountry())
                .birthCity(user.getBirthCity())
                .birthTimeUnknown(user.getBirthTimeUnknown())
                .timezone(user.getTimezone())
                .gender(user.getGender())
                .maritalStatus(user.getMaritalStatus())
                .focusPoint(user.getFocusPoint())
                .zodiacSign(user.getZodiacSign())
                .preferredLanguage(user.getPreferredLanguage())
                .roles(user.getRoles())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .hasPassword(Boolean.TRUE.equals(user.getHasLocalPassword()))
                .provider(user.getProvider())
                .build();
    }
}
