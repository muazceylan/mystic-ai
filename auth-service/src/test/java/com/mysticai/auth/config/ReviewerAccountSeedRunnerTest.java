package com.mysticai.auth.config;

import com.mysticai.auth.config.properties.ReviewerAccountSeedProperties;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.enums.SignupBonusSyncStatus;
import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.service.NatalChartProvisioningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewerAccountSeedRunnerTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private NatalChartProvisioningService natalChartProvisioningService;

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-05-01T09:00:00Z"), ZoneOffset.UTC);

    private ReviewerAccountSeedRunner runner;

    @BeforeEach
    void setUp() {
        runner = new ReviewerAccountSeedRunner(
                enabledProperties(),
                userRepository,
                passwordEncoder,
                natalChartProvisioningService,
                FIXED_CLOCK
        );
    }

    @Test
    void run_skips_when_seed_disabled() throws Exception {
        ReviewerAccountSeedRunner disabledRunner = new ReviewerAccountSeedRunner(
                disabledProperties(),
                userRepository,
                passwordEncoder,
                natalChartProvisioningService,
                FIXED_CLOCK
        );

        disabledRunner.run(new DefaultApplicationArguments(new String[0]));

        verify(userRepository, never()).save(any(User.class));
        verify(natalChartProvisioningService, never()).ensureNatalChartIfEligible(any(User.class));
    }

    @Test
    void run_creates_primary_and_deletion_accounts_as_active_onboarded_users() throws Exception {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "encoded:" + invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User input = invocation.getArgument(0);
            if (input.getId() == null) {
                input.setId(input.getEmail().startsWith("reviewer") ? 101L : 102L);
            }
            return input;
        });

        runner.run(new DefaultApplicationArguments(new String[0]));

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(2)).save(userCaptor.capture());

        List<User> savedUsers = userCaptor.getAllValues();
        assertThat(savedUsers).hasSize(2);

        User primary = savedUsers.stream()
                .filter(user -> "reviewer@astroguru.app".equals(user.getEmail()))
                .findFirst()
                .orElseThrow();
        User deletion = savedUsers.stream()
                .filter(user -> "delete-test@astroguru.app".equals(user.getEmail()))
                .findFirst()
                .orElseThrow();

        assertSeededUser(primary, "Play", "Reviewer");
        assertSeededUser(deletion, "Delete", "Test");

        verify(natalChartProvisioningService).ensureNatalChartIfEligible(primary);
        verify(natalChartProvisioningService).ensureNatalChartIfEligible(deletion);
    }

    @Test
    void run_updates_existing_account_without_reencoding_matching_password() throws Exception {
        User existing = User.builder()
                .id(77L)
                .username("legacy-reviewer")
                .email("reviewer@astroguru.app")
                .password("encoded-existing")
                .accountStatus(AccountStatus.PENDING_VERIFICATION)
                .userType(UserType.GUEST)
                .isAnonymous(true)
                .enabled(false)
                .build();

        when(userRepository.findByEmailIgnoreCase("reviewer@astroguru.app")).thenReturn(Optional.of(existing));
        when(userRepository.findByEmailIgnoreCase("delete-test@astroguru.app")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.matches("Review3r!Pass", "encoded-existing")).thenReturn(true);
        when(passwordEncoder.encode("Delete3r!Pass")).thenReturn("encoded-delete");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        runner.run(new DefaultApplicationArguments(new String[0]));

        assertThat(existing.getUsername()).isEqualTo("reviewer@astroguru.app");
        assertThat(existing.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(existing.getUserType()).isEqualTo(UserType.REGISTERED);
        assertThat(existing.getIsAnonymous()).isFalse();
        assertThat(existing.getSignupBonusSyncStatus()).isEqualTo(SignupBonusSyncStatus.SKIPPED);
        assertThat(existing.getPassword()).isEqualTo("encoded-existing");
        verify(passwordEncoder, never()).encode("Review3r!Pass");
    }

    @Test
    void run_fails_fast_when_password_is_weak() {
        ReviewerAccountSeedRunner weakPasswordRunner = new ReviewerAccountSeedRunner(
                new ReviewerAccountSeedProperties(
                        true,
                        "reviewer@astroguru.app",
                        "weak",
                        "delete-test@astroguru.app",
                        "Delete3r!Pass",
                        "1992-08-17",
                        "",
                        true,
                        "TR",
                        "Istanbul",
                        "Istanbul, TR",
                        "Europe/Istanbul",
                        "WOMAN",
                        "SINGLE",
                        "en"
                ),
                userRepository,
                passwordEncoder,
                natalChartProvisioningService,
                FIXED_CLOCK
        );

        assertThatThrownBy(() -> weakPasswordRunner.run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("strong password policy");
    }

    private void assertSeededUser(User user, String firstName, String lastName) {
        assertThat(user.getUsername()).isEqualTo(user.getEmail());
        assertThat(user.getFirstName()).isEqualTo(firstName);
        assertThat(user.getLastName()).isEqualTo(lastName);
        assertThat(user.getName()).isEqualTo(firstName + " " + lastName);
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.getUserType()).isEqualTo(UserType.REGISTERED);
        assertThat(user.getIsAnonymous()).isFalse();
        assertThat(user.getIsAccountLinked()).isFalse();
        assertThat(user.getHasLocalPassword()).isTrue();
        assertThat(user.isEnabled()).isTrue();
        assertThat(user.getBirthDate()).isEqualTo(java.time.LocalDate.parse("1992-08-17"));
        assertThat(user.getBirthCountry()).isEqualTo("TR");
        assertThat(user.getBirthCity()).isEqualTo("Istanbul");
        assertThat(user.getBirthLocation()).isEqualTo("Istanbul, TR");
        assertThat(user.getBirthTimeUnknown()).isTrue();
        assertThat(user.getGender()).isEqualTo("WOMAN");
        assertThat(user.getMaritalStatus()).isEqualTo("SINGLE");
        assertThat(user.getTimezone()).isEqualTo("Europe/Istanbul");
        assertThat(user.getPreferredLanguage()).isEqualTo("en");
        assertThat(user.getRoles()).containsExactlyInAnyOrder("USER");
        assertThat(user.getSignupBonusSyncStatus()).isEqualTo(SignupBonusSyncStatus.SKIPPED);
        assertThat(user.getEmailVerifiedAt()).isEqualTo(java.time.LocalDateTime.of(2026, 5, 1, 9, 0));
    }

    private ReviewerAccountSeedProperties enabledProperties() {
        return new ReviewerAccountSeedProperties(
                true,
                "reviewer@astroguru.app",
                "Review3r!Pass",
                "delete-test@astroguru.app",
                "Delete3r!Pass",
                "1992-08-17",
                "",
                true,
                "TR",
                "Istanbul",
                "Istanbul, TR",
                "Europe/Istanbul",
                "WOMAN",
                "SINGLE",
                "en"
        );
    }

    private ReviewerAccountSeedProperties disabledProperties() {
        return new ReviewerAccountSeedProperties(
                false,
                "",
                "",
                "",
                "",
                "1992-08-17",
                "",
                true,
                "TR",
                "Istanbul",
                "Istanbul, TR",
                "Europe/Istanbul",
                "WOMAN",
                "SINGLE",
                "en"
        );
    }
}
