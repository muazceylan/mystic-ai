package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.LevelPlayCallbackProperties;
import com.mysticai.notification.dto.rewarded.LevelPlayCallbackParams;
import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.ProviderCallbackEventRepository;
import com.mysticai.notification.repository.RewardSessionRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LevelPlayRewardCallbackService {
    private static final RewardProvider PROVIDER = RewardProvider.LEVELPLAY;

    private final RewardSessionRepository sessionRepository;
    private final ProviderCallbackEventRepository eventRepository;
    private final GuruWalletService walletService;
    private final LevelPlayCallbackProperties properties;
    private final LevelPlaySignatureVerifier signatureVerifier;

    @Autowired
    @Lazy
    private LevelPlayRewardCallbackService self;

    public enum Outcome { PROCESSED, DUPLICATE, BAD_REQUEST, FORBIDDEN, ERROR }
    public record Result(Outcome outcome, String code) {}

    public Result handle(LevelPlayCallbackParams params) {
        if (!hasRequiredValues(params)) {
            return new Result(Outcome.BAD_REQUEST, "MISSING_REQUIRED_PARAMETER");
        }
        if (!signatureVerifier.verify(params)) {
            return new Result(Outcome.FORBIDDEN, "BAD_SIGNATURE");
        }
        try {
            return self.process(params);
        } catch (DataIntegrityViolationException race) {
            log.info("[LEVELPLAY] Concurrent duplicate detected for eventId={}", params.eventId());
            return self.replay(params.eventId());
        } catch (RuntimeException error) {
            log.error("[LEVELPLAY] Callback processing failed for eventId={}: {}",
                    params.eventId(), error.getMessage(), error);
            return new Result(Outcome.ERROR, "INTERNAL_ERROR");
        }
    }

    @Transactional
    public Result process(LevelPlayCallbackParams params) {
        Optional<ProviderCallbackEvent> replay =
                eventRepository.findByProviderAndProviderTransactionId(PROVIDER, params.eventId());
        if (replay.isPresent()) {
            return replayOutcome(replay.get());
        }
        if (params.rewards() != properties.getExpectedRewardAmount()) {
            return reject(params, null, null, "BAD_REWARD_AMOUNT");
        }

        UUID sessionId = parseUuid(params.rewardSessionId());
        if (sessionId == null) return reject(params, null, null, "INVALID_REWARD_SESSION");
        Optional<RewardSession> sessionOptional = sessionRepository.findByIdForUpdate(sessionId);

        Optional<ProviderCallbackEvent> afterLock =
                eventRepository.findByProviderAndProviderTransactionId(PROVIDER, params.eventId());
        if (afterLock.isPresent()) {
            return replayOutcome(afterLock.get());
        }

        if (sessionOptional.isEmpty()) return reject(params, sessionId, null, "SESSION_NOT_FOUND");

        RewardSession session = sessionOptional.get();
        if (session.getProvider() != PROVIDER) {
            return reject(params, sessionId, session.getUserId(), "SESSION_PROVIDER_MISMATCH");
        }
        if (session.isExpired() || session.getStatus() == RewardSessionStatus.EXPIRED) {
            session.setStatus(RewardSessionStatus.EXPIRED);
            sessionRepository.save(session);
            return reject(params, sessionId, session.getUserId(), "SESSION_EXPIRED");
        }
        if (session.getStatus() != RewardSessionStatus.CREATED) {
            return new Result(Outcome.DUPLICATE, "OK");
        }
        if (!String.valueOf(session.getUserId()).equals(params.userId())) {
            return reject(params, sessionId, session.getUserId(), "USER_MISMATCH");
        }

        int amount = properties.getRewardAmount();
        GuruLedger ledger = walletService.earnProviderReward(
                session.getUserId(), amount, PROVIDER.name(), params.eventId(),
                sessionId.toString(), params.placementName(),
                "levelplay_rewarded_" + params.eventId(),
                "{\"provider\":\"LEVELPLAY\",\"rewardSessionId\":\"" + sessionId
                        + "\",\"eventId\":\"" + safe(params.eventId()) + "\"}");

        session.setStatus(RewardSessionStatus.REWARDED);
        session.setRewardedAt(LocalDateTime.now());
        sessionRepository.save(session);
        eventRepository.save(event(params, sessionId, session.getUserId(),
                ProviderCallbackEvent.CallbackStatus.PROCESSED, null, amount,
                ledger != null && ledger.getId() != null ? ledger.getId().toString() : null));
        return new Result(Outcome.PROCESSED, "OK");
    }

    @Transactional
    public Result replay(String eventId) {
        return eventRepository.findByProviderAndProviderTransactionId(PROVIDER, eventId)
                .map(this::replayOutcome)
                .orElse(new Result(Outcome.ERROR, "REPLAY_NOT_FOUND"));
    }

    private Result replayOutcome(ProviderCallbackEvent event) {
        return event.getStatus() == ProviderCallbackEvent.CallbackStatus.PROCESSED
                || event.getStatus() == ProviderCallbackEvent.CallbackStatus.DUPLICATE
                ? new Result(Outcome.DUPLICATE, "OK")
                : new Result(Outcome.BAD_REQUEST,
                event.getRejectionReason() == null ? "REJECTED" : event.getRejectionReason());
    }

    private Result reject(LevelPlayCallbackParams params, UUID sessionId, Long userId, String reason) {
        eventRepository.save(event(params, sessionId, userId,
                ProviderCallbackEvent.CallbackStatus.REJECTED, reason, 0, null));
        return new Result(Outcome.BAD_REQUEST, reason);
    }

    private ProviderCallbackEvent event(LevelPlayCallbackParams params, UUID sessionId, Long userId,
                                        ProviderCallbackEvent.CallbackStatus status, String reason,
                                        int amount, String ledgerId) {
        return ProviderCallbackEvent.builder()
                .provider(PROVIDER)
                .providerTransactionId(params.eventId())
                .userId(userId)
                .rewardSessionId(sessionId)
                .placementIdentifier(params.placementName())
                .adslotId(params.adNetwork())
                .currencyAmount(params.rewards())
                .status(status)
                .rejectionReason(reason)
                .grantedAmount(amount)
                .ledgerEntryId(ledgerId)
                .processedAt(LocalDateTime.now())
                .build();
    }

    private static UUID parseUuid(String value) {
        try {
            return value == null ? null : UUID.fromString(value.trim());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value.replace("\\", "").replace("\"", "");
    }

    private static boolean hasRequiredValues(LevelPlayCallbackParams params) {
        return params != null
                && hasText(params.timestamp())
                && hasText(params.eventId())
                && hasText(params.userId())
                && hasText(params.rewardSessionId());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
