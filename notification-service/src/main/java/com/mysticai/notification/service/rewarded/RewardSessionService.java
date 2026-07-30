package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.AyetCallbackProperties;
import com.mysticai.notification.entity.monetization.RewardChannel;
import com.mysticai.notification.entity.monetization.RewardProvider;
import com.mysticai.notification.entity.monetization.RewardSession;
import com.mysticai.notification.entity.monetization.RewardSessionStatus;
import com.mysticai.notification.repository.RewardSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Creates and expires opaque reward sessions used by provider S2S rewarded-ad flows.
 *
 * The session id is the unguessable {@code external_identifier} bound to a single
 * user. Token grants are settled later by {@link AyetRewardCallbackService} when the
 * provider posts its callback; this service never touches the wallet directly.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RewardSessionService {

    private final RewardSessionRepository sessionRepository;
    private final AyetCallbackProperties ayetProps;
    private final com.mysticai.notification.config.LevelPlayCallbackProperties levelPlayProps;

    @Transactional
    public RewardSession createSession(Long userId, String providerRaw, String channelRaw, String placement) {
        RewardProvider provider = parseProvider(providerRaw);
        RewardChannel channel = parseChannel(channelRaw);

        int rewardAmount = provider == RewardProvider.AYET
                ? ayetProps.getRewardAmount() : levelPlayProps.getRewardAmount();
        long ttlSeconds = provider == RewardProvider.AYET
                ? ayetProps.getSessionTtlSeconds() : levelPlayProps.getSessionTtlSeconds();

        if (provider == RewardProvider.LEVELPLAY) {
            LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
            long issuedToday = sessionRepository.countIssuedToday(userId, provider, startOfDay);
            if (issuedToday >= levelPlayProps.getDailyLimit()) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                        "Daily rewarded-ad limit reached");
            }
        }

        RewardSession session = RewardSession.builder()
                .userId(userId)
                .provider(provider)
                .channel(channel)
                .placement(placement)
                .rewardAmount(rewardAmount)
                .status(RewardSessionStatus.CREATED)
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .build();

        session = sessionRepository.save(session);
        log.info("[REWARD_SESSION] Created sessionId={} userId={} provider={} channel={} amount={}",
                session.getId(), userId, provider, channel, rewardAmount);
        return session;
    }

    @Transactional
    public int expireStaleSessions() {
        int count = sessionRepository.expireStaleSessions(LocalDateTime.now());
        if (count > 0) log.info("[REWARD_SESSION] Expired {} stale reward sessions", count);
        return count;
    }

    private RewardProvider parseProvider(String raw) {
        if (raw == null || raw.isBlank()) return RewardProvider.AYET;
        try {
            return RewardProvider.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported reward provider");
        }
    }

    private RewardChannel parseChannel(String raw) {
        if (raw == null || raw.isBlank()) return RewardChannel.WEB;
        try {
            return RewardChannel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("[REWARD_SESSION] Unknown channel '{}', defaulting to WEB", raw);
            return RewardChannel.WEB;
        }
    }
}
