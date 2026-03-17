package com.mysticai.auth.service;

import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuestUserCleanupServiceTest {

    @Mock private UserRepository userRepository;

    private GuestUserCleanupService cleanupService;

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-02-01T03:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        cleanupService = new GuestUserCleanupService(userRepository, FIXED_CLOCK);
    }

    @Test
    void purge_deletes_stale_guests_and_returns_count() {
        // cutoff = 2026-02-01 - 30 days = 2026-01-02 03:00:00 UTC
        when(userRepository.countStaleGuests(eq(UserType.GUEST), any(LocalDateTime.class))).thenReturn(5L);
        when(userRepository.deleteStaleGuests(eq(UserType.GUEST), any(LocalDateTime.class))).thenReturn(5);

        int deleted = cleanupService.purgeStaleGuestAccounts();

        assertThat(deleted).isEqualTo(5);
        verify(userRepository).deleteStaleGuests(eq(UserType.GUEST), any(LocalDateTime.class));
    }

    @Test
    void purge_skips_delete_when_no_eligible_accounts() {
        when(userRepository.countStaleGuests(eq(UserType.GUEST), any(LocalDateTime.class))).thenReturn(0L);

        int deleted = cleanupService.purgeStaleGuestAccounts();

        assertThat(deleted).isZero();
        // deleteStaleGuests must NOT be called when eligible count is 0
        verify(userRepository, org.mockito.Mockito.never())
                .deleteStaleGuests(any(), any());
    }

    @Test
    void cutoff_is_exactly_retention_days_before_now() {
        LocalDateTime expectedCutoff = LocalDateTime.of(2026, 1, 2, 3, 0, 0);

        when(userRepository.countStaleGuests(eq(UserType.GUEST), eq(expectedCutoff))).thenReturn(0L);

        cleanupService.purgeStaleGuestAccounts();

        verify(userRepository).countStaleGuests(UserType.GUEST, expectedCutoff);
    }
}
