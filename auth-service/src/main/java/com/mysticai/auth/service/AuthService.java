package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.PublicUrlProperties;
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
import com.mysticai.auth.entity.enums.UserType;
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
import com.mysticai.auth.entity.token.LinkAccountOtpToken;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.repository.token.EmailVerificationTokenRepository;
import com.mysticai.auth.repository.token.LinkAccountOtpRepository;
import com.mysticai.auth.repository.token.PasswordResetTokenRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import com.mysticai.auth.security.SocialTokenVerifier.SocialUserInfo;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
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
    private static final int OTP_TTL_MINUTES = 10;

    @Value("${auth.mail.from:no-reply@mysticai.local}")
    private String fromAddress;

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository verificationTokenRepository;
    private final LinkAccountOtpRepository linkAccountOtpRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JavaMailSender mailSender;
    private final EmailVerificationPublisher emailVerificationPublisher;
    private final PasswordResetEmailPublisher passwordResetEmailPublisher;
    private final VerificationProperties verificationProperties;
    private final PasswordResetProperties passwordResetProperties;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final SocialTokenVerifier socialTokenVerifier;
    private final NatalChartProvisioningService natalChartProvisioningService;
    private final SignupBonusSyncService signupBonusSyncService;
    private final AvatarStorageService avatarStorageService;
    private final PublicUrlProperties publicUrlProperties;
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

    public record AvatarBinary(Resource resource, MediaType mediaType, long contentLength) {}

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
                .zodiacSign(request.zodiacSign())
                .roles(Set.of("USER"))
                .enabled(true)
                .hasLocalPassword(true)
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .emailVerifiedAt(null)
                .build();

        User savedUser = userRepository.save(user);
        signupBonusSyncService.scheduleSignupBonus(savedUser, "EMAIL_REGISTER");
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
        signupBonusSyncService.scheduleSignupBonus(savedUser, "SOCIAL_" + provider.toUpperCase(Locale.ROOT));
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
        if (request.zodiacSign() != null) user.setZodiacSign(request.zodiacSign());
        if (request.preferredLanguage() != null) user.setPreferredLanguage(request.preferredLanguage());

        User saved = userRepository.save(user);
        if (!requiresOnboarding(saved)) {
            natalChartProvisioningService.ensureNatalChartIfEligible(saved);
        }
        return toUserDTO(saved);
    }

    @Transactional
    public UserDTO uploadAvatar(Long userId, MultipartFile avatar) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        AvatarStorageService.StoredAvatar storedAvatar = avatarStorageService.store(userId, avatar);
        String previousAvatarPath = trimToNull(user.getAvatarPath());
        user.setAvatarPath(storedAvatar.relativePath());

        User saved;
        try {
            saved = userRepository.save(user);
        } catch (RuntimeException ex) {
            avatarStorageService.delete(storedAvatar.relativePath());
            throw ex;
        }

        if (previousAvatarPath != null && !previousAvatarPath.equals(storedAvatar.relativePath())) {
            avatarStorageService.delete(previousAvatarPath);
        }

        return toUserDTO(saved);
    }

    @Transactional
    public UserDTO removeAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String previousAvatarPath = trimToNull(user.getAvatarPath());
        if (previousAvatarPath == null) {
            return toUserDTO(user);
        }

        user.setAvatarPath(null);
        User saved = userRepository.save(user);
        avatarStorageService.delete(previousAvatarPath);
        return toUserDTO(saved);
    }

    @Transactional(readOnly = true)
    public Optional<AvatarBinary> getAvatar(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }

        String avatarPath = trimToNull(userOpt.get().getAvatarPath());
        if (avatarPath == null) {
            return Optional.empty();
        }

        return avatarStorageService.read(avatarPath)
                .map(file -> new AvatarBinary(
                        file.resource(),
                        safeMediaType(file.contentType()),
                        file.contentLength()
                ));
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

    // -------------------------------------------------------------------------
    // Quick start (guest session)
    // -------------------------------------------------------------------------

    @Transactional
    public LoginResponse createQuickSession() {
        LocalDateTime now = LocalDateTime.now(clock);

        String guestSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String username = "guest_" + guestSuffix;
        String email = username + "@anon.mystic-ai.internal";

        User guestUser = User.builder()
                .username(username)
                .email(email)
                .password(buildGuestPlaceholderPassword(guestSuffix))
                .roles(Set.of("USER"))
                .enabled(true)
                .hasLocalPassword(false)
                .accountStatus(AccountStatus.ACTIVE)
                .emailVerifiedAt(now)
                .userType(UserType.GUEST)
                .isAnonymous(true)
                .isAccountLinked(false)
                .build();

        User saved = userRepository.save(guestUser);
        log.info("Quick session created: guestId={}", saved.getId());

        String accessToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.GUEST);
        String refreshToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.GUEST);
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(saved), true);
    }

    // -------------------------------------------------------------------------
    // Account linking (guest → registered)
    // -------------------------------------------------------------------------

    @Transactional
    public LoginResponse linkAccountWithSocial(Long userId, SocialLoginRequest request) {
        User guestUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (guestUser.getUserType() != UserType.GUEST) {
            throw new IllegalArgumentException("ACCOUNT_ALREADY_LINKED");
        }

        SocialUserInfo userInfo;
        String provider = request.provider().toLowerCase(Locale.ROOT);
        switch (provider) {
            case "google" -> userInfo = socialTokenVerifier.verifyGoogleToken(request.idToken());
            case "apple" -> userInfo = socialTokenVerifier.verifyAppleToken(request.idToken());
            default -> throw new IllegalArgumentException("Unsupported provider: " + request.provider());
        }

        // Conflict check: social account already used by another user
        Optional<User> existingByProvider = userRepository.findByProviderAndSocialId(provider, userInfo.socialId());
        if (existingByProvider.isPresent() && !existingByProvider.get().getId().equals(userId)) {
            throw new IllegalArgumentException("SOCIAL_ACCOUNT_ALREADY_LINKED");
        }

        String normalizedEmail = userInfo.email() != null ? normalizeIdentifier(userInfo.email()) : null;

        // Conflict check: email already used by another user
        if (normalizedEmail != null) {
            Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(normalizedEmail);
            if (existingByEmail.isPresent() && !existingByEmail.get().getId().equals(userId)) {
                throw new IllegalArgumentException("EMAIL_ALREADY_REGISTERED");
            }
        }

        LocalDateTime now = LocalDateTime.now(clock);

        // Upgrade guest user → registered
        if (normalizedEmail != null) {
            guestUser.setEmail(normalizedEmail);
            guestUser.setUsername(normalizedEmail);
        } else {
            String fallbackEmail = provider + "_" + userInfo.socialId() + "@" + provider + ".social";
            guestUser.setEmail(fallbackEmail);
            guestUser.setUsername(fallbackEmail);
        }
        guestUser.setProvider(provider);
        guestUser.setSocialId(userInfo.socialId());
        ensureSocialUserHasPassword(guestUser, provider, userInfo.socialId());
        guestUser.setUserType(UserType.REGISTERED);
        guestUser.setIsAnonymous(false);
        guestUser.setIsAccountLinked(true);
        guestUser.setHasLocalPassword(false);
        guestUser.setAccountStatus(AccountStatus.ACTIVE);
        if (guestUser.getEmailVerifiedAt() == null) {
            guestUser.setEmailVerifiedAt(now);
        }
        // Fill name only if not already set by user
        if (userInfo.firstName() != null && isBlank(guestUser.getFirstName())) {
            guestUser.setFirstName(userInfo.firstName());
        }
        if (userInfo.lastName() != null && isBlank(guestUser.getLastName())) {
            guestUser.setLastName(userInfo.lastName());
        }
        guestUser.setName(buildName(guestUser.getFirstName(), guestUser.getLastName()));

        User saved = userRepository.save(guestUser);
        signupBonusSyncService.scheduleSignupBonus(saved, "GUEST_LINK_" + provider.toUpperCase(Locale.ROOT));
        log.info("Guest account linked with social: userId={}, provider={}", saved.getId(), provider);

        String accessToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.REGISTERED);
        String refreshToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.REGISTERED);
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(saved), false);
    }

    /**
     * Step 1: saves credentials + name to the guest account, issues an OTP code,
     * and sends it via email. The account is upgraded to REGISTERED only after
     * the OTP is verified in {@link #verifyLinkAccountEmailOtp}.
     */
    @Transactional
    public OkResponse linkAccountWithEmail(Long userId, String email, String password,
                                           String firstName, String lastName) {
        User guestUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (guestUser.getUserType() != UserType.GUEST) {
            throw new IllegalArgumentException("ACCOUNT_ALREADY_LINKED");
        }

        ensureStrongPassword(password);
        String normalizedEmail = normalizeIdentifier(email);

        Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (existingByEmail.isPresent() && !existingByEmail.get().getId().equals(userId)) {
            throw new IllegalArgumentException("EMAIL_ALREADY_REGISTERED");
        }

        // Persist credentials and name on the guest user (still GUEST until OTP verified)
        guestUser.setEmail(normalizedEmail);
        guestUser.setUsername(normalizedEmail);
        guestUser.setPassword(passwordEncoder.encode(password));
        guestUser.setHasLocalPassword(true);
        if (firstName != null && !firstName.isBlank() && isBlank(guestUser.getFirstName())) {
            guestUser.setFirstName(firstName.trim());
        }
        if (lastName != null && !lastName.isBlank() && isBlank(guestUser.getLastName())) {
            guestUser.setLastName(lastName.trim());
        }
        guestUser.setName(buildName(guestUser.getFirstName(), guestUser.getLastName()));
        userRepository.save(guestUser);

        // Generate and store OTP
        String rawCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        String codeHash = hashToken(rawCode, verificationProperties.tokenPepper());
        LocalDateTime now = LocalDateTime.now(clock);
        linkAccountOtpRepository.deleteAllByUserId(userId);
        linkAccountOtpRepository.save(LinkAccountOtpToken.builder()
                .user(guestUser)
                .codeHash(codeHash)
                .expiresAt(now.plusMinutes(OTP_TTL_MINUTES))
                .createdAt(now)
                .build());

        sendOtpEmail(normalizedEmail, rawCode, guestUser.getPreferredLanguage());
        log.info("Link-account OTP sent: userId={}", userId);
        return new OkResponse(true);
    }

    /**
     * Step 2: verifies the OTP code and completes the account upgrade to REGISTERED.
     */
    @Transactional
    public LoginResponse verifyLinkAccountEmailOtp(Long userId, String email, String code) {
        User guestUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (guestUser.getUserType() != UserType.GUEST) {
            throw new IllegalArgumentException("ACCOUNT_ALREADY_LINKED");
        }

        String normalizedEmail = normalizeIdentifier(email);
        if (!normalizedEmail.equalsIgnoreCase(guestUser.getEmail())) {
            throw new IllegalArgumentException("OTP_INVALID");
        }

        LinkAccountOtpToken otpToken = linkAccountOtpRepository
                .findTopByUserIdOrderByCreatedAtDesc(userId)
                .orElseThrow(() -> new IllegalArgumentException("OTP_INVALID"));

        LocalDateTime now = LocalDateTime.now(clock);
        if (otpToken.isUsed() || otpToken.isExpired(now)) {
            throw new IllegalArgumentException("OTP_EXPIRED");
        }

        String codeHash = hashToken(code, verificationProperties.tokenPepper());
        if (!codeHash.equals(otpToken.getCodeHash())) {
            throw new IllegalArgumentException("OTP_INVALID");
        }

        otpToken.setUsedAt(now);
        linkAccountOtpRepository.save(otpToken);

        // Upgrade to REGISTERED
        guestUser.setUserType(UserType.REGISTERED);
        guestUser.setIsAnonymous(false);
        guestUser.setIsAccountLinked(true);
        guestUser.setAccountStatus(AccountStatus.ACTIVE);
        guestUser.setEmailVerifiedAt(now);
        User saved = userRepository.save(guestUser);
        signupBonusSyncService.scheduleSignupBonus(saved, "GUEST_LINK_EMAIL");
        log.info("Guest account linked with email and verified: userId={}", saved.getId());

        String accessToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.REGISTERED);
        String refreshToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.REGISTERED);
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(saved), false);
    }

    /**
     * Verifies the 6-digit OTP sent during registration and activates the account.
     * Returns a full LoginResponse so the mobile client can auto-login after verification.
     */
    @Transactional
    public LoginResponse verifyEmailOtp(String email, String code) {
        String normalizedEmail = normalizeIdentifier(email);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("OTP_INVALID"));

        if (user.getAccountStatus() == AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("ALREADY_VERIFIED");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        String tokenHash = hashToken(user.getId() + ":" + code, verificationProperties.tokenPepper());

        int consumed = verificationTokenRepository.consumeTokenIfValid(tokenHash, now);
        if (consumed == 0) {
            Optional<EmailVerificationToken> token = verificationTokenRepository.findByTokenHash(tokenHash);
            if (token.isEmpty() || token.get().isRevoked()) {
                throw new IllegalArgumentException("OTP_INVALID");
            }
            if (token.get().isExpired(now)) {
                throw new IllegalArgumentException("OTP_EXPIRED");
            }
            throw new IllegalArgumentException("OTP_INVALID");
        }

        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setEmailVerifiedAt(now);
        verificationTokenRepository.revokeActiveTokensByUserId(user.getId(), now);
        User saved = userRepository.save(user);
        log.info("Email OTP verified, account activated: userId={}", saved.getId());

        natalChartProvisioningService.ensureNatalChartIfEligible(saved);

        String accessToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.REGISTERED);
        String refreshToken = jwtTokenProvider.generateToken(saved.getId(), saved.getUsername(), saved.getEmail(), UserType.REGISTERED);
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(saved));
    }

    private void sendOtpEmail(String toEmail, String code, String locale) {
        boolean isEn = "en".equalsIgnoreCase(locale);
        String subject = isEn ? "Astro Guru — Verification Code" : "Astro Guru — Doğrulama Kodu";
        String heading = isEn ? "Your Verification Code" : "Doğrulama Kodun";
        String body = isEn
                ? "Use the 6-digit code below to link your account. The code is valid for <strong>10 minutes</strong>."
                : "Hesabını bağlamak için aşağıdaki 6 haneli kodu kullan. Kod <strong>10 dakika</strong> geçerlidir.";
        String privacy = isEn ? "Never share this code with anyone." : "Bu kodu kimseyle paylaşma.";
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, "Astro Guru"));
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(
                "<div style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff'>"
                + "<div style='text-align:center;margin-bottom:28px'>"
                + "<div style='display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#9D4EDD,#C77DFF);border-radius:16px;line-height:64px;font-size:32px'>✨</div>"
                + "<div style='color:#9D4EDD;font-size:20px;font-weight:700;margin-top:10px'>Astro Guru</div>"
                + "</div>"
                + "<h2 style='color:#1a1a2e;font-size:20px;margin-bottom:8px'>" + heading + "</h2>"
                + "<p style='color:#555;line-height:1.6'>" + body + "</p>"
                + "<div style='font-size:36px;font-weight:700;letter-spacing:8px;color:#9D4EDD;padding:24px;text-align:center;"
                + "background:#F9F0FF;border-radius:12px;margin:24px 0'>" + code + "</div>"
                + "<p style='color:#999;font-size:13px'>" + privacy + "</p>"
                + "<hr style='border:none;border-top:1px solid #eee;margin:24px 0'/>"
                + "<p style='color:#bbb;font-size:11px;text-align:center'>© Astro Guru</p>"
                + "</div>", true);
            mailSender.send(mimeMessage);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new IllegalStateException("EMAIL_SEND_FAILED");
        }
    }

    private String buildGuestPlaceholderPassword(String guestSuffix) {
        String raw = "guest:" + guestSuffix + ":" + UUID.randomUUID();
        return passwordEncoder.encode(raw);
    }

    // -------------------------------------------------------------------------

    private LoginResponse buildSocialLoginResponse(User user, boolean isNewUser) {
        UserType userType = user.getUserType() != null ? user.getUserType() : UserType.REGISTERED;
        String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail(), userType);
        String refreshToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail(), userType);
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(user), isNewUser);
    }

    private boolean requiresOnboarding(User user) {
        return user.getBirthDate() == null
                || isBlank(user.getBirthCountry())
                || isBlank(user.getBirthCity())
                || isBlank(user.getGender());
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

        String rawCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        // Include userId in hash to prevent cross-user collisions on the same 6-digit code
        String tokenHash = hashToken(user.getId() + ":" + rawCode, verificationProperties.tokenPepper());

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(now.plusMinutes(OTP_TTL_MINUTES))
                .createdAt(now)
                .build();

        verificationTokenRepository.save(verificationToken);
        sendVerificationOtpEmail(user.getEmail(), rawCode, user.getPreferredLanguage());
    }

    private void sendVerificationOtpEmail(String toEmail, String code, String locale) {
        boolean isEn = "en".equalsIgnoreCase(locale);
        String subject = isEn ? "Astro Guru — Email Verification Code" : "Astro Guru — E-posta Doğrulama Kodu";
        String heading = isEn ? "Your Email Verification Code" : "E-posta Doğrulama Kodun";
        String body = isEn
                ? "Use the 6-digit code below to verify your account. The code is valid for <strong>10 minutes</strong>."
                : "Hesabını doğrulamak için aşağıdaki 6 haneli kodu kullan. Kod <strong>10 dakika</strong> geçerlidir.";
        String privacy = isEn ? "Never share this code with anyone." : "Bu kodu kimseyle paylaşma.";
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, "Astro Guru"));
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(
                "<div style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff'>"
                + "<div style='text-align:center;margin-bottom:28px'>"
                + "<div style='display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#9D4EDD,#C77DFF);border-radius:16px;line-height:64px;font-size:32px'>✨</div>"
                + "<div style='color:#9D4EDD;font-size:20px;font-weight:700;margin-top:10px'>Astro Guru</div>"
                + "</div>"
                + "<h2 style='color:#1a1a2e;font-size:20px;margin-bottom:8px'>" + heading + "</h2>"
                + "<p style='color:#555;line-height:1.6'>" + body + "</p>"
                + "<div style='font-size:36px;font-weight:700;letter-spacing:8px;color:#9D4EDD;padding:24px;text-align:center;"
                + "background:#F9F0FF;border-radius:12px;margin:24px 0'>" + code + "</div>"
                + "<p style='color:#999;font-size:13px'>" + privacy + "</p>"
                + "<hr style='border:none;border-top:1px solid #eee;margin:24px 0'/>"
                + "<p style='color:#bbb;font-size:11px;text-align:center'>© Astro Guru</p>"
                + "</div>", true);
            mailSender.send(mimeMessage);
        } catch (Exception e) {
            log.error("Failed to send verification OTP email to {}: {}", toEmail, e.getMessage());
            throw new IllegalStateException("EMAIL_SEND_FAILED");
        }
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
                UUID.randomUUID().toString(),
                user.getPreferredLanguage() != null ? user.getPreferredLanguage() : "tr"
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

    private MediaType safeMediaType(String contentType) {
        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private String buildAvatarUrl(User user) {
        String avatarPath = trimToNull(user.getAvatarPath());
        if (avatarPath == null || user.getId() == null) {
            return null;
        }

        long version = user.getUpdatedAt() != null
                ? user.getUpdatedAt().atOffset(ZoneOffset.UTC).toEpochSecond()
                : 0L;

        return publicUrlProperties.apiPublicUrl()
                + "/api/v1/auth/profile/avatar/"
                + user.getId()
                + "?v="
                + version;
    }

    @Transactional
    public void deleteAccount(Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (Boolean.TRUE.equals(user.getHasLocalPassword())) {
            if (password == null || password.isBlank() || !passwordEncoder.matches(password, user.getPassword())) {
                throw new WrongPasswordException();
            }
        }

        user.setAccountStatus(AccountStatus.DELETED);
        user.setEnabled(false);

        // Anonymize email and username to free them for potential re-registration
        if (user.getEmail() != null && !user.getEmail().startsWith("deleted_")) {
            user.setEmail("deleted_" + userId + "_" + user.getEmail());
        }
        if (user.getUsername() != null && !user.getUsername().startsWith("deleted_")) {
            user.setUsername("deleted_" + userId + "_" + user.getUsername());
        }

        userRepository.save(user);

        try { linkAccountOtpRepository.deleteAllByUserId(userId); } catch (Exception ignored) {}

        log.info("Account permanently deleted (soft) for userId={}", userId);
    }

    private UserDTO toUserDTO(User user) {
        String avatarUrl = buildAvatarUrl(user);
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
                .zodiacSign(user.getZodiacSign())
                .avatarUri(avatarUrl)
                .avatarUrl(avatarUrl)
                .preferredLanguage(user.getPreferredLanguage())
                .roles(user.getRoles())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .hasPassword(Boolean.TRUE.equals(user.getHasLocalPassword()))
                .provider(user.getProvider())
                .userType(user.getUserType() != null ? user.getUserType().name() : UserType.REGISTERED.name())
                .isAnonymous(Boolean.TRUE.equals(user.getIsAnonymous()))
                .isAccountLinked(Boolean.TRUE.equals(user.getIsAccountLinked()))
                .build();
    }
}
