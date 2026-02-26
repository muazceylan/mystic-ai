package com.mysticai.spiritual.service;

import com.mysticai.spiritual.exception.DuplicateRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);
    private final StringRedisTemplate redisTemplate;

    public void reserveOrThrow(Long userId, String scope, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        String key = "spiritual:idempotency:" + scope + ":" + userId + ":" + idempotencyKey.trim();
        try {
            Boolean ok = redisTemplate.opsForValue().setIfAbsent(key, "1", DEFAULT_TTL);
            if (Boolean.FALSE.equals(ok)) {
                throw new DuplicateRequestException("Duplicate request");
            }
        } catch (DuplicateRequestException ex) {
            throw ex;
        } catch (Exception e) {
            // Idempotency is best-effort in local/dev; do not block logging if Redis is unavailable.
            log.warn("Idempotency check skipped due to Redis error: {}", e.getMessage());
        }
    }
}

