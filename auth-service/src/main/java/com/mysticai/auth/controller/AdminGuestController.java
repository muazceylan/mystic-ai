package com.mysticai.auth.controller;

import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.service.GuestUserCleanupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * Admin-facing endpoints for guest user funnel metrics.
 *
 * <p>All paths are under {@code /api/auth/admin/guests/**} which is covered
 * by the gateway's {@code /api/auth/**} route. Gateway-level {@code X-Admin-*}
 * header propagation identifies the calling admin user.
 */
@RestController
@RequestMapping("/api/auth/admin/guests")
@RequiredArgsConstructor
public class AdminGuestController {

    private final UserRepository userRepository;
    private final Clock clock;

    /**
     * Returns a snapshot of guest user funnel metrics.
     *
     * <pre>
     * GET /api/auth/admin/guests/stats
     * → {
     *     totalGuests        : long,   // all active GUEST accounts
     *     convertedToday     : long,   // accounts linked today (guest → registered)
     *     staleGuests        : long,   // guest accounts inactive > 30 days
     *     conversionRatePct  : double  // convertedToday / max(new guests today, 1) × 100
     *   }
     * </pre>
     */
    @GetMapping("/stats")
    public ResponseEntity<GuestStats> stats() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime staleThreshold = now.minusDays(GuestUserCleanupService.GUEST_RETENTION_DAYS);

        long totalGuests = userRepository.countByUserType(UserType.GUEST);
        long convertedToday = userRepository.countLinkedAccountsSince(startOfDay);
        long staleGuests = userRepository.countStaleGuests(UserType.GUEST, staleThreshold);

        // Rough conversion rate: how many of today's new registered users came from quick-start
        double conversionRatePct = totalGuests > 0
                ? Math.min(100.0, (convertedToday * 100.0) / Math.max(1, totalGuests))
                : 0.0;

        return ResponseEntity.ok(new GuestStats(totalGuests, convertedToday, staleGuests, conversionRatePct));
    }

    public record GuestStats(
            long totalGuests,
            long convertedToday,
            long staleGuests,
            double conversionRatePct
    ) {}
}
