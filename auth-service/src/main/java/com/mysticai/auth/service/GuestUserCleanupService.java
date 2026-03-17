package com.mysticai.auth.service;

import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * Purges stale guest (anonymous) accounts that have not been active for the
 * configured retention period.
 *
 * <p>A guest account is considered stale when its {@code updated_at} timestamp
 * has not changed in {@code GUEST_RETENTION_DAYS} days, meaning the user
 * never returned and never linked a real account.
 *
 * <p>All guest accounts that <em>have</em> been linked are already converted to
 * {@code REGISTERED} and are therefore never matched by this query.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GuestUserCleanupService {

    /** Number of days of inactivity before a guest account is eligible for deletion. */
    public static final int GUEST_RETENTION_DAYS = 30;

    private final UserRepository userRepository;
    private final Clock clock;

    /**
     * Deletes all GUEST accounts whose {@code updated_at} is older than
     * {@value #GUEST_RETENTION_DAYS} days. Runs inside its own transaction
     * so that a single large batch does not lock the table for extended periods.
     *
     * @return number of accounts deleted
     */
    @Transactional
    public int purgeStaleGuestAccounts() {
        LocalDateTime cutoff = LocalDateTime.now(clock).minusDays(GUEST_RETENTION_DAYS);

        long eligible = userRepository.countStaleGuests(UserType.GUEST, cutoff);
        if (eligible == 0) {
            log.debug("Guest cleanup: no stale accounts found (cutoff={})", cutoff);
            return 0;
        }

        log.info("Guest cleanup: deleting {} stale guest accounts (cutoff={})", eligible, cutoff);
        int deleted = userRepository.deleteStaleGuests(UserType.GUEST, cutoff);
        log.info("Guest cleanup complete: deleted={}", deleted);
        return deleted;
    }
}
