package com.mysticai.gateway.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QuickStartRateLimitFilterTest {

    private QuickStartRateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new QuickStartRateLimitFilter();
    }

    @Test
    void allows_requests_within_window_limit() {
        long now = 1_000_000L;
        for (int i = 0; i < QuickStartRateLimitFilter.MAX_REQUESTS_PER_WINDOW; i++) {
            boolean allowed = filter.checkAndRecord("1.2.3.4", now + i);
            assertThat(allowed).as("Request #%d should be allowed", i + 1).isTrue();
        }
    }

    @Test
    void blocks_request_exceeding_window_limit() {
        long now = 1_000_000L;
        for (int i = 0; i < QuickStartRateLimitFilter.MAX_REQUESTS_PER_WINDOW; i++) {
            filter.checkAndRecord("1.2.3.4", now + i);
        }

        boolean blocked = filter.checkAndRecord("1.2.3.4", now + QuickStartRateLimitFilter.MAX_REQUESTS_PER_WINDOW);
        assertThat(blocked).isFalse();
    }

    @Test
    void allows_again_after_window_slides() {
        long now = 1_000_000L;
        // Fill window
        for (int i = 0; i < QuickStartRateLimitFilter.MAX_REQUESTS_PER_WINDOW; i++) {
            filter.checkAndRecord("1.2.3.4", now + i);
        }

        // Move forward past the window
        long future = now + QuickStartRateLimitFilter.WINDOW_SECONDS + 10;
        boolean allowed = filter.checkAndRecord("1.2.3.4", future);
        assertThat(allowed).isTrue();
    }

    @Test
    void different_ips_have_independent_limits() {
        long now = 1_000_000L;
        // Fill limit for IP A
        for (int i = 0; i < QuickStartRateLimitFilter.MAX_REQUESTS_PER_WINDOW; i++) {
            filter.checkAndRecord("10.0.0.1", now + i);
        }

        // IP B should still be allowed
        boolean allowed = filter.checkAndRecord("10.0.0.2", now);
        assertThat(allowed).isTrue();

        // IP A should be blocked
        boolean blocked = filter.checkAndRecord("10.0.0.1", now + QuickStartRateLimitFilter.MAX_REQUESTS_PER_WINDOW);
        assertThat(blocked).isFalse();
    }
}
