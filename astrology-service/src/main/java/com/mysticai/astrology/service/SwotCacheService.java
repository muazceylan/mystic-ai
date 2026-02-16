package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.SwotResponse;
import com.mysticai.astrology.entity.DailySwot;
import com.mysticai.astrology.repository.DailySwotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Service for caching SWOT analysis results in Redis.
 * Provides a 2-layer caching strategy: Redis first, then PostgreSQL.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SwotCacheService {

    private final RedisTemplate<String, SwotResponse> swotRedisTemplate;
    private final DailySwotRepository dailySwotRepository;

    private static final String SWOT_CACHE_KEY_PREFIX = "swot:";
    private static final Duration SWOT_CACHE_TTL = Duration.ofHours(24);

    /**
     * Get SWOT analysis from cache (Redis first, then DB).
     */
    public Optional<SwotResponse> getSwot(Long userId, String sunSign, LocalDate date) {
        String cacheKey = buildCacheKey(userId, sunSign, date);

        // Try Redis first
        try {
            SwotResponse cached = swotRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("SWOT cache hit for key: {}", cacheKey);
                return Optional.of(cached);
            }
        } catch (Exception e) {
            log.warn("Redis get failed for key: {}", cacheKey, e);
        }

        // Try PostgreSQL
        try {
            Optional<DailySwot> dbResult = dailySwotRepository.findByUserIdAndSunSignAndDate(userId, sunSign, date);
            if (dbResult.isPresent()) {
                DailySwot entity = dbResult.get();
                SwotResponse response = mapToResponse(entity);
                // Cache in Redis for next time
                cacheSwot(cacheKey, response);
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.warn("Database lookup failed for userId: {}, date: {}", userId, date, e);
        }

        return Optional.empty();
    }

    /**
     * Cache SWOT analysis result.
     */
    public void cacheSwot(String cacheKey, SwotResponse response) {
        try {
            swotRedisTemplate.opsForValue().set(cacheKey, response, SWOT_CACHE_TTL);
            log.debug("SWOT cached with key: {}", cacheKey);
        } catch (Exception e) {
            log.warn("Redis cache failed for key: {}", cacheKey, e);
        }
    }

    /**
     * Persist SWOT analysis to PostgreSQL.
     */
    public void persistSwot(DailySwot entity) {
        try {
            dailySwotRepository.save(entity);
            log.debug("SWOT persisted to database for userId: {}, date: {}", 
                    entity.getUserId(), entity.getDate());
        } catch (Exception e) {
            log.error("Database persist failed for userId: {}", entity.getUserId(), e);
        }
    }

    private String buildCacheKey(Long userId, String sunSign, LocalDate date) {
        return SWOT_CACHE_KEY_PREFIX + userId + ":" + sunSign + ":" + date.toString();
    }

    private SwotResponse mapToResponse(DailySwot entity) {
        return new SwotResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getSunSign(),
                entity.getDate(),
                entity.getStrengths(),
                entity.getWeaknesses(),
                entity.getOpportunities(),
                entity.getThreats(),
                entity.getMysticalAdvice()
        );
    }
}
