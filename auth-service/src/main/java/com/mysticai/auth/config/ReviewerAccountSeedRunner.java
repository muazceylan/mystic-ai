package com.mysticai.auth.config;

import com.mysticai.auth.config.properties.ReviewerAccountSeedProperties;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.enums.SignupBonusSyncStatus;
import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.service.NatalChartProvisioningService;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import static com.mysticai.auth.validation.PasswordPolicy.STRONG_PASSWORD_REGEX;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReviewerAccountSeedRunner implements ApplicationRunner {

    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile(STRONG_PASSWORD_REGEX);

    private final ReviewerAccountSeedProperties reviewerAccountSeedProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NatalChartProvisioningService natalChartProvisioningService;
    private final Clock clock;

    @Override
    public void run(ApplicationArguments args) {
        if (!reviewerAccountSeedProperties.enabled()) {
            return;
        }

        validateConfiguration();
        upsertAccount("primary", reviewerAccountSeedProperties.primaryAccount());
        upsertAccount("deletion", reviewerAccountSeedProperties.deletionTestAccount());
    }

    private void validateConfiguration() {
        ReviewerAccountSeedProperties.SeedAccount primary = reviewerAccountSeedProperties.primaryAccount();
        ReviewerAccountSeedProperties.SeedAccount deletion = reviewerAccountSeedProperties.deletionTestAccount();

        String normalizedPrimaryEmail = normalizeIdentifier(primary.email());
        String normalizedDeletionEmail = normalizeIdentifier(deletion.email());

        validateSeedAccount("primary", primary);
        validateSeedAccount("deletion", deletion);

        if (normalizedPrimaryEmail.equals(normalizedDeletionEmail)) {
            throw new IllegalStateException("Reviewer seed accounts must use distinct email addresses.");
        }
    }

    private void validateSeedAccount(String label, ReviewerAccountSeedProperties.SeedAccount account) {
        String normalizedEmail = normalizeIdentifier(account.email());
        if (normalizedEmail.isBlank()) {
            throw new IllegalStateException("Reviewer seed " + label + " email is required when seed is enabled.");
        }

        try {
            InternetAddress address = new InternetAddress(normalizedEmail, true);
            address.validate();
        } catch (AddressException ex) {
            throw new IllegalStateException("Reviewer seed " + label + " email is invalid.", ex);
        }

        if (account.password() == null || !STRONG_PASSWORD_PATTERN.matcher(account.password()).matches()) {
            throw new IllegalStateException(
                    "Reviewer seed " + label + " password must satisfy the strong password policy."
            );
        }
    }

    private void upsertAccount(String label, ReviewerAccountSeedProperties.SeedAccount account) {
        String normalizedEmail = normalizeIdentifier(account.email());
        User user = findExistingUser(normalizedEmail).orElseGet(User::new);
        boolean isNew = user.getId() == null;
        LocalDateTime now = LocalDateTime.now(clock);

        applySeedFields(user, account, normalizedEmail, now);

        User saved = userRepository.save(user);
        natalChartProvisioningService.ensureNatalChartIfEligible(saved);

        log.info("Reviewer seed {} account {}: {}", label, isNew ? "created" : "updated", normalizedEmail);
    }

    private Optional<User> findExistingUser(String normalizedEmail) {
        return userRepository.findByEmailIgnoreCase(normalizedEmail)
                .or(() -> userRepository.findByUsernameIgnoreCase(normalizedEmail));
    }

    private void applySeedFields(User user,
                                 ReviewerAccountSeedProperties.SeedAccount account,
                                 String normalizedEmail,
                                 LocalDateTime now) {
        ReviewerAccountSeedProperties.SeedProfile profile = reviewerAccountSeedProperties.profile();

        user.setUsername(normalizedEmail);
        user.setEmail(normalizedEmail);
        user.setFirstName(trimToNull(account.firstName()));
        user.setLastName(trimToNull(account.lastName()));
        user.setName(buildName(account.firstName(), account.lastName()));
        user.setProvider(null);
        user.setSocialId(null);
        user.setBirthDate(profile.birthDate());
        user.setBirthTime(trimToNull(profile.birthTime()));
        user.setBirthLocation(trimToNull(profile.birthLocation()));
        user.setBirthCountry(trimToNull(profile.birthCountry()));
        user.setBirthCity(trimToNull(profile.birthCity()));
        user.setBirthTimeUnknown(profile.birthTimeUnknown());
        user.setTimezone(trimToNull(profile.timezone()));
        user.setGender(trimToNull(profile.gender()));
        user.setMaritalStatus(trimToNull(profile.maritalStatus()));
        user.setPreferredLanguage(defaultIfBlank(profile.preferredLanguage(), "en"));
        user.setRoles(Set.of("USER"));
        user.setEnabled(true);
        user.setHasLocalPassword(true);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setUserType(UserType.REGISTERED);
        user.setIsAnonymous(false);
        user.setIsAccountLinked(false);
        user.setEmailVerifiedAt(Objects.requireNonNullElse(user.getEmailVerifiedAt(), now));
        user.setSignupBonusSyncStatus(SignupBonusSyncStatus.SKIPPED);
        user.setSignupBonusRegistrationSource(null);
        user.setSignupBonusRetryCount(0);
        user.setSignupBonusLastAttemptAt(null);
        user.setSignupBonusNextRetryAt(null);
        user.setSignupBonusGrantedAt(null);
        user.setSignupBonusLastError(null);

        String currentPassword = user.getPassword();
        if (currentPassword == null || currentPassword.isBlank() || !passwordEncoder.matches(account.password(), currentPassword)) {
            user.setPassword(passwordEncoder.encode(account.password()));
        }
    }

    private String normalizeIdentifier(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultIfBlank(String value, String fallback) {
        String trimmed = trimToNull(value);
        return trimmed == null ? fallback : trimmed;
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

        if (safeFirstName == null && safeLastName == null) {
            return null;
        }
        if (safeFirstName == null) {
            return safeLastName;
        }
        if (safeLastName == null) {
            return safeFirstName;
        }
        return safeFirstName + " " + safeLastName;
    }
}
