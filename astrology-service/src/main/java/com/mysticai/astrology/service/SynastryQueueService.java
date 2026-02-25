package com.mysticai.astrology.service;

import com.mysticai.astrology.entity.StarMateProfile;
import com.mysticai.astrology.entity.StarMateScoreCache;
import com.mysticai.astrology.entity.StarMateScoreCacheStatus;
import com.mysticai.astrology.repository.StarMateProfileRepository;
import com.mysticai.astrology.repository.StarMateScoreCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class SynastryQueueService {

    public static final String LOVE_RELATIONSHIP = "LOVE";
    private static final int MAX_PROFILE_WARM_BATCH = 400;
    private static final int MAX_FEED_WARM_BATCH = 200;

    private final StarMateProfileRepository profileRepository;
    private final StarMateScoreCacheRepository scoreCacheRepository;
    private final SynastryService synastryService;

    @Async
    public void warmScoresForProfileUpdate(Long userId) {
        if (userId == null) return;
        try {
            List<StarMateProfile> candidates = profileRepository.findAllByIsActiveTrueAndUserIdNot(userId)
                    .stream()
                    .limit(MAX_PROFILE_WARM_BATCH)
                    .toList();

            for (StarMateProfile candidate : candidates) {
                computeAndStore(userId, candidate.getUserId());
                computeAndStore(candidate.getUserId(), userId);
            }
            log.info("StarMate score warm-up completed for userId={} with {} active candidates", userId, candidates.size());
        } catch (Exception e) {
            log.warn("StarMate profile warm-up failed for userId={}: {}", userId, e.getMessage());
        }
    }

    @Async
    public void warmMissingScoresForViewer(Long viewerUserId, List<Long> candidateUserIds) {
        if (viewerUserId == null || candidateUserIds == null || candidateUserIds.isEmpty()) return;

        candidateUserIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .limit(MAX_FEED_WARM_BATCH)
                .forEach(candidateUserId -> computeAndStore(viewerUserId, candidateUserId));
    }

    @Transactional
    public void computeAndStore(Long viewerUserId, Long candidateUserId) {
        if (viewerUserId == null || candidateUserId == null || Objects.equals(viewerUserId, candidateUserId)) {
            return;
        }

        StarMateScoreCache cache = scoreCacheRepository
                .findByViewerUserIdAndCandidateUserIdAndRelationshipType(viewerUserId, candidateUserId, LOVE_RELATIONSHIP)
                .orElseGet(() -> StarMateScoreCache.builder()
                        .viewerUserId(viewerUserId)
                        .candidateUserId(candidateUserId)
                        .relationshipType(LOVE_RELATIONSHIP)
                        .build());

        cache.setStatus(StarMateScoreCacheStatus.PENDING);
        cache.setErrorMessage(null);
        cache.setUpdatedAt(LocalDateTime.now());
        scoreCacheRepository.save(cache);

        try {
            SynastryService.QuickSynastryScore quickScore =
                    synastryService.computeQuickUserToUserLoveScore(viewerUserId, candidateUserId);

            cache.setCompatibilityScore(quickScore.harmonyScore());
            cache.setCompatibilitySummary(quickScore.summary());
            cache.setStatus(StarMateScoreCacheStatus.COMPLETED);
            cache.setCalculatedAt(LocalDateTime.now());
            cache.setErrorMessage(null);
        } catch (Exception e) {
            cache.setStatus(StarMateScoreCacheStatus.FAILED);
            cache.setErrorMessage(e.getMessage());
            log.debug("StarMate score cache FAILED viewer={} candidate={}: {}",
                    viewerUserId, candidateUserId, e.getMessage());
        }

        scoreCacheRepository.save(cache);
    }
}
